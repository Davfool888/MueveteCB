import React from 'react';
import ChatPanel from './Chat/ChatPanel';
import MapPanel from './Map/MapPanel';
import RouteSummary from './Map/RouteSummary';

export default function Workspace({
  messages,
  isTyping,
  activeRouteId,
  activeRoute,
  transportPlan,
  originLocation,
  destinationLocation,
  reports,
  layers,
  mapConnected,
  deadline,
  margin,
  onSendMessage,
  onResetDemo,
  onShareRoute,
  onToggleLayer,
  onSelectRoute,
  onSelectTransportMode,
  onMapConnectionChange,
  onScrollToMap,
  showToast,
}) {
  const isAlert = activeRoute?.id === 'alternate';

  return (
    <section className="workspace" id="workspace" aria-label="Asistente y mapa en vivo">
      {/* Left: Chat */}
      <ChatPanel
        messages={messages}
        isTyping={isTyping}
        onSendMessage={onSendMessage}
        onResetDemo={onResetDemo}
        onScrollToMap={onScrollToMap}
        showToast={showToast}
      />

      {/* Right: Map column */}
      <div className="map-column">
        <MapPanel
          activeRouteId={activeRouteId}
          activeRoute={activeRoute}
          transportPlan={transportPlan}
          originLocation={originLocation}
          destinationLocation={destinationLocation}
          reports={reports}
          layers={layers}
          mapConnected={mapConnected}
          onToggleLayer={onToggleLayer}
          onShareRoute={onShareRoute}
          onSelectTransportMode={onSelectTransportMode}
          onMapConnectionChange={onMapConnectionChange}
        />

        <RouteSummary
          activeRoute={activeRoute}
          margin={margin}
          isAlert={isAlert}
          onSelectRoute={onSelectRoute}
        />
      </div>
    </section>
  );
}
