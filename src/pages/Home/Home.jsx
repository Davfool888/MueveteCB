import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ROUTES, REPORT_LOCATIONS, REPORT_TYPE_LABELS } from '../../data/routes';
import { destinationPhrase, formatDeadlineLabel, normalizeText, timeToMinutes } from '../../utils/helpers';
import { buildFallbackAgentResponse } from '../../core/fallbackAgent';
import { resolveRouteIdForReports } from '../../core/recommendationEngine';
import { getLocationByLabel, resolveLocation } from '../../services/geocodingService';
import {
  buildLocationRoute,
  createEmptyLocation,
  getLocationKey,
  hasLocationCoordinates,
} from '../../utils/locationRoute';
import { requestChat } from '../../services/chatApi';
import { getTransportPlan } from '../../services/transportRouting';
import { useToast } from '../../hooks/useToast';
import { useReports } from '../../hooks/useReports';
import Header from '../../components/Header';
import Hero from '../../components/Hero';
import DemoStrip from '../../components/DemoStrip';
import Workspace from '../../components/Workspace';
import ValueSection from '../../components/ValueSection';
import Footer from '../../components/Footer';
import ReportDialog from '../../components/ReportDialog';
import WhatsAppModal from '../../components/WhatsAppModal';
import Toast from '../../components/Toast';

let messageIdCounter = 0;

function makeId() {
  messageIdCounter += 1;
  return messageIdCounter;
}

function initialAgentMessage() {
  return {
    id: makeId(),
    role: 'agent',
    text: 'Hola, soy Eco. Dime de dónde sales, a dónde vas y a qué hora necesitas llegar. También puedes reportar una novedad con el botón superior.',
    routeId: null,
    isTyping: false,
  };
}

function getInitialRouteId() {
  if (typeof window === 'undefined') return 'main';
  const requestedRoute = new URLSearchParams(window.location.search).get('ruta');
  return requestedRoute && ROUTES[requestedRoute] ? requestedRoute : 'main';
}

function hasInitialRouteContext() {
  if (typeof window === 'undefined') return false;
  const requestedRoute = new URLSearchParams(window.location.search).get('ruta');
  return Boolean(requestedRoute && ROUTES[requestedRoute]);
}

function detectReport(text) {
  const normalized = normalizeText(text);
  if (!/\b(reporte|reportar|bloqueo|bloquearon|demora|tranc[oó]n|cambio de ruta)\b/.test(normalized)) {
    return null;
  }

  const type = normalized.includes('demora') || normalized.includes('tranc')
    ? 'demora'
    : normalized.includes('cambio')
      ? 'cambio'
      : 'bloqueo';
  const location = normalized.includes('paraiso') || normalized.includes('rosario')
    ? 'paraiso'
    : normalized.includes('meissen') || normalized.includes('boyaca')
      ? 'meissen'
      : normalized.includes('torres')
        ? 'torres'
        : normalized.includes('tunal')
          ? 'tunal'
          : 'alpes';

  return { type, location };
}

function getGeolocationErrorMessage(code) {
  if (code === 1 || code === 'PERMISSION_DENIED') {
    return 'No pudimos obtener tu ubicación. Verifica que hayas permitido el acceso a la ubicación.';
  }

  if (code === 2 || code === 'POSITION_UNAVAILABLE') {
    return 'No fue posible determinar tu ubicación. Intenta nuevamente.';
  }

  if (code === 3 || code === 'TIMEOUT') {
    return 'La solicitud de ubicación tardó demasiado. Intenta nuevamente.';
  }

  return 'No pudimos obtener tu ubicación. Intenta nuevamente.';
}

