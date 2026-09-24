// Opciones de transporte reutilizables para el flujo de registro de Muévete CB

export const PASSENGER_TRANSPORT_OPTIONS = [
  { id: 'transmilenio', label: 'TransMilenio', icon: '🔴', description: 'Troncal y alimentadores' },
  { id: 'transmicable', label: 'TransMiCable', icon: '🚡', description: 'Sistema de cable aéreo' },
  { id: 'sitp', label: 'SITP', icon: '🔵', description: 'Buses zonales y urbanos' },
  { id: 'colectivo', label: 'Colectivo / Campero', icon: '🚐', description: 'Transporte veredal y tradicional' },
  { id: 'motocicleta', label: 'Motocicleta', icon: '🏍️', description: 'Desplazamiento en moto' },
  { id: 'bicicleta', label: 'Bicicleta', icon: '🚲', description: 'Bicicleta convencional o asistida' },
  { id: 'caminando', label: 'Caminando', icon: '🚶', description: 'Peatonal / a pie' },
  { id: 'otro', label: 'Otro', icon: '🔄', description: 'Otros modos combinados' },
];

export const DRIVER_TRANSPORT_OPTIONS = [
  { id: 'colectivo', label: 'Colectivo / Campero', icon: '🚐', description: 'Servicio colectivo o campero veredal' },
  { id: 'sitp', label: 'SITP', icon: '🔵', description: 'Operador de transporte zonal' },
  { id: 'transmicable', label: 'TransMiCable', icon: '🚡', description: 'Operador del sistema de cable' },
  { id: 'motocicleta', label: 'Motocicleta', icon: '🏍️', description: 'Transporte auxiliar / domiciliario' },
  { id: 'otro', label: 'Otro', icon: '🔄', description: 'Otro tipo de servicio o vehículo' },
];
