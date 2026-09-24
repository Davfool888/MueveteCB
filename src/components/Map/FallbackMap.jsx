import React from 'react';

/** SVG schematic map shown when Leaflet is offline */
export default function FallbackMap({ activeRoute, isOnline }) {
  const isAlternate = activeRoute?.id === 'alternate';
  const pathStroke = isAlternate ? '#d89b18' : '#087f68';
  const pathD = activeRoute?.fallbackPath || 'M82 505c50-39 84-75 130-122s61-65 95-99';

  return (
    <div className="fallback-map" id="fallback-map" aria-hidden="true">
      <svg viewBox="0 0 900 560" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="map-grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M44 0H0V44" fill="none" stroke="currentColor" strokeOpacity=".08"/>
          </pattern>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodOpacity=".16"/>
          </filter>
        </defs>
        <rect width="900" height="560" fill="#e9eee8"/>
        <rect width="900" height="560" fill="url(#map-grid)"/>
        <g fill="none" stroke="#cbd8cf" strokeWidth="16" strokeLinecap="round" opacity=".8">
          <path d="M-30 80C160 160 246 98 391 175s229 78 541 5"/>
          <path d="M-10 476c171-94 281-46 383-143s239-74 551-1"/>
          <path d="M250-20c8 132 71 210 45 329s33 188 10 280"/>
          <path d="M680-30c-18 132-83 213-63 338s58 180 26 282"/>
        </g>
        <g fill="none" stroke="#fff" strokeWidth="4" opacity=".95">
          <path d="M-20 303C161 205 250 305 407 256s287-41 523-106"/>
          <path d="M84-20c54 159 176 214 192 359s-46 171-47 241"/>
        </g>
        <path
          id="fallback-cable"
          d="M208 443C316 374 406 325 492 267S662 185 792 113"
          fill="none"
          stroke="#d99b1b"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M101 474c82-68 128-116 173-169s91-50 140-31"
          fill="none"
          stroke="#ef765f"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="10 9"
        />
        <path
          id="fallback-route"
          d={pathD}
          fill="none"
          stroke={pathStroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#soft-shadow)"
        />
        <g fontFamily="Segoe UI, sans-serif" fontSize="15" fontWeight="700" fill="#173d35">
          <g transform="translate(75 485)">
            <circle r="15" fill="#173d35" stroke="#fff" strokeWidth="5"/>
            <text x="0" y="5" fill="#fff" textAnchor="middle" fontSize="13">A</text>
            <text x="24" y="5">Mochuelo Alto</text>
          </g>
          <g transform="translate(765 105)">
            <circle r="15" fill="#087f68" stroke="#fff" strokeWidth="5"/>
            <text x="0" y="5" fill="#fff" textAnchor="middle" fontSize="13">B</text>
            <text x="-20" y="-23" textAnchor="end">Portal Tunal</text>
          </g>
          <text x="340" y="304" fill="#8a5c00">TransMiCable</text>
          <text x="210" y="355" fill="#a93f31">Ruta veredal</text>
        </g>
      </svg>
      <span className="fallback-label">Vista esquemática sin conexión</span>
    </div>
  );
}