export default function Home() {
  const [activeRouteId, setActiveRouteIdState] = useState(getInitialRouteId);
  const [priorityMode, setPriorityMode] = useState('fastest');
  const [selectedTransportMode, setSelectedTransportMode] = useState('auto');
  const [messages, setMessages] = useState(() => [initialAgentMessage()]);
  const [layers, setLayers] = useState({
    boundary: true,
    route: false,
    cable: false,
    sitp: false,
    informal: false,
    veredal: false,
    reports: true,
  });
  const [mapConnected, setMapConnected] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originLocation, setOriginLocation] = useState(() => createEmptyLocation());
  const [destinationLocation, setDestinationLocation] = useState(() => createEmptyLocation());
  const [originStatus, setOriginStatus] = useState('');
  const [originError, setOriginError] = useState('');
  const [plannerError, setPlannerError] = useState('');
  const [isLocatingOrigin, setIsLocatingOrigin] = useState(false);
  const [isResolvingPlanner, setIsResolvingPlanner] = useState(false);
  const [hasRouteContext, setHasRouteContext] = useState(hasInitialRouteContext);
  const [deadline, setDeadline] = useState('07:00');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const { toast, showToast } = useToast();
  const { reports, addReport: addReportToState, clearReports, pruneExpiredReports } = useReports();
  const chatAbortRef = useRef(null);
  const gpsWatchIdRef = useRef(null);
  const autoRouteTimerRef = useRef(null);
  const lastAutoRouteKeyRef = useRef('');
  const skipAutoRouteKeyRef = useRef('');

  const baseRoute = ROUTES[activeRouteId] || ROUTES.main;
  const hasPlannerLocations =
    hasLocationCoordinates(originLocation) && hasLocationCoordinates(destinationLocation);
  const activeRoute = useMemo(
    () =>
      hasPlannerLocations || hasRouteContext
        ? buildLocationRoute({
            baseRoute,
            originLocation,
            destinationLocation,
            originText: origin,
            destinationText: destination,
          })
        : null,
    [
      baseRoute,
      destination,
      destinationLocation,
      hasPlannerLocations,
      hasRouteContext,
      origin,
      originLocation,
    ],
  );
  const margin = activeRoute ? timeToMinutes(deadline) - (activeRoute.arrivalMinutes || 389) : null;
  const transportPlan = useMemo(
    () =>
      getTransportPlan({
        originLocation,
        destinationLocation,
        activeRoute,
        selectedMode: selectedTransportMode,
      }),
    [activeRoute, destinationLocation, originLocation, selectedTransportMode],
  );

  const addMessage = useCallback((role, text, routeId = null) => {
    setMessages((previous) => [
      ...previous,
      { id: makeId(), role, text, routeId, isTyping: false },
    ]);
  }, []);

  const addRouteMessage = useCallback(
    (text, routeId) => addMessage('agent', text, routeId),
    [addMessage]
  );

  const showTypingIndicator = useCallback(() => setIsTyping(true), []);
  const removeTypingIndicator = useCallback(() => setIsTyping(false), []);

  const setActiveRoute = useCallback((routeId) => {
    const selectedRouteId = ROUTES[routeId] ? routeId : 'main';
    setActiveRouteIdState(selectedRouteId);
    setHasRouteContext(true);
    return selectedRouteId;
  }, []);

  function updateOriginText(value) {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    removeTypingIndicator();
    clearGpsWatch();
    setIsLocatingOrigin(false);
    setOrigin(value);
    setOriginLocation(createEmptyLocation(value));
    setHasRouteContext(false);
    lastAutoRouteKeyRef.current = '';
    skipAutoRouteKeyRef.current = '';
    setSelectedTransportMode('auto');
    setOriginStatus('');
    setOriginError('');
    setPlannerError('');
  }

  function updateDestinationText(value) {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    removeTypingIndicator();
    setDestination(value);
    setDestinationLocation(createEmptyLocation(value));
    setHasRouteContext(false);
    lastAutoRouteKeyRef.current = '';
    skipAutoRouteKeyRef.current = '';
    setSelectedTransportMode('auto');
    setPlannerError('');
  }

  function selectOriginLocation(location) {
    setOrigin(location.label);
    setOriginLocation(location);
    setHasRouteContext(false);
    lastAutoRouteKeyRef.current = '';
    skipAutoRouteKeyRef.current = '';
    setSelectedTransportMode('auto');
    setOriginStatus(location.source === 'gps' ? '📍 Ubicación actual' : '');
    setOriginError('');
    setPlannerError('');
  }

  function selectDestinationLocation(location) {
    setDestination(location.label);
    setDestinationLocation(location);
    setHasRouteContext(false);
    lastAutoRouteKeyRef.current = '';
    skipAutoRouteKeyRef.current = '';
    setSelectedTransportMode('auto');
    setPlannerError('');
  }

  function clearGpsWatch() {
    if (
      gpsWatchIdRef.current !== null &&
      typeof navigator !== 'undefined' &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
  }

  function handleUseCurrentLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setOriginError('La ubicación no está disponible en este navegador.');
      return;
    }

    clearGpsWatch();
    setIsLocatingOrigin(true);
    setOriginStatus('Obteniendo tu ubicación...');
    setOriginError('');
    setPlannerError('');

    try {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          clearGpsWatch();
          const location = {
            label: 'Ubicación actual',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: 'gps',
          };

          setOrigin(location.label);
          setOriginLocation(location);
          setHasRouteContext(false);
          lastAutoRouteKeyRef.current = '';
          skipAutoRouteKeyRef.current = '';
          setSelectedTransportMode('auto');
          setOriginStatus('📍 Ubicación actual');
          setOriginError('');
          setIsLocatingOrigin(false);
        },
        (error) => {
          clearGpsWatch();
          setIsLocatingOrigin(false);
          setOriginStatus('');
          setOriginError(getGeolocationErrorMessage(error?.code));
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 12000,
        },
      );

      gpsWatchIdRef.current = watchId;
    } catch {
      clearGpsWatch();
      setIsLocatingOrigin(false);
      setOriginStatus('');
      setOriginError('No pudimos obtener tu ubicación. Intenta nuevamente.');
    }
  }

  const handleAddReport = useCallback(
    ({ type, location, note, source }) => {
      const createdAtMs = Date.now();
      const normalizedLocation = REPORT_LOCATIONS[location] ? location : 'alpes';
      const normalizedType = REPORT_TYPE_LABELS[type] ? type : 'bloqueo';
      const report = {
        id: `report-${createdAtMs}-${Math.random().toString(16).slice(2)}`,
        type: normalizedType,
        location: normalizedLocation,
        locationId: normalizedLocation,
        note: String(note || '').trim().slice(0, 140),
        status: 'reported',
        createdAt: new Date(createdAtMs).toISOString(),
        expiresAt: new Date(createdAtMs + 3 * 60 * 60 * 1000).toISOString(),
      };

      addReportToState(report);
      const nextReports = [report, ...reports];
      const nextRouteId = resolveRouteIdForReports({
        preferredRouteId: activeRouteId,
        reports: nextReports,
      });
      setActiveRouteIdState(nextRouteId);
      setHasRouteContext(true);

      const locationName = REPORT_LOCATIONS[report.location].name;
      const typeLabel = REPORT_TYPE_LABELS[report.type];
      const routeChanged = nextRouteId !== activeRouteId;

      if (routeChanged) {
        addRouteMessage(
          `Recibí el reporte de ${typeLabel.toLowerCase()} en ${locationName}. Ajusté la recomendación: la alternativa evita el tramo afectado y suma 10 minutos de recorrido.`,
          nextRouteId
        );
      } else if (report.type === 'bloqueo' && report.location === 'tunal') {
        addMessage(
          'agent',
          `Registré el bloqueo en ${locationName}. No encontré una alternativa verificable que evite el Portal Tunal; confirma el estado antes de salir.`
        );
      } else {
        addMessage(
          'agent',
          `Gracias. Registré una ${typeLabel.toLowerCase()} en ${locationName}. Queda como advertencia mientras se confirma; la ruta no cambia automáticamente.`
        );
      }

      showToast(
        source === 'form'
          ? 'Reporte guardado. La recomendación fue evaluada.'
          : 'Reporte recibido y recomendación evaluada'
      );
    },
    [activeRouteId, addMessage, addReportToState, addRouteMessage, reports, showToast]
  );

  const requestEcoResponse = useCallback(
    async ({ message, origin: nextOrigin, destination: nextDestination, deadline: nextDeadline, priority }) => {
      chatAbortRef.current?.abort();
      const controller = new AbortController();
      chatAbortRef.current = controller;
      showTypingIndicator();

      const requestInput = {
        message,
        origin: nextOrigin,
        destination: nextDestination,
        deadline: nextDeadline,
        priority,
        activeReports: reports,
      };

      let result;
      try {
        result = await requestChat(requestInput, { signal: controller.signal });
      } catch {
        result = buildFallbackAgentResponse(requestInput);
      }

      if (controller.signal.aborted) return;
      removeTypingIndicator();

      const returnedRouteId = result.route?.id;
      if (returnedRouteId && ROUTES[returnedRouteId]) {
        const displayRouteId = setActiveRoute(returnedRouteId);
        addRouteMessage(result.answerText, displayRouteId);
        showToast(
          result.meta?.source === 'claude'
            ? 'Eco respondió con IA'
            : 'Eco usó la respuesta local de respaldo'
        );
      } else {
        addMessage('agent', result.answerText);
      }

      if (chatAbortRef.current === controller) chatAbortRef.current = null;
      return result;
    },
    [activeRouteId, addMessage, addRouteMessage, removeTypingIndicator, reports, setActiveRoute, showToast, showTypingIndicator]
  );

  const processQuery = useCallback(
    (nextOrigin, nextDestination, nextDeadline, source, nextPriority = priorityMode) => {
      const message = `Estoy en ${nextOrigin} y necesito llegar ${destinationPhrase(nextDestination)} antes de las ${formatDeadlineLabel(nextDeadline)}`;
      if (source === 'form' || source === 'demo') addMessage('user', message);
      requestEcoResponse({
        message,
        origin: nextOrigin,
        destination: nextDestination,
        deadline: nextDeadline,
        priority: nextPriority,
      });
    },
    [addMessage, priorityMode, requestEcoResponse]
  );

  async function handlePlannerSubmit(
    nextOrigin,
    nextDestination,
    nextDeadline,
    nextPriority = priorityMode,
  ) {
    if (isResolvingPlanner) return;

    setPlannerError('');
    setIsResolvingPlanner(true);

    try {
      const resolvedOrigin = hasLocationCoordinates(originLocation)
        ? originLocation
        : await resolveLocation(nextOrigin);
      const resolvedDestination = hasLocationCoordinates(destinationLocation)
        ? destinationLocation
        : await resolveLocation(nextDestination);

      if (!resolvedOrigin || !resolvedDestination) {
        setPlannerError('Selecciona una sugerencia válida para el origen y el destino.');
        return;
      }

      setOrigin(resolvedOrigin.label);
      setOriginLocation(resolvedOrigin);
      setDestination(resolvedDestination.label);
      setDestinationLocation(resolvedDestination);
      setOriginStatus(resolvedOrigin.source === 'gps' ? '📍 Ubicación actual' : '');
      setOriginError('');

      const routeKey = getLocationKey(
        resolvedOrigin,
        resolvedDestination,
        nextPriority,
        nextDeadline,
      );
      skipAutoRouteKeyRef.current = routeKey;
      processQuery(
        resolvedOrigin.label,
        resolvedDestination.label,
        nextDeadline,
        'form',
        nextPriority,
      );
    } catch (error) {
      console.error('No se pudieron resolver las ubicaciones:', error);
      setPlannerError('No pudimos resolver las ubicaciones. Intenta nuevamente.');
    } finally {
      setIsResolvingPlanner(false);
    }
  }

  const processTextMessage = useCallback(
    (text) => {
      addMessage('user', text);
      const detectedReport = detectReport(text);
      if (detectedReport) {
        handleAddReport({
          ...detectedReport,
          note: text.replace(/^\s*reporte\s+/i, '').slice(0, 140),
          source: 'chat',
        });
        return;
      }

      requestEcoResponse({
        message: text,
        origin,
        destination,
        deadline,
        priority: priorityMode,
      });
    },
    [addMessage, deadline, destination, handleAddReport, origin, priorityMode, requestEcoResponse]
  );

  useEffect(() => {
    const hasOrigin = hasLocationCoordinates(originLocation);
    const hasDestination = hasLocationCoordinates(destinationLocation);

    if (!hasOrigin || !hasDestination) return undefined;

    const routeKey = getLocationKey(
      originLocation,
      destinationLocation,
      priorityMode,
      deadline,
    );

    if (skipAutoRouteKeyRef.current === routeKey) {
      skipAutoRouteKeyRef.current = '';
      return undefined;
    }

    if (lastAutoRouteKeyRef.current === routeKey) return undefined;

    window.clearTimeout(autoRouteTimerRef.current);
    autoRouteTimerRef.current = window.setTimeout(() => {
      lastAutoRouteKeyRef.current = routeKey;
      requestEcoResponse({
        message: `Estoy en ${originLocation.label} y necesito llegar ${destinationLocation.label} antes de las ${formatDeadlineLabel(deadline)}`,
        origin: originLocation.label,
        destination: destinationLocation.label,
        deadline,
        priority: priorityMode,
      });
    }, 450);

    return () => window.clearTimeout(autoRouteTimerRef.current);
  }, [deadline, destinationLocation, originLocation, priorityMode, requestEcoResponse]);

  const handleSelectRoute = useCallback(
    (routeId) => {
      const selectedRouteId = setActiveRoute(routeId);
      const route = ROUTES[selectedRouteId];
      if (route) {
        if (route.segments?.some((segment) => segment.type === 'sitp')) {
          setSelectedTransportMode('sitp');
        } else if (route.segments?.some((segment) => segment.type === 'informal')) {
          setSelectedTransportMode('veredal');
        } else {
          setSelectedTransportMode('auto');
        }
        showToast(`Ruta activa: ${route.title}`);
      }
    },
    [setActiveRoute, showToast]
  );

  const handleSelectTransportMode = useCallback(
    (mode) => {
      if (!['sitp', 'veredal'].includes(mode)) return;

      if (!transportPlan.availableModes.includes(mode)) {
        showToast(
          mode === 'veredal'
            ? 'No hay una van veredal disponible cerca del origen'
            : 'No hay una cobertura SITP confirmada cerca del origen',
        );
        return;
      }

      setSelectedTransportMode(mode);
    },
    [showToast, transportPlan.availableModes],
  );

  const resetDemo = useCallback(() => {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    clearGpsWatch();
    clearReports();
    setActiveRouteIdState('main');
    setPriorityMode('fastest');

    const demoOrigin = getLocationByLabel('Mochuelo Alto') || createEmptyLocation('Mochuelo Alto');
    const demoDestination = getLocationByLabel('Portal Tunal') || createEmptyLocation('Portal Tunal');
    setOrigin(demoOrigin.label);
    setOriginLocation(demoOrigin);
    setDestination(demoDestination.label);
    setDestinationLocation(demoDestination);
    setOriginStatus('');
    setOriginError('');
    setPlannerError('');
    setIsLocatingOrigin(false);
    setDeadline('07:00');
    setMessages([initialAgentMessage()]);
    setIsTyping(false);
    setSelectedTransportMode('auto');
    skipAutoRouteKeyRef.current = getLocationKey(
      demoOrigin,
      demoDestination,
      'fastest',
      '07:00',
    );
    showToast('Demostración reiniciada para el jurado');
  }, [clearReports, showToast]);

  const shareCurrentRoute = useCallback(() => {
    if (!activeRoute) {
      showToast('Selecciona un origen y un destino para compartir una ruta');
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('ruta', activeRouteId);
    window.history.replaceState({}, '', url);
    const route = ROUTES[activeRouteId] || ROUTES.main;
    const shareText = `Mi ruta en ECO CB: ${route.title}. Tiempo estimado: ${route.duration}. ${url.toString()}`;
    if (navigator.share) {
      navigator.share({ title: 'ECO CB', text: shareText, url: url.toString() }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => showToast('Enlace de la ruta copiado'));
    } else {
      showToast('Ruta lista para compartir');
    }
  }, [activeRoute, activeRouteId, showToast]);

  const runDemo = useCallback(() => {
    const demoOrigin = getLocationByLabel('Mochuelo Alto') || createEmptyLocation('Mochuelo Alto');
    const demoDestination = getLocationByLabel('Portal Tunal') || createEmptyLocation('Portal Tunal');

    setPriorityMode('fastest');
    setOrigin(demoOrigin.label);
    setOriginLocation(demoOrigin);
    setDestination(demoDestination.label);
    setDestinationLocation(demoDestination);
    setOriginStatus('');
    setOriginError('');
    setPlannerError('');
    setIsLocatingOrigin(false);
    clearGpsWatch();
    setSelectedTransportMode('auto');
    setDeadline('07:00');
    skipAutoRouteKeyRef.current = getLocationKey(
      demoOrigin,
      demoDestination,
      'fastest',
      '07:00',
    );
    document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    processQuery(demoOrigin.label, demoDestination.label, '07:00', 'demo', 'fastest');
  }, [processQuery]);

  const toggleLayer = useCallback((layerName) => {
    setLayers((previous) => ({ ...previous, [layerName]: !previous[layerName] }));
  }, []);

  useEffect(
    () => () => {
      chatAbortRef.current?.abort();
      window.clearTimeout(autoRouteTimerRef.current);
      clearGpsWatch();
    },
    [],
  );

  useEffect(() => {
    const futureExpiries = reports
      .map((report) => Date.parse(report.expiresAt || ''))
      .filter((timestamp) => Number.isFinite(timestamp) && timestamp > Date.now());
    if (futureExpiries.length === 0) return undefined;

    const delay = Math.min(...futureExpiries) - Date.now() + 1000;
    const timer = window.setTimeout(() => {
      pruneExpiredReports();
      setActiveRouteIdState(
        resolveRouteIdForReports({ preferredRouteId: activeRouteId, reports })
      );
      showToast('Un reporte expiró y la recomendación fue actualizada');
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activeRouteId, pruneExpiredReports, reports, showToast]);

  return (
    <div className="page-shell">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>

      <Header
        onOpenReport={() => setIsReportDialogOpen(true)}
        onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
        showRegisterLink={true}
      />

      <main id="contenido">
        <Hero
          origin={origin}
          destination={destination}
          deadline={deadline}
          priorityMode={priorityMode}
          onOriginChange={updateOriginText}
          onDestinationChange={updateDestinationText}
          onOriginLocationSelect={selectOriginLocation}
          onDestinationLocationSelect={selectDestinationLocation}
          onUseCurrentLocation={handleUseCurrentLocation}
          isLocatingOrigin={isLocatingOrigin}
          originStatus={originStatus}
          originError={originError}
          plannerError={plannerError}
          isCalculating={isResolvingPlanner}
          onDeadlineChange={setDeadline}
          onPriorityModeChange={setPriorityMode}
          onSubmit={handlePlannerSubmit}
        />

        <DemoStrip onRunDemo={runDemo} />

        <Workspace
          messages={messages}
          isTyping={isTyping}
          activeRouteId={activeRoute ? activeRouteId : null}
          activeRoute={activeRoute}
          transportPlan={transportPlan}
          originLocation={originLocation}
          destinationLocation={destinationLocation}
          reports={reports}
          layers={layers}
          mapConnected={mapConnected}
          deadline={deadline}
          margin={margin}
          onSendMessage={processTextMessage}
          onResetDemo={resetDemo}
          onShareRoute={shareCurrentRoute}
          onToggleLayer={toggleLayer}
          onSelectRoute={handleSelectRoute}
          onSelectTransportMode={handleSelectTransportMode}
          onMapConnectionChange={setMapConnected}
          onScrollToMap={() =>
            document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          showToast={showToast}
        />

        <ValueSection />
      </main>

      <Footer />

      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        onSubmit={handleAddReport}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        activeRoute={activeRoute}
        origin={origin}
        destination={destination}
        deadline={deadline}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
