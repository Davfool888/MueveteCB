// ─── AI Mobility Agent for Ciudad Bolívar ("Ángel") ────────────────────────

import { ROUTES, REPORT_LOCATIONS, REPORT_TYPE_LABELS } from '../data/routes';
import { normalizeText } from '../utils/helpers';

const SYSTEM_PROMPT = `
Eres Ángel, el Agente Inteligente de Movilidad de Ciudad Bolívar en Bogotá (Hackatón Muévete CB).
Tu misión es guiar a la comunidad de Ciudad Bolívar (estudiantes, comerciantes, trabajadores y adultos mayores) para planificar sus desplazamientos cruzando:
1. Transporte formal: TransMiCable (4 estaciones: Portal Tunal, Juan Pablo II, Manitas, Mirador del Paraíso) con tarifa de $2.950 COP (tarjeta TuLlave).
2. Transporte SITP: Rutas formales (H610, 6-18) con tarifa de $2.950 COP y transbordo a $0 en ventana de 110 min.
3. Transporte informal/veredal: Camperos, carros comunales y colectivos (Mochuelo, Quiba, Bella Flor, Las Torres, Sierra Morena) con tarifa de $2.000 a $2.500 COP en efectivo.

Reglas clave:
- Responde siempre de forma empática, clara, concisa (máximo 3-4 frases o pasos clave).
- Incluye siempre: Tiempos estimados, Precios totales en $ COP y consejos de pago (efectivo para informal, TuLlave para formal).
- Considera la accesibilidad (rampas y ascensores en TransMiCable para personas mayores o sillas de ruedas vs trochas empinadas de vereda).
- Si el usuario reporta un bloqueo o novedad, confírmalo y sugiere desvío inmediato.
- Conoce bien los barrios y veredas: Mochuelo Alto y Bajo, Quiba Alta y Baja, Paraíso, Manitas, San Francisco, Meissen, Portal Tunal, Sierra Morena, Alpes.
`;

/**
 * Main dispatcher: calls Gemini API if key exists, otherwise runs resilient local agent engine.
 */
export async function queryMobilityAgent({
  query,
  activeReports = [],
  currentRouteId = 'main',
  origin = 'Mochuelo Alto',
  destination = 'Portal Tunal',
  deadline = '07:00',
}) {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('muevete_gemini_key') : null);

  // Try live Gemini API if key is present
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const response = await callGeminiAPI(apiKey.trim(), query, {
        activeReports,
        origin,
        destination,
        deadline,
        routes: ROUTES,
      });
      if (response) return response;
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local agent reasoning engine:', err);
    }
  }

  // Fallback to high-precision local reasoning engine
  return localAgentReasoning(query, activeReports, currentRouteId);
}

/**
 * Call Gemini 2.5/Flash API via REST endpoint
 */
async function callGeminiAPI(apiKey, query, context) {
  const reportsContext = context.activeReports.length > 0
    ? `Reportes activos en la localidad: ${context.activeReports.map(r => `${r.type} en ${r.location}: ${r.note}`).join('; ')}`
    : 'No hay bloqueos activos reportados en este momento.';

  const prompt = `
Contexto de la consulta:
- Origen: ${context.origin}
- Destino: ${context.destination}
- Hora límite de llegada: ${context.deadline}
- ${reportsContext}
- Rutas disponibles:
  * "main": Mochuelo Alto -> Portal Tunal por Quiba y TransMiCable (54 min, $5.450 COP, Rápida)
  * "alternate": Mochuelo Alto -> Portal Tunal por Las Torres (64 min, $5.450 COP, Desvío seguro)
  * "economic": Mochuelo Bajo -> Portal Tunal por SITP directo (68 min, $2.950 COP, Ahorro máximo)
  * "accessible": Mirador del Paraíso -> Portal Tunal TransMiCable directo (19 min, $2.950 COP, 100% PMR / Accesible)

Pregunta del usuario: "${query}"

Responde en lenguaje cotidiano de Ciudad Bolívar. Indica cuál ruta recomiendas (usa id: "main", "alternate", "economic" o "accessible"), tiempo estimado y desglose de costo en pesos.
Termina tu respuesta con una línea en formato: [ROUTE_ID: id] si recomiendas cambiar la ruta en el mapa.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 350,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini HTTP Error ${res.status}`);

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extract recommended route id if present
  let suggestedRouteId = null;
  const match = rawText.match(/\[ROUTE_ID:\s*(\w+)\]/i);
  if (match && ROUTES[match[1]]) {
    suggestedRouteId = match[1];
  }

  const cleanText = rawText.replace(/\[ROUTE_ID:\s*\w+\]/gi, '').trim();

  return {
    replyText: cleanText,
    suggestedRouteId,
    source: 'gemini',
  };
}

/**
 * Local Rule & Semantic Heuristics Engine (Offline-first / Hackathon Demo proof)
 */
