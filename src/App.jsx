import React, { useState, useCallback, useRef } from 'react';
import { ROUTES, REPORT_LOCATIONS, REPORT_TYPE_LABELS } from './data/routes';
import { normalizeText, destinationPhrase, formatDeadlineLabel, timeToMinutes } from './utils/helpers';
import { useToast } from './hooks/useToast';
import { useReports } from './hooks/useReports';
import { queryMobilityAgent } from './services/aiAgent';
import Header from './components/Header';
import Hero from './components/Hero';
import DemoStrip from './components/DemoStrip';
import Workspace from './components/Workspace';
import ValueSection from './components/ValueSection';
import Footer from './components/Footer';
import ReportDialog from './components/ReportDialog';
import WhatsAppModal from './components/WhatsAppModal';
import Toast from './components/Toast';

let messageIdCounter = 0;
function makeId() { return ++messageIdCounter; }

export default function App() {
  // ── Global UI state ────────────────────────────────────────────────────────
  const [activeRouteId, setActiveRouteIdState] = useState('main');
  const [priorityMode, setPriorityMode] = useState('fastest');
  const [messages, setMessages] = useState([
    {
      id: makeId(),
      role: 'agent',
      text: 'Hola, soy Ángel, tu Asistente de Movilidad de Ciudad Bolívar. Dime de dónde sales, a dónde vas y cuál es tu prioridad (rapidez, economía o accesibilidad). También puedes reportar bloqueos o consultar por WhatsApp.',
      routeId: null,
      isTyping: false,
    },
  ]);
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
  const { reports, addReport: addReportToState, clearReports } = useReports();

  const typingTimerRef = useRef(null);

  // ── Derived: compute margin for current route ──────────────────────────────
  const activeRoute = ROUTES[activeRouteId] || ROUTES.main;
  const margin = timeToMinutes(deadline) - (activeRoute?.arrivalMinutes || 389);

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
    (org, dest, dl, source, pMode = priorityMode) => {
      clearTimeout(typingTimerRef.current);
      removeTypingIndicator();

      const normalizedOrigin = normalizeText(org);

      if (source === 'form' || source === 'demo') {
        const text = `Estoy en ${org} y necesito llegar ${destinationPhrase(dest)} antes de las ${formatDeadlineLabel(dl)}`;
        addMessage('user', text);
      }

      showTypingIndicator();

      let targetId = 'main';
      if (pMode === 'cheapest') {
        targetId = 'economic';
      } else if (pMode === 'accessible') {
        targetId = 'accessible';
      } else {
        const preferredRouteId = normalizedOrigin.includes('quiba') ? 'quiba' : 'main';
        targetId =
          preferredRouteId === 'main' && hasBlockingReport(reports) ? 'alternate' : preferredRouteId;
      }

      const route = ROUTES[targetId] || ROUTES.main;

      typingTimerRef.current = window.setTimeout(() => {
        removeTypingIndicator();
        setActiveRoute(targetId);

        const goalMessage =
          targetId === 'alternate'
            ? `⚠️ Hay un bloqueo activo en la vía, así que ajusté tu ruta por Las Torres para llegar antes de las ${formatDeadlineLabel(dl)}.`
            : targetId === 'economic'
            ? `💰 Te calculé la opción más económica ($2.950 COP tarifa única SITP) para llegar antes de las ${formatDeadlineLabel(dl)}.`
            : targetId === 'accessible'
            ? `♿ Ruta 100% Accesible PMR recomendada con TransMiCable continuo sin barreras arquitectónicas.`
            : `⚡ Encontré la opción más rápida combinando campero y TransMiCable para llegar antes de las ${formatDeadlineLabel(dl)}.`;

        const stepsText = route.segments
          .map((s, i) => `${i + 1}. ${s.title} (${s.time} - ${s.cost || ''})`)
          .join('\n');

        addRouteMessage(
          `${goalMessage}\n${stepsText}\n⏱️ Duración: ${route.duration} | 💰 Costo total: ${route.costFormatted} (${route.paymentMethod}).\n${route.reason}`,
          targetId
        );
        showToast(`Ruta lista: ${route.title} (${route.costFormatted})`);
      }, 650);
    },
    [reports, priorityMode, addMessage, addRouteMessage, showTypingIndicator, removeTypingIndicator, setActiveRoute, showToast, hasBlockingReport]
  );

  // ── processTextMessage (from chat form / quick prompts / voice) ───────────
  const processTextMessage = useCallback(
    async (text) => {
      clearTimeout(typingTimerRef.current);
      removeTypingIndicator();
      addMessage('user', text);
      showTypingIndicator();

      try {
        const agentResponse = await queryMobilityAgent({
          query: text,
          activeReports: reports,
          currentRouteId: activeRouteId,
          origin,
          destination,
          deadline,
        });

        typingTimerRef.current = window.setTimeout(() => {
          removeTypingIndicator();

          // If a new report was detected by the agent
          if (agentResponse.newReport) {
            addReportToState(agentResponse.newReport);
          }

          if (agentResponse.suggestedRouteId) {
            setActiveRoute(agentResponse.suggestedRouteId);
          }

          addRouteMessage(agentResponse.replyText, agentResponse.suggestedRouteId || activeRouteId);
          showToast('Ángel actualizó tu recomendación');
        }, 500);
      } catch (err) {
        console.error('Error procesando consulta:', err);
        removeTypingIndicator();
        addMessage('agent', 'Hubo un momento de congestión en la consulta. Puedes elegir una ruta en el mapa o intentar de nuevo.');
      }
    },
    [reports, activeRouteId, origin, destination, deadline, addMessage, addRouteMessage, showTypingIndicator, removeTypingIndicator, addReportToState, setActiveRoute, showToast]
  );

  // ── handleAddReport ─────────────────────────────────────────────────────────
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
      const shouldReroute = report.type === 'bloqueo' || report.type === 'cambio' || report.type === 'clima';
      const nextRouteId = shouldReroute ? 'alternate' : activeRouteId;
      setActiveRoute(nextRouteId, newReports);

      const locationName = (REPORT_LOCATIONS[report.location] || REPORT_LOCATIONS.alpes).name;
      const typeLabel = REPORT_TYPE_LABELS[report.type] || 'Novedad';

      if (shouldReroute) {
        addRouteMessage(
          `🚨 Recibí el reporte de **${typeLabel.toLowerCase()}** en **${locationName}**.\nActualicé la recomendación en el mapa: ahora te sugiero la **Alternativa por Las Torres**. Llega aproximadamente 10 minutos más tarde, pero evita el tramo afectado. Tarifa total: $5.450 COP.`,
          'alternate'
        );
      } else {
        addMessage(
          'agent',
          `Gracias vecino/a. Registré una **${typeLabel.toLowerCase()}** en **${locationName}**. Aparece señalizada en el mapa y la comunidad puede corroborarla en tiempo real.`
        );
      }

      if (source === 'form') showToast('Reporte guardado. Ruta recalculada.');
    },
    [reports, activeRouteId, addReportToState, addMessage, addRouteMessage, setActiveRoute, showToast]
  );

  // ── handleSelectRoute (via route pills in summary) ───────────────────────────
  const handleSelectRoute = useCallback(
    (routeId) => {
      setActiveRoute(routeId);
      const r = ROUTES[routeId];
      if (r) {
        showToast(`Ruta activa: ${r.title} · ${r.costFormatted}`);
      }
    },
    [setActiveRoute, showToast]
  );

  // ── resetDemo ─────────────────────────────────────────────────────────────
  const resetDemo = useCallback(() => {
    clearTimeout(typingTimerRef.current);
    clearReports();
    setActiveRouteIdState('main');
    setPriorityMode('fastest');
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
    showToast('Demostración reiniciada para el jurado');
  }, [clearReports, showToast]);

  // ── shareCurrentRoute ─────────────────────────────────────────────────────
  const shareCurrentRoute = useCallback(() => {
    const route = ROUTES[activeRouteId] || ROUTES.main;
    const shareText = `Mi ruta en Muevete CB: ${route.title}. Tarifa: ${route.costFormatted}. Tiempo: ${route.duration}. ${window.location.href}`;
    if (navigator.share) {
      navigator.share({ title: 'Muevete CB', text: shareText, url: window.location.href }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => showToast('Enlace de la ruta copiado'));
    } else {
      showToast('Ruta lista para compartir');
    }
  }, [activeRouteId, showToast]);

  // ── runDemo ───────────────────────────────────────────────────────────────
  const runDemo = useCallback(() => {
    setOrigin('Mochuelo Alto');
    setDestination('Portal Tunal');
    setDeadline('07:00');
    document.querySelector('#workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    processQuery('Mochuelo Alto', 'Portal Tunal', '07:00', 'demo', 'fastest');
  }, [processQuery]);

  // ── toggleLayer ───────────────────────────────────────────────────────────
  const toggleLayer = useCallback((layerName) => {
    setLayers((prev) => ({ ...prev, [layerName]: !prev[layerName] }));
  }, []);

  return (
    <div className="page-shell">
      <a className="skip-link" href="#contenido">Saltar al contenido principal</a>

      <Header
        onOpenReport={() => setIsReportDialogOpen(true)}
        onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
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
          onSubmit={(org, dest, dl, pMode) => processQuery(org, dest, dl, 'form', pMode)}
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
