import React, { useState, useCallback, useRef } from 'react';
import { ROUTES, REPORT_LOCATIONS, REPORT_TYPE_LABELS } from './data/routes';
import { normalizeText, destinationPhrase, formatDeadlineLabel, timeToMinutes } from './utils/helpers';
import { useToast } from './hooks/useToast';
import { useReports } from './hooks/useReports';
import Header from './components/Header';
import Hero from './components/Hero';
import DemoStrip from './components/DemoStrip';
import Workspace from './components/Workspace';
import ValueSection from './components/ValueSection';
import Footer from './components/Footer';
import ReportDialog from './components/ReportDialog';
import Toast from './components/Toast';

let messageIdCounter = 0;
function makeId() { return ++messageIdCounter; }

export default function App() {
  // ── Global UI state ────────────────────────────────────────────────────────
  const [activeRouteId, setActiveRouteIdState] = useState('main');
  const [messages, setMessages] = useState([
    {
      id: makeId(),
      role: 'agent',
      text: 'Hola, soy Ángel. Dime de dónde sales, a dónde vas y a qué hora necesitas llegar. También puedes reportar una novedad con el botón superior.',
      routeId: null,
      isTyping: false,
    },
  ]);
  const [layers, setLayers] = useState({
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
  const [isTyping, setIsTyping] = useState(false);

  const { toast, showToast } = useToast();
  const { reports, addReport: addReportToState, clearReports } = useReports();

  const typingTimerRef = useRef(null);

  // ── Derived: compute margin for current route ──────────────────────────────
  const activeRoute = ROUTES[activeRouteId] || ROUTES.main;
  const margin = timeToMinutes(deadline) - activeRoute.arrivalMinutes;

  // ── Has blocking report? ───────────────────────────────────────────────────
  const hasBlockingReport = useCallback((rpts) => {
    return rpts.some((r) => r.type === 'bloqueo' || r.type === 'cambio');
  }, []);

  // ── Set active route (respects blocking reports) ──────────────────────────
  const setActiveRoute = useCallback(
    (routeId, currentReports = reports) => {
      const adjusted =
        routeId === 'alternate' || (routeId === 'main' && hasBlockingReport(currentReports))
          ? 'alternate'
          : routeId;
      setActiveRouteIdState(adjusted);
      return adjusted;
    },
    [reports, hasBlockingReport]
  );

  // ── Message helpers ────────────────────────────────────────────────────────
  const addMessage = useCallback((role, text, routeId = null) => {
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role, text, routeId, isTyping: false },
    ]);
  }, []);

  const addRouteMessage = useCallback(
    (text, routeId) => addMessage('agent', text, routeId),
    [addMessage]
  );

  const showTypingIndicator = useCallback(() => {
    setIsTyping(true);
  }, []);

  const removeTypingIndicator = useCallback(() => {
    setIsTyping(false);
  }, []);

  // ── processQuery (from planner form / demo button) ─────────────────────────
  const processQuery = useCallback(
    (org, dest, dl, source) => {
      clearTimeout(typingTimerRef.current);
      removeTypingIndicator();

      const normalizedOrigin = normalizeText(org);

      if (source === 'form' || source === 'demo') {
        const text = `Estoy en ${org} y necesito llegar ${destinationPhrase(dest)} antes de las ${formatDeadlineLabel(dl)}`;
        addMessage('user', text);
      }

      showTypingIndicator();

      const preferredRouteId = normalizedOrigin.includes('quiba') ? 'quiba' : 'main';
      const routeId =
        preferredRouteId === 'main' && hasBlockingReport(reports) ? 'alternate' : preferredRouteId;
      const route = ROUTES[routeId];

      typingTimerRef.current = window.setTimeout(() => {
        removeTypingIndicator();
        setActiveRoute(routeId);

        const goalMessage =
          routeId === 'alternate'
            ? `Hay un bloqueo activo, así que ajusté la ruta para llegar antes de las ${formatDeadlineLabel(dl)}`
            : normalizeText(dest).includes('tunal')
            ? `Encontré una opción para llegar antes de las ${formatDeadlineLabel(dl)}`
            : `Para esta demostración tengo un trayecto preparado ${destinationPhrase(dest)}.`;

        addRouteMessage(
          `${goalMessage}\n${route.segments.map((s, i) => `${i + 1}. ${s.title} (${s.time}).`).join('\n')}\nTiempo total estimado: ${route.duration}. ${route.reason}`,
          routeId
        );
        showToast(`Ruta lista: ${route.title}`);
      }, 720);
    },
    [reports, addMessage, addRouteMessage, showTypingIndicator, removeTypingIndicator, setActiveRoute, showToast, hasBlockingReport]
  );

  // ── processTextMessage (from chat form / quick prompts) ────────────────────
  const processTextMessage = useCallback(
    (text) => {
      clearTimeout(typingTimerRef.current);
      removeTypingIndicator();
      addMessage('user', text);
      showTypingIndicator();

      const normalized = normalizeText(text);
      const isReport = /\b(reporte|reportar|bloqueo|demora|cambio de ruta)\b/.test(normalized);

      if (isReport) {
        const type = normalized.includes('demora')
          ? 'demora'
          : normalized.includes('cambio')
          ? 'cambio'
          : 'bloqueo';
        const location = normalized.includes('rosario')
          ? 'rosario'
          : normalized.includes('tunal')
          ? 'tunal'
          : 'alpes';
        const cleanNote = text.replace(/^\s*reporte\s+/i, '').slice(0, 140);

        typingTimerRef.current = window.setTimeout(() => {
          removeTypingIndicator();
          handleAddReport({ type, location, note: cleanNote, source: 'chat' });
          showToast('Reporte recibido y ruta recalculada');
        }, 760);
        return;
      }

      const preferredRouteId =
        normalized.includes('quiba') && !normalized.includes('mochuelo') ? 'quiba' : 'main';
      const routeId =
        preferredRouteId === 'main' && hasBlockingReport(reports) ? 'alternate' : preferredRouteId;

      typingTimerRef.current = window.setTimeout(() => {
        removeTypingIndicator();
        setActiveRoute(routeId);
        const route = ROUTES[routeId];

        if (normalized.includes('hola') || normalized.includes('gracias')) {
          addMessage('agent', 'Con gusto. Estoy listo para comparar rutas o registrar una novedad.');
          return;
        }

        addRouteMessage(
          `Te recomiendo ${route.title}.\n${route.segments.map((s, i) => `${i + 1}. ${s.title}: ${s.time}.`).join('\n')}\nLlegada estimada ${route.arrivalClock}. ${route.reason}`,
          routeId
        );
      }, 720);
    },
    [reports, addMessage, addRouteMessage, showTypingIndicator, removeTypingIndicator, setActiveRoute, showToast, hasBlockingReport]
  );

  // ── addReport ─────────────────────────────────────────────────────────────
  const handleAddReport = useCallback(
    ({ type, location, note, source }) => {
      const report = {
        id: `report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: type || 'bloqueo',
        location: location || 'alpes',
        note: String(note || '').trim().slice(0, 140),
        createdAt: new Date().toISOString(),
      };

      addReportToState(report);

      const newReports = [report, ...reports];
      const shouldReroute = report.type === 'bloqueo' || report.type === 'cambio';
      const nextRouteId = shouldReroute ? 'alternate' : activeRouteId;
      setActiveRoute(nextRouteId, newReports);

      const locationName = (REPORT_LOCATIONS[report.location] || REPORT_LOCATIONS.alpes).name;
      const typeLabel = REPORT_TYPE_LABELS[report.type] || 'Novedad';

      if (shouldReroute) {
        addRouteMessage(
          `Recibí el reporte de ${typeLabel.toLowerCase()} en ${locationName}.\nActualicé la recomendación: ahora te sugiero la alternativa por Las Torres. Llega aproximadamente 13 minutos más tarde, pero evita el tramo afectado.`,
          'alternate'
        );
      } else {
        addMessage(
          'agent',
          `Gracias. Registré una ${typeLabel.toLowerCase()} en ${locationName}. La muestra en el mapa con la hora del reporte; ten en cuenta que aún debe confirmarse con la comunidad.`
        );
      }

      if (source === 'form') showToast('Reporte guardado. La ruta fue recalculada.');
    },
    [reports, activeRouteId, addReportToState, addMessage, addRouteMessage, setActiveRoute, showToast]
  );

  // ── resetDemo ─────────────────────────────────────────────────────────────
  const resetDemo = useCallback(() => {
    clearTimeout(typingTimerRef.current);
    clearReports();
    setActiveRouteIdState('main');
    setOrigin('Mochuelo Alto');
    setDestination('Portal Tunal');
    setDeadline('07:00');
    setMessages([
      {
        id: makeId(),
        role: 'agent',
        text: 'Hola, soy Ángel. La demostración se reinició. Dime de dónde sales, a dónde vas y a qué hora necesitas llegar.',
        routeId: null,
        isTyping: false,
      },
    ]);
    setIsTyping(false);
    showToast('Demostración reiniciada');
  }, [clearReports, showToast]);

  // ── shareCurrentRoute ─────────────────────────────────────────────────────
  const shareCurrentRoute = useCallback(() => {
    const route = ROUTES[activeRouteId] || ROUTES.main;
    const shareText = `Mi ruta en Muevete CB: ${route.title}. Tiempo estimado: ${route.duration}. ${window.location.href}`;
    if (navigator.share) {
      navigator.share({ title: 'Muevete CB', text: shareText, url: window.location.href }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => showToast('Enlace de la demo copiado'));
    } else {
      showToast('La ruta está lista en la barra del navegador');
    }
  }, [activeRouteId, showToast]);

  // ── runDemo ───────────────────────────────────────────────────────────────
  const runDemo = useCallback(() => {
    setOrigin('Mochuelo Alto');
    setDestination('Portal Tunal');
    setDeadline('07:00');
    document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    processQuery('Mochuelo Alto', 'Portal Tunal', '07:00', 'demo');
  }, [processQuery]);

  // ── toggleLayer ───────────────────────────────────────────────────────────
  const toggleLayer = useCallback((layerName) => {
    setLayers((prev) => ({ ...prev, [layerName]: !prev[layerName] }));
  }, []);

  return (
    <div className="page-shell">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>

      <Header onOpenReport={() => setIsReportDialogOpen(true)} />

      <main id="contenido">
        <Hero
          origin={origin}
          destination={destination}
          deadline={deadline}
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onDeadlineChange={setDeadline}
          onSubmit={(org, dest, dl) => processQuery(org, dest, dl, 'form')}
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

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
