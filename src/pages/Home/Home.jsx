import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ROUTES, REPORT_LOCATIONS, REPORT_TYPE_LABELS } from '../../data/routes';
import { destinationPhrase, formatDeadlineLabel, normalizeText, timeToMinutes } from '../../utils/helpers';
import { buildFallbackAgentResponse } from '../../core/fallbackAgent';
import { resolveRouteIdForReports } from '../../core/recommendationEngine';
import { requestChat } from '../../services/chatApi';
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

export default function Home() {
  const [activeRouteId, setActiveRouteIdState] = useState(getInitialRouteId);
  const [priorityMode, setPriorityMode] = useState('fastest');
  const [messages, setMessages] = useState(() => [initialAgentMessage()]);
  const [layers, setLayers] = useState({
    boundary: true,
    route: true,
    cable: true,
    sitp: true,
    informal: true,
    reports: true,
  });
  const [mapConnected, setMapConnected] = useState(false);
  const [origin, setOrigin] = useState('Mochuelo Alto');
  const [destination, setDestination] = useState('Portal Tunal');
  const [deadline, setDeadline] = useState('07:00');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const { toast, showToast } = useToast();
  const { reports, addReport: addReportToState, clearReports, pruneExpiredReports } = useReports();
  const chatAbortRef = useRef(null);

  const activeRoute = ROUTES[activeRouteId] || ROUTES.main;
  const margin = timeToMinutes(deadline) - (activeRoute?.arrivalMinutes || 389);

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
    return selectedRouteId;
  }, []);

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

  const handleSelectRoute = useCallback(
    (routeId) => {
      const selectedRouteId = setActiveRoute(routeId);
      const route = ROUTES[selectedRouteId];
      if (route) showToast(`Ruta activa: ${route.title}`);
    },
    [setActiveRoute, showToast]
  );

  const resetDemo = useCallback(() => {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    clearReports();
    setActiveRouteIdState('main');
    setPriorityMode('fastest');
    setOrigin('Mochuelo Alto');
    setDestination('Portal Tunal');
    setDeadline('07:00');
    setMessages([initialAgentMessage()]);
    setIsTyping(false);
    showToast('Demostración reiniciada para el jurado');
  }, [clearReports, showToast]);

  const shareCurrentRoute = useCallback(() => {
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
  }, [activeRouteId, showToast]);

  const runDemo = useCallback(() => {
    setPriorityMode('fastest');
    setOrigin('Mochuelo Alto');
    setDestination('Portal Tunal');
    setDeadline('07:00');
    document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    processQuery('Mochuelo Alto', 'Portal Tunal', '07:00', 'demo', 'fastest');
  }, [processQuery]);

  const toggleLayer = useCallback((layerName) => {
    setLayers((previous) => ({ ...previous, [layerName]: !previous[layerName] }));
  }, []);

  useEffect(() => () => chatAbortRef.current?.abort(), []);

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
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onDeadlineChange={setDeadline}
          onPriorityModeChange={setPriorityMode}
          onSubmit={(nextOrigin, nextDestination, nextDeadline, nextPriority) =>
            processQuery(nextOrigin, nextDestination, nextDeadline, 'form', nextPriority)
          }
        />

        <DemoStrip onRunDemo={runDemo} />

        <Workspace
          messages={messages}
          isTyping={isTyping}
          activeRouteId={activeRouteId}
          activeRoute={activeRoute}
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
