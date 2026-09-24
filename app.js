"use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const CABLE_PATH = [
    [4.5500615, -74.1588534],
    [4.551891, -74.14962],
    [4.5544391, -74.1481597],
    [4.5571596, -74.1466208],
    [4.5597225, -74.1451425],
    [4.5626071, -74.1434787],
    [4.564179, -74.142572],
    [4.5671406, -74.1408636],
    [4.5689342, -74.1398416],
    [4.569174, -74.1396997]
  ];

  const ROUTES = {
    main: {
      id: "main",
      origin: "Mochuelo Alto",
      destination: "Portal Tunal",
      title: "Mochuelo Alto → Portal Tunal",
      departureClock: "5:35 a. m.",
      arrivalClock: "6:29 a. m.",
      arrivalMinutes: 389,
      duration: "54 min",
      confidence: 86,
      confidenceLabel: "Confianza media-alta",
      reason: "Cruza una veredal y toma TransMiCable directo, evitando el trancón de la Boyacá.",
      mapPath: [
        [4.4883574, -74.148341],
        [4.4941, -74.1512],
        [4.5051, -74.1525],
        [4.5182, -74.1592],
        [4.5253, -74.1601],
        [4.5336318, -74.1562843],
        [4.5397146, -74.1602603],
        ...CABLE_PATH
      ],
      fallbackPath: "M82 505C135 444 188 377 252 334C345 273 458 240 570 182C650 140 714 119 765 105",
      segments: [
        { type: "informal", title: "Colectivo de Quiba", detail: "Quiba → Villa del Rosario · 25 min", time: "25 min" },
        { type: "cable", title: "Transbordo en Villa del Rosario", detail: "Espera estimada · 5 min", time: "5 min" },
        { type: "cable", title: "TransMiCable", detail: "Villa del Rosario → Portal Tunal · 14 min", time: "14 min" },
        { type: "walk", title: "Camina al acceso", detail: "Portal Tunal · 10 min", time: "10 min" }
      ]
    },
    alternate: {
      id: "alternate",
      origin: "Mochuelo Alto",
      destination: "Portal Tunal",
      title: "Alternativa por Las Torres",
      departureClock: "5:38 a. m.",
      arrivalClock: "6:42 a. m.",
      arrivalMinutes: 402,
      duration: "64 min",
      confidence: 76,
      confidenceLabel: "Confianza media",
      reason: "Evita el bloqueo de la vía Alpes–Quiba con un enlace veredal; suma 10 minutos.",
      mapPath: [
        [4.4883574, -74.148341],
        [4.4942, -74.1528],
        [4.506, -74.1592],
        [4.518, -74.1645],
        [4.5298, -74.1684],
        [4.5405, -74.1658],
        [4.5472, -74.1612],
        ...CABLE_PATH
      ],
      fallbackPath: "M82 505C132 450 185 398 252 370C350 329 446 298 533 238C630 185 700 139 765 105",
      segments: [
        { type: "informal", title: "Colectivo veredal", detail: "Mochuelo Alto → Las Torres · 29 min", time: "29 min" },
        { type: "walk", title: "Camina al enlace", detail: "Cruce señalizado · 4 min", time: "4 min" },
        { type: "informal", title: "Colectivo de enlace", detail: "Las Torres → Villa del Rosario · 12 min", time: "12 min" },
        { type: "cable", title: "TransMiCable", detail: "Villa del Rosario → Portal Tunal · 14 min", time: "14 min" },
        { type: "walk", title: "Camina al acceso", detail: "Portal Tunal · 5 min", time: "5 min" }
      ]
    },
    quiba: {
      id: "quiba",
      origin: "Quiba",
      destination: "Portal Tunal",
      title: "Quiba → Portal Tunal",
      departureClock: "6:05 a. m.",
      arrivalClock: "6:33 a. m.",
      arrivalMinutes: 393,
      duration: "28 min",
      confidence: 83,
      confidenceLabel: "Confianza media-alta",
      reason: "Enlaza con TransMiCable en Villa del Rosario y evita sumar trayectos por el centro.",
      mapPath: [
        [4.5336318, -74.1562843],
        [4.5397146, -74.1602603],
        ...CABLE_PATH
      ],
      fallbackPath: "M252 334C300 310 335 286 400 252C510 196 660 145 765 105",
      segments: [
        { type: "informal", title: "Colectivo de Quiba", detail: "Quiba → Villa del Rosario · 12 min", time: "12 min" },
        { type: "cable", title: "Transbordo corto", detail: "Villa del Rosario · 3 min", time: "3 min" },
        { type: "cable", title: "TransMiCable", detail: "Directo a Portal Tunal · 13 min", time: "13 min" }
      ]
    }
  };

  const INFORMAL_PATHS = [
    {
      name: "Mochuelo Alto – Quiba – Villa del Rosario",
      coordinates: [
        [4.4883574, -74.148341],
        [4.4941, -74.1512],
        [4.5051, -74.1525],
        [4.5182, -74.1592],
        [4.5336318, -74.1562843],
        [4.5397146, -74.1602603],
        [4.5500615, -74.1588534]
      ]
    },
    {
      name: "Quiba – Altos de Quiba",
      coordinates: [
        [4.5336318, -74.1562843],
        [4.539, -74.1518],
        [4.546, -74.1508],
        [4.5544391, -74.1481597]
      ]
    },
    {
      name: "Mochuelo Alto – sector Las Torres",
      coordinates: [
        [4.4883574, -74.148341],
        [4.503, -74.1592],
        [4.518, -74.1645],
        [4.5298, -74.1684]
      ]
    }
  ];

  const SITP_PATH = [
    [4.5500615, -74.1588534],
    [4.5446, -74.1654],
    [4.5382, -74.1718],
    [4.5316, -74.1781],
    [4.525, -74.1832]
  ];

  const POINTS_OF_INTEREST = [
    { name: "Portal Tunal", detail: "Terminal de TransMiCable y TransMilenio", coordinates: [4.569174, -74.1396997], label: "T" },
    { name: "Quiba", detail: "Punto de enlace demostrativo", coordinates: [4.5336318, -74.1562843], label: "Q" },
    { name: "Mochuelo Alto", detail: "Sector de origen de la demo", coordinates: [4.4883574, -74.148341], label: "M" },
    { name: "Plaza de mercado", detail: "Referencia comunitaria demostrativa", coordinates: [4.5506, -74.151], label: "P" }
  ];

  const REPORT_LOCATIONS = {
    alpes: {
      name: "Vía Alpes – Quiba",
      coordinates: [4.5336318, -74.1562843]
    },
    rosario: {
      name: "Sector Villa del Rosario",
      coordinates: [4.5500615, -74.1588534]
    },
    tunal: {
      name: "Portal Tunal",
      coordinates: [4.569174, -74.1396997]
    }
  };

  const REPORT_TYPE_LABELS = {
    bloqueo: "Bloqueo",
    demora: "Demora",
    cambio: "Cambio de ruta"
  };

  const STORAGE_KEY = "muevete-cb-demo-reports-v1";
  const state = {
    activeRouteId: "main",
    reports: loadReports(),
    map: null,
    tileLayer: null,
    tileErrors: 0,
    tilesLoaded: false,
    layerGroups: {},
    toastTimer: null,
    typingTimer: null,
    recognition: null
  };

  const refs = {};

  function init() {
    cacheRefs();
    setCurrentTime();
    setInterval(setCurrentTime, 60_000);
    setupMap();
    renderReports();
    setActiveRoute(hasBlockingReport() ? "alternate" : "main", { announce: false, fit: true });
    bindEvents();
    updateUrl(false);
  }

  function cacheRefs() {
    refs.plannerForm = $("#planner-form");
    refs.origin = $("#origin");
    refs.destination = $("#destination");
    refs.deadline = $("#deadline");
    refs.chatForm = $("#chat-form");
    refs.chatInput = $("#chat-input");
    refs.messages = $("#messages");
    refs.micButton = $("#mic-button");
    refs.runDemo = $("#run-demo");
    refs.resetDemo = $("#reset-demo");
    refs.shareRoute = $("#share-route");
    refs.reportDialog = $("#report-dialog");
    refs.reportForm = $("#report-form");
    refs.openReport = $("#open-report");
    refs.reportLocation = $("#report-location");
    refs.reportNote = $("#report-note");
    refs.toast = $("#toast");
    refs.map = $("#map");
    refs.mapWrap = $("#map-wrap");
    refs.mapConnection = $("#map-connection");
    refs.mapState = $(".map-state");
    refs.fallbackRoute = $("#fallback-route");
    refs.mapBottomCard = $("#map-bottom-card");
    refs.mapMessageTitle = $("#map-message-title");
    refs.mapMessage = $("#map-message");
    refs.routeSummary = $("#route-summary");
    refs.summaryTitle = $("#summary-title");
    refs.routeBadge = $("#route-badge");
    refs.departureTime = $("#departure-time");
    refs.arrivalTime = $("#arrival-time");
    refs.tripDuration = $("#trip-duration");
    refs.tripBuffer = $("#trip-buffer");
    refs.routeSteps = $("#route-steps");
    refs.confidenceRing = $("#confidence-ring");
    refs.confidenceScore = $("#confidence-score");
    refs.confidenceLabel = $("#confidence-label");
    refs.routeReason = $("#route-reason");
    refs.reportCount = $("#report-count");
  }

  function bindEvents() {
    refs.plannerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      processQuery(refs.origin.value, refs.destination.value, refs.deadline.value, "form");
    });

    refs.chatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = refs.chatInput.value.trim();
      if (!text) return;
      refs.chatInput.value = "";
      autoResizeChat();
      processTextMessage(text);
    });

    refs.chatInput.addEventListener("input", autoResizeChat);
    refs.chatInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        refs.chatForm.requestSubmit();
      }
    });

    $$('[data-prompt]').forEach((button) => {
      button.addEventListener("click", () => {
        processTextMessage(button.dataset.prompt);
      });
    });

    refs.runDemo.addEventListener("click", () => {
      refs.origin.value = "Mochuelo Alto";
      refs.destination.value = "Portal Tunal";
      refs.deadline.value = "07:00";
      document.querySelector("#workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      processQuery("Mochuelo Alto", "Portal Tunal", "07:00", "demo");
    });

    refs.resetDemo.addEventListener("click", resetDemo);
    refs.shareRoute.addEventListener("click", shareCurrentRoute);
    refs.micButton.addEventListener("click", startDictation);

    refs.openReport.addEventListener("click", openReportDialog);
    $$('[data-close-dialog]').forEach((button) => {
      button.addEventListener("click", closeReportDialog);
    });
    refs.reportDialog.addEventListener("click", (event) => {
      if (event.target === refs.reportDialog) closeReportDialog();
    });
    refs.reportForm.addEventListener("submit", submitReport);

    $$('.layer-button').forEach((button) => {
      button.addEventListener("click", () => toggleLayer(button));
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && state.map) {
        setTimeout(() => state.map.invalidateSize(), 80);
      }
    });
  }

  function processQuery(origin, destination, deadline, source) {
    window.clearTimeout(state.typingTimer);
    removeTyping();
    const normalizedOrigin = normalizeText(origin);
    const normalizedDestination = normalizeText(destination);

    if (source === "form" || source === "demo") {
      const text = `Estoy en ${origin} y necesito llegar ${destinationPhrase(destination)} antes de las ${formatDeadlineLabel(deadline)}`;
      addMessage("user", text);
    }

    showTyping();
    const preferredRouteId = normalizedOrigin.includes("quiba") ? "quiba" : "main";
    const routeId = preferredRouteId === "main" && hasBlockingReport() ? "alternate" : preferredRouteId;
    const route = ROUTES[routeId];

    state.typingTimer = window.setTimeout(() => {
      removeTyping();
      setActiveRoute(routeId, { announce: false, fit: true });
      const goalMessage = routeId === "alternate"
        ? `Hay un bloqueo activo, así que ajusté la ruta para llegar antes de las ${formatDeadlineLabel(deadline)}`
        : normalizedDestination.includes("tunal")
          ? `Encontré una opción para llegar antes de las ${formatDeadlineLabel(deadline)}`
          : `Para esta demostración tengo un trayecto preparado ${destinationPhrase(destination)}.`;
      addRouteMessage(
        `${goalMessage}\n${route.segments.map((segment, index) => `${index + 1}. ${segment.title} (${segment.time}).`).join("\n")}\nTiempo total estimado: ${route.duration}. ${route.reason}`,
        routeId
      );
      showToast(`Ruta lista: ${route.title}`);
    }, 720);
  }

  function processTextMessage(text) {
    window.clearTimeout(state.typingTimer);
    removeTyping();
    addMessage("user", text);
    showTyping();

    const normalized = normalizeText(text);
    const isReport = /\b(reporte|reportar|bloqueo|demora|cambio de ruta)\b/.test(normalized);
    if (isReport) {
      const type = normalized.includes("demora") ? "demora" : normalized.includes("cambio") ? "cambio" : "bloqueo";
      const location = normalized.includes("rosario") ? "rosario" : normalized.includes("tunal") ? "tunal" : "alpes";
      const cleanNote = text.replace(/^\s*reporte\s+/i, "").slice(0, 140);
      state.typingTimer = window.setTimeout(() => {
        removeTyping();
        addReport({ type, location, note: cleanNote, source: "chat" });
        showToast("Reporte recibido y ruta recalculada");
      }, 760);
      return;
    }

    const preferredRouteId = normalized.includes("quiba") && !normalized.includes("mochuelo") ? "quiba" : "main";
    const routeId = preferredRouteId === "main" && hasBlockingReport() ? "alternate" : preferredRouteId;
    state.typingTimer = window.setTimeout(() => {
      removeTyping();
      setActiveRoute(routeId, { announce: false, fit: true });
      const route = ROUTES[routeId];
      if (normalized.includes("hola") || normalized.includes("gracias")) {
        addMessage("agent", "Con gusto. Estoy listo para comparar rutas o registrar una novedad.");
        return;
      }
      addRouteMessage(
        `Te recomiendo ${route.title}.\n${route.segments.map((segment, index) => `${index + 1}. ${segment.title}: ${segment.time}.`).join("\n")}\nLlegada estimada ${route.arrivalClock}. ${route.reason}`,
        routeId
      );
    }, 720);
  }

  function addMessage(role, text, routeId = null) {
    const article = document.createElement("article");
    article.className = `message message-${role}`;

    if (role === "agent") {
      const avatar = document.createElement("span");
      avatar.className = "message-avatar";
      avatar.textContent = "A";
      avatar.setAttribute("aria-hidden", "true");
      article.append(avatar);
    }

    const content = document.createElement("div");
    content.className = "message-content";
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    content.append(paragraph);

    if (routeId && ROUTES[routeId]) {
      const card = document.createElement("div");
      card.className = "message-route-card";
      const title = document.createElement("strong");
      title.textContent = `${ROUTES[routeId].title} · ${ROUTES[routeId].duration}`;
      const list = document.createElement("ol");
      ROUTES[routeId].segments.slice(0, 4).forEach((segment) => {
        const item = document.createElement("li");
        item.textContent = `${segment.title} (${segment.time})`;
        list.append(item);
      });
      const action = document.createElement("button");
      action.className = "message-action";
      action.type = "button";
      action.textContent = "Ver ruta en el mapa";
      action.addEventListener("click", () => {
        document.querySelector("#workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
        refs.mapBottomCard.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.025)" }, { transform: "scale(1)" }],
          { duration: 450, easing: "ease-out" }
        );
      });
      card.append(title, list, action);
      content.append(card);
    }

    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = role === "agent" ? "Ángel · ahora" : "Tú · ahora";
    content.append(time);
    article.append(content);
    refs.messages.append(article);
    scrollMessagesToBottom();
    return article;
  }

  function addRouteMessage(text, routeId) {
    addMessage("agent", text, routeId);
  }

  function showTyping() {
    removeTyping();
    const article = document.createElement("article");
    article.className = "message message-agent typing-message";
    article.id = "typing-message";
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.textContent = "A";
    avatar.setAttribute("aria-hidden", "true");
    const content = document.createElement("div");
    content.className = "message-content typing-indicator";
    content.setAttribute("aria-label", "Ángel está escribiendo");
    content.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
    article.append(avatar, content);
    refs.messages.append(article);
    scrollMessagesToBottom();
  }

  function removeTyping() {
    $("#typing-message")?.remove();
  }

  function scrollMessagesToBottom() {
    window.requestAnimationFrame(() => {
      refs.messages.scrollTop = refs.messages.scrollHeight;
    });
  }

  function setActiveRoute(routeId, options = {}) {
    const adjusted = routeId === "alternate" || (routeId === "main" && hasBlockingReport()) ? "alternate" : routeId;
    state.activeRouteId = adjusted;

    refs.summaryTitle.textContent = ROUTES[adjusted].title;
    refs.departureTime.textContent = ROUTES[adjusted].departureClock;
    refs.arrivalTime.textContent = ROUTES[adjusted].arrivalClock;
    refs.tripDuration.textContent = ROUTES[adjusted].duration;
    refs.confidenceScore.textContent = `${ROUTES[adjusted].confidence}%`;
    refs.confidenceRing.style.setProperty("--score", ROUTES[adjusted].confidence);
    refs.confidenceLabel.textContent = ROUTES[adjusted].confidenceLabel;
    refs.routeReason.textContent = ROUTES[adjusted].reason;
    refs.routeBadge.textContent = adjusted === "alternate" ? "Ruta ajustada" : "Mejor opción";
    refs.routeSummary.classList.toggle("has-alert", adjusted === "alternate");
    refs.mapBottomCard.classList.toggle("is-alert", adjusted === "alternate");

    const deadline = refs.deadline?.value || "07:00";
    const margin = timeToMinutes(deadline) - ROUTES[adjusted].arrivalMinutes;
    refs.tripBuffer.textContent = margin >= 0 ? `${margin} min` : "Revisar";
    refs.tripBuffer.style.color = margin < 10 ? "var(--coral-deep)" : "";

    renderSteps(ROUTES[adjusted]);
    drawRecommendedRoute(ROUTES[adjusted], options.fit !== false);

    if (adjusted === "alternate") {
      refs.mapMessageTitle.textContent = "Ruta recalculada";
      refs.mapMessage.textContent = "Evita el bloqueo reportado por la vía Alpes–Quiba.";
    } else {
      refs.mapMessageTitle.textContent = "Mejor opción trazada";
      refs.mapMessage.textContent = `${ROUTES[adjusted].duration} · incluye transbordo`;
    }

    refs.fallbackRoute.setAttribute("d", ROUTES[adjusted].fallbackPath);
    refs.fallbackRoute.style.stroke = adjusted === "alternate" ? "#d89b18" : "#087f68";
    updateUrl(false);

    if (options.announce) {
      showToast(`Ruta actualizada: ${ROUTES[adjusted].title}`);
    }
  }

  function renderSteps(route) {
    refs.routeSteps.replaceChildren();
    route.segments.forEach((segment, index) => {
      const item = document.createElement("li");
      const icon = document.createElement("span");
      icon.className = `step-icon step-${segment.type}`;
      icon.textContent = String(index + 1);
      const content = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("span");
      title.textContent = segment.title;
      detail.textContent = segment.detail;
      content.append(title, detail);
      item.append(icon, content);
      refs.routeSteps.append(item);
    });
  }

  function setupMap() {
    if (!window.L) {
      setMapConnection(false);
      refs.mapWrap.classList.add("is-schematic");
      return;
    }

    try {
      state.map = L.map(refs.map, {
        center: [4.535, -74.152],
        zoom: 12,
        minZoom: 10,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: true,
        preferCanvas: false
      });

      L.control.zoom({ position: "bottomright" }).addTo(state.map);
      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(state.map);

      state.tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        crossOrigin: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      });

      state.tileLayer.on("load", () => {
        state.tilesLoaded = true;
        setMapConnection(true);
      });
      state.tileLayer.on("tileerror", () => {
        state.tileErrors += 1;
        if (state.tileErrors >= 2) setMapConnection(false);
      });
      state.tileLayer.addTo(state.map);

      state.layerGroups.route = L.layerGroup().addTo(state.map);
      state.layerGroups.cable = L.layerGroup().addTo(state.map);
      state.layerGroups.sitp = L.layerGroup().addTo(state.map);
      state.layerGroups.informal = L.layerGroup().addTo(state.map);
      state.layerGroups.reports = L.layerGroup().addTo(state.map);

      addBaseLayers();
      renderReports();
      setActiveRoute(state.activeRouteId, { announce: false, fit: false });
      setMapConnection(true);
      window.setTimeout(() => state.map?.invalidateSize(), 120);
    } catch (error) {
      console.error("No fue posible inicializar Leaflet", error);
      setMapConnection(false);
    }
  }

  function addBaseLayers() {
    L.polyline(CABLE_PATH, {
      color: "#d89b18",
      weight: 5,
      opacity: 0.92,
      lineCap: "round",
      lineJoin: "round"
    }).bindTooltip("TransMiCable · trazado de referencia", { sticky: true }).addTo(state.layerGroups.cable);

    L.polyline(SITP_PATH, {
      color: "#3478b8",
      weight: 5,
      opacity: 0.9,
      lineCap: "round"
    }).bindTooltip("Eje SITP demostrativo", { sticky: true }).addTo(state.layerGroups.sitp);

    INFORMAL_PATHS.forEach((path) => {
      L.polyline(path.coordinates, {
        color: "#ef765f",
        weight: 4,
        opacity: 0.9,
        dashArray: "8 9",
        lineCap: "round"
      }).bindTooltip(path.name, { sticky: true }).addTo(state.layerGroups.informal);
    });

    POINTS_OF_INTEREST.forEach((point) => {
      const marker = L.marker(point.coordinates, {
        icon: createIcon("poi", point.label),
        keyboard: true,
        title: point.name
      });
      marker.bindPopup(`<strong>${escapeHtml(point.name)}</strong>${escapeHtml(point.detail)}`);
      marker.addTo(state.layerGroups.cable);
    });
  }

  function drawRecommendedRoute(route, fit = true) {
    if (state.fallbackRoute) {
      state.fallbackRoute.setAttribute("d", route.fallbackPath);
    }
    if (!state.map || !state.layerGroups.route) return;

    state.layerGroups.route.clearLayers();
    const isAlternate = route.id === "alternate";
    const color = isAlternate ? "#d89b18" : "#087f68";

    L.polyline(route.mapPath, {
      color: "#ffffff",
      weight: 11,
      opacity: 0.92,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
      className: "leaflet-route-halo"
    }).addTo(state.layerGroups.route);

    L.polyline(route.mapPath, {
      color,
      weight: 7,
      opacity: 1,
      lineCap: "round",
      lineJoin: "round",
      className: `leaflet-route-line${isAlternate ? " route-alert" : ""}`
    }).bindTooltip(`${route.title} · ${route.duration}`, { sticky: true }).addTo(state.layerGroups.route);

    const originMarker = L.marker(route.mapPath[0], {
      icon: createIcon("route", "A"),
      keyboard: true,
      title: `Origen: ${route.origin}`,
      zIndexOffset: 700
    });
    originMarker.bindPopup(`<strong>Origen</strong>${escapeHtml(route.origin)}`);
    originMarker.addTo(state.layerGroups.route);

    const destination = route.mapPath[route.mapPath.length - 1];
    const destinationMarker = L.marker(destination, {
      icon: createIcon("route", "B"),
      keyboard: true,
      title: `Destino: ${route.destination}`,
      zIndexOffset: 700
    });
    destinationMarker.bindPopup(`<strong>Destino</strong>${escapeHtml(route.destination)}`);
    destinationMarker.addTo(state.layerGroups.route);

    if (fit) {
      window.setTimeout(() => {
        state.map.fitBounds(L.latLngBounds(route.mapPath), {
          paddingTopLeft: [35, 30],
          paddingBottomRight: [35, 80],
          maxZoom: 14,
          animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        });
      }, 60);
    }
  }

  function renderReports() {
    refs.reportCount.textContent = String(state.reports.length);
    if (!state.map || !state.layerGroups.reports) return;
    state.layerGroups.reports.clearLayers();

    state.reports.forEach((report) => {
      const location = REPORT_LOCATIONS[report.location] || REPORT_LOCATIONS.alpes;
      const marker = L.marker(location.coordinates, {
        icon: createIcon("report", "!"),
        keyboard: true,
        title: `${REPORT_TYPE_LABELS[report.type] || report.type}: ${location.name}`,
        zIndexOffset: 600
      });
      const popup = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${REPORT_TYPE_LABELS[report.type] || "Novedad"} · ${location.name}`;
      const time = document.createElement("div");
      time.textContent = "Reportado por la comunidad · hace un momento";
      popup.append(title, time);
      if (report.note) {
        const note = document.createElement("p");
        note.textContent = report.note;
        popup.append(note);
      }
      marker.bindPopup(popup);
      marker.addTo(state.layerGroups.reports);
    });
  }

  function createIcon(kind, label) {
    return L.divIcon({
      className: `muevete-marker marker-${kind}`,
      html: `<span class="marker-core"><span>${escapeHtml(label)}</span></span>`,
      iconSize: [38, 42],
      iconAnchor: [19, 39],
      popupAnchor: [0, -36]
    });
  }

  function toggleLayer(button) {
    const layerName = button.dataset.layer;
    const group = state.layerGroups[layerName];
    const isActive = button.classList.toggle("is-active");
    button.setAttribute("aria-pressed", String(isActive));

    if (group && state.map) {
      if (isActive) group.addTo(state.map);
      else group.removeFrom(state.map);
    }

    if (layerName === "route") {
      refs.fallbackRoute.style.opacity = isActive ? "1" : "0.08";
    }
  }

  function setMapConnection(isOnline) {
    refs.mapConnection.textContent = isOnline ? "Mapa en vivo" : "Vista sin conexión";
    refs.mapState.classList.toggle("is-offline", !isOnline);
    refs.mapWrap.classList.toggle("is-online", isOnline);
  }

  function openReportDialog() {
    if (typeof refs.reportDialog.showModal === "function") {
      refs.reportDialog.showModal();
    } else {
      refs.reportDialog.setAttribute("open", "");
    }
    window.setTimeout(() => $("input[name='reportType']:checked", refs.reportForm)?.focus(), 40);
  }

  function closeReportDialog() {
    if (typeof refs.reportDialog.close === "function" && refs.reportDialog.open) {
      refs.reportDialog.close();
    } else {
      refs.reportDialog.removeAttribute("open");
    }
  }

  function submitReport(event) {
    event.preventDefault();
    const formData = new FormData(refs.reportForm);
    addReport({
      type: formData.get("reportType"),
      location: formData.get("location"),
      note: formData.get("note"),
      source: "form"
    });
    refs.reportForm.reset();
    $("input[name='reportType'][value='bloqueo']", refs.reportForm).checked = true;
    closeReportDialog();
  }

  function addReport({ type, location, note, source }) {
    const report = {
      id: `report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: type || "bloqueo",
      location: location || "alpes",
      note: String(note || "").trim().slice(0, 140),
      createdAt: new Date().toISOString()
    };

    state.reports.unshift(report);
    saveReports();
    renderReports();
    refs.reportCount.textContent = String(state.reports.length);

    const shouldReroute = report.type === "bloqueo" || report.type === "cambio";
    const nextRoute = shouldReroute ? "alternate" : state.activeRouteId;
    setActiveRoute(nextRoute, { announce: false, fit: true });

    const locationName = (REPORT_LOCATIONS[report.location] || REPORT_LOCATIONS.alpes).name;
    const typeLabel = REPORT_TYPE_LABELS[report.type] || "Novedad";
    if (shouldReroute) {
      addRouteMessage(
        `Recibí el reporte de ${typeLabel.toLowerCase()} en ${locationName}.\nActualicé la recomendación: ahora te sugiero la alternativa por Las Torres. Llega aproximadamente 13 minutos más tarde, pero evita el tramo afectado.`,
        "alternate"
      );
    } else {
      addMessage(
        "agent",
        `Gracias. Registré una ${typeLabel.toLowerCase()} en ${locationName}. La muestra en el mapa con la hora del reporte; ten en cuenta que aún debe confirmarse con la comunidad.`
      );
    }

    if (source === "form") showToast("Reporte guardado. La ruta fue recalculada.");
  }

  function shareCurrentRoute() {
    updateUrl(true);
    const route = ROUTES[state.activeRouteId] || ROUTES.main;
    const shareText = `Mi ruta en Muevete CB: ${route.title}. Tiempo estimado: ${route.duration}. ${window.location.href}`;
    if (navigator.share) {
      navigator.share({ title: "Muevete CB", text: shareText, url: window.location.href }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => showToast("Enlace de la demo copiado"));
    } else {
      showToast("La ruta está lista en la barra del navegador");
    }
  }

  function updateUrl(replace) {
    if (!window.history?.replaceState) return;
    const params = new URLSearchParams(window.location.search);
    params.set("from", refs.origin?.value || "Mochuelo Alto");
    params.set("to", refs.destination?.value || "Portal Tunal");
    params.set("scenario", state.activeRouteId);
    const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    if (replace) window.history.replaceState({}, "", nextUrl);
    else window.history.replaceState({}, "", nextUrl);
  }

  function startDictation() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      showToast("La voz no está disponible en este navegador. Puedes escribir tu pregunta.");
      refs.chatInput.focus();
      return;
    }

    if (state.recognition) {
      state.recognition.stop();
      return;
    }

    const recognition = new Recognition();
    state.recognition = recognition;
    recognition.lang = "es-CO";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener("start", () => {
      refs.micButton.classList.add("is-listening");
      showToast("Te escucho…");
    });
    recognition.addEventListener("result", (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      refs.chatInput.value = transcript;
      autoResizeChat();
      refs.chatInput.focus();
    });
    recognition.addEventListener("error", (event) => {
      const message = event.error === "not-allowed"
        ? "El navegador no permitió el micrófono."
        : "No pude escuchar. Intenta de nuevo o escribe tu pregunta.";
      showToast(message);
    });
    recognition.addEventListener("end", () => {
      refs.micButton.classList.remove("is-listening");
      state.recognition = null;
    });
    recognition.start();
  }

  function autoResizeChat() {
    refs.chatInput.style.height = "auto";
    refs.chatInput.style.height = `${Math.min(refs.chatInput.scrollHeight, 90)}px`;
  }

  function resetDemo() {
    window.clearTimeout(state.typingTimer);
    state.reports = [];
    state.activeRouteId = "main";
    saveReports();
    refs.origin.value = "Mochuelo Alto";
    refs.destination.value = "Portal Tunal";
    refs.deadline.value = "07:00";
    refs.messages.replaceChildren();
    addMessage("agent", "Hola, soy Ángel. La demostración se reinició. Dime de dónde sales, a dónde vas y a qué hora necesitas llegar.");
    renderReports();
    setActiveRoute("main", { announce: false, fit: true });
    showToast("Demostración reiniciada");
  }

  function hasBlockingReport() {
    return state.reports.some((report) => report.type === "bloqueo" || report.type === "cambio");
  }

  function saveReports() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reports));
    } catch (error) {
      console.warn("No se pudo guardar el reporte en localStorage", error);
    }
  }

  function loadReports() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
    } catch {
      return [];
    }
  }

  function setCurrentTime() {
    const time = new Intl.DateTimeFormat("es-CO", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date());
    const title = refs.mapConnection?.title || "";
    if (title) refs.mapConnection.title = title;
    document.documentElement.dataset.demoTime = time;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    refs.toast.textContent = message;
    refs.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => refs.toast.classList.remove("is-visible"), 3200);
  }

  function normalizeText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function destinationPhrase(value) {
    const destination = String(value || "el destino").trim();
    return normalizeText(destination).includes("portal tunal") ? `al ${destination}` : `a ${destination}`;
  }

  function formatDeadlineLabel(value) {
    const normalized = String(value || "07:00");
    const [hour, minute] = normalized.split(":").map(Number);
    const suffix = hour < 12 ? "a. m." : "p. m.";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute || 0).padStart(2, "0")} ${suffix}`;
  }

  function timeToMinutes(value) {
    const [hour, minute] = String(value || "07:00").split(":").map(Number);
    return (hour || 0) * 60 + (minute || 0);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