function localAgentReasoning(query, activeReports, currentRouteId) {
  const norm = normalizeText(query);

  // 1. Incidents & Citizen Reports Detection
  const isReport = /\b(reporte|reportar|bloqueo|bloquearon|demora|tranc[oó]n|cambio de ruta|derrumbe|lluvia|cerraron)\b/.test(norm);
  if (isReport) {
    const type = norm.includes('demora') || norm.includes('tranc')
      ? 'demora'
      : norm.includes('cambio')
      ? 'cambio'
      : norm.includes('lluvia') || norm.includes('derrumbe')
      ? 'clima'
      : 'bloqueo';

    const locationKey = norm.includes('rosario') || norm.includes('paraiso')
      ? 'rosario'
      : norm.includes('tunal')
      ? 'tunal'
      : norm.includes('meissen') || norm.includes('boyaca')
      ? 'meissen'
      : norm.includes('torres')
      ? 'torres'
      : 'alpes';

    const locName = (REPORT_LOCATIONS[locationKey] || REPORT_LOCATIONS.alpes).name;
    const typeLabel = REPORT_TYPE_LABELS[type] || 'Novedad';

    return {
      replyText: `🚨 Recibí tu reporte de **${typeLabel.toLowerCase()}** en **${locName}**.\nAcabo de notificar a la comunidad en el mapa y recalculé tu ruta: te recomiendo la **Alternativa por Las Torres**. Te tomará unos 10 min adicionales pero evita el punto conflictivo. Costo total: $5.450 COP.`,
      suggestedRouteId: 'alternate',
      newReport: {
        id: `report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        location: locationKey,
        note: query.slice(0, 140),
        createdAt: new Date().toISOString(),
      },
      source: 'local_agent',
    };
  }

  // 2. Budget / Price questions ("cuánto cuesta", "solo tengo $3000", "barata", "plata")
  if (/\b(precio|precios|cu[aá]nto cuesta|cu[aá]nto vale|costo|tarifa|plata|dinero|econ[oó]mic|barat|3000|2950)\b/.test(norm)) {
    return {
      replyText: `💰 **Comparativa de Tarifas en Ciudad Bolívar:**\n- **Ruta más económica ($2.950 COP):** SITP directo (Ruta 6-18 o H610) con tarjeta TuLlave. Transbordo $0 durante 110 min.\n- **Ruta rápida multimodal ($5.450 COP):** $2.500 campero/colectivo veredal en efectivo + $2.950 TransMiCable.\n*Tip:* Ten a mano monedas o billetes pequeños para el colectivo y saldo en la tarjeta TuLlave.`,
      suggestedRouteId: 'economic',
      source: 'local_agent',
    };
  }

  // 3. Accessibility / Disability / Elderly ("silla de ruedas", "adulto mayor", "abuela", "bebe", "embarazada", "ascensor")
  if (/\b(silla de ruedas|discapacidad|movilidad reducida|abuel|adulto mayor|coche|beb[eé]|embaraz|ascensor|rampa|pmr|escalera)\b/.test(norm)) {
    return {
      replyText: `♿ **Ruta 100% Accesible (PMR):**\nTe recomiendo abordar en la estación **Mirador del Paraíso** y bajar por **TransMiCable** directo al Portal Tunal (19 min, $2.950 COP).\nLas 4 estaciones cuentan con ascensores operativos, rampas niveladas y cabinas al ras del andén. Evita los camperos en trocha si tienes movilidad reducida.`,
      suggestedRouteId: 'accessible',
      source: 'local_agent',
    };
  }

  // 4. Speed / Hurry / Time rush ("rápido", "afán", "tarde", "urgente")
  if (/\b(r[aá]pid|af[aá]n|tarde|urgente|volar|menos tiempo)\b/.test(norm)) {
    const hasActiveBlock = activeReports.some((r) => r.type === 'bloqueo');
    const targetId = hasActiveBlock ? 'alternate' : 'main';
    const r = ROUTES[targetId];

    return {
      replyText: `⚡ **Opción más rápida hacia ${r.destination}:**\n${r.title} (${r.duration}, llegada aprox ${r.arrivalClock}).\nCruza en colectivo veredal a Mirador del Paraíso y toma TransMiCable para volar sobre el trancón de Meissen y la Boyacá. Tarifa: ${r.costFormatted}.`,
      suggestedRouteId: targetId,
      source: 'local_agent',
    };
  }

  // 5. Cable car info ("cable", "transmicable", "cabina", "estaciones")
  if (/\b(cable|transmicable|mirador|manitas|juan pablo)\b/.test(norm)) {
    return {
      replyText: `🚡 **TransMiCable:** Cuenta con 4 estaciones (Portal Tunal, Juan Pablo II, Manitas, Mirador del Paraíso). Recorrido completo en solo 14 minutos por $2.950 COP con tarjeta TuLlave. Opera de lunes a sábado desde las 4:30 a.m. y domingos/festivos desde las 5:30 a.m.`,
      suggestedRouteId: 'accessible',
      source: 'local_agent',
    };
  }

  // 6. Greetings & Gratitude
  if (/\b(hola|buenos d[ií]as|buenas tardes|buenas noches|gracias|qui[eé]n eres)\b/.test(norm)) {
    return {
      replyText: `¡Hola! Soy **Ángel**, tu asistente de movilidad para Ciudad Bolívar. Puedo decirte cuál es tu mejor ruta comparando **TransMiCable, SITP y camperos veredales**, considerando tiempos, costos y reportes comunitarios en vivo. ¿Hacia dónde te diriges hoy?`,
      suggestedRouteId: null,
      source: 'local_agent',
    };
  }

  // 7. General routing query fallback
  const isQuiba = norm.includes('quiba');
  const targetId = isQuiba ? 'quiba' : currentRouteId || 'main';
  const route = ROUTES[targetId] || ROUTES.main;

  return {
    replyText: `Te sugiero **${route.title}** (${route.duration}, llegada aprox ${route.arrivalClock}).\n${route.reason}\n💰 Costo total: **${route.costFormatted}** (${route.paymentMethod}).\n${route.segments.map((s, i) => `${i + 1}. ${s.title} (${s.time} - ${s.cost || ''})`).join('\n')}`,
    suggestedRouteId: targetId,
    source: 'local_agent',
  };
}
