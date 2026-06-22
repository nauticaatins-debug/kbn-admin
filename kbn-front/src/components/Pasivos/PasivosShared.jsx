// ── PasivosShared.jsx ───────────────────────────────────────────────────────
// Paleta, estilos, helpers y constantes compartidas por todos los
// sub-componentes de Pasivos. No renderiza nada por sí solo.

export const NA = {
  primary: '#1ABFA0',
  dark:    '#0F6E56',
  darker:  '#085041',
  light:   '#E1F5EE',
  mid:     '#9FE1CB',
  bg:      '#f0faf7',
  text:    '#0a2e27',
  text2:   '#3a6b5e',
  border:  '#c5e8df',
};

// ── Estilos reutilizables ───────────────────────────────────────────────────
export const sx = {
  label: { fontSize: 11, color: NA.text2, display: 'block', marginBottom: 5, fontWeight: 500 },
  input: {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    border: `0.5px solid ${NA.border}`, background: '#fff',
    color: NA.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color .15s, box-shadow .15s',
  },
  field: { marginBottom: 14 },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(8,80,65,.45)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440,
    maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box',
  },
};

// ── Focus handlers ──────────────────────────────────────────────────────────
export const focusOn  = (e) => { e.target.style.borderColor = NA.primary; e.target.style.boxShadow = `0 0 0 3px ${NA.light}`; };
export const focusOff = (e) => { e.target.style.borderColor = NA.border;  e.target.style.boxShadow = 'none'; };

// ── Prefix para tarifa de instructor en descripción ─────────────────────────
export const TARIFA_PREFIX = '__tarifa__:';

export const encodeTarifa = (tarifaHora, descripcion) => {
  if (!tarifaHora) return descripcion || '';
  return `${TARIFA_PREFIX}${tarifaHora}||${descripcion || ''}`;
};

export const decodeTarifa = (descripcionRaw) => {
  if (!descripcionRaw || !descripcionRaw.startsWith(TARIFA_PREFIX)) {
    return { tarifaHora: null, descripcion: descripcionRaw || '', esInstructor: false };
  }
  const sin = descripcionRaw.slice(TARIFA_PREFIX.length);
  const sep = sin.indexOf('||');
  const tarifaHora = parseFloat(sin.slice(0, sep));
  const descripcion = sin.slice(sep + 2);
  return { tarifaHora, descripcion, esInstructor: true };
};

// ── Estado visual del saldo ─────────────────────────────────────────────────
export const getEstado = (balance) => {
  if (balance < -0.01) return { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', label: 'Les debemos', icon: 'ti-arrow-up-right' };
  if (balance >  0.01) return { color: NA.dark,   bg: NA.light,  border: NA.mid,    label: 'Nos deben',  icon: 'ti-arrow-down-left' };
  return                       { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: 'Saldado',    icon: 'ti-check' };
};

// ── Config de los 3 tipos de transacción ───────────────────────────────────
export const TX_CONFIG = {
  NUEVA_DEUDA: { title: 'Registrar deuda nueva',   color: '#B91C1C', bg: '#FEF2F2', icon: 'ti-trending-down', showCaja: false },
  PAGO_DEUDA:  { title: 'Registrar pago de deuda', color: '#92400E', bg: '#FFFBEB', icon: 'ti-receipt',       showCaja: true  },
  ADELANTO:    { title: 'Dar adelanto',             color: NA.dark,   bg: NA.light,  icon: 'ti-trending-up',  showCaja: true  },
};

// ── Canales de caja (mismo orden que en Ingreso/Egreso) ────────────────────
// Solo se muestran en PAGO_DEUDA y ADELANTO, ya que son los únicos donde
// sale plata real del pozo. Permite saber de qué caja salió el dinero.
export const MONEDAS_CAJA = [
  { value: 'R$_STONE_JOSE', label: 'R$ Stone José' },
  { value: 'R$_STONE_IGNA', label: 'R$ Stone Igna' },
  { value: 'R$_EFECTIVO',   label: 'R$ Efectivo'   },
  { value: 'USD_EFECTIVO',  label: 'USD Efectivo'  },
  { value: 'USD_MARIANA',   label: 'USD Mariana'   },
  { value: 'EUR_WIZE_IGNA', label: '€ Wize Igna'  },
  { divider: true },
  { value: 'BRL', label: 'Reales (BRL)'         },
  { value: 'USD', label: 'Dólares (USD)'         },
  { value: 'EUR', label: 'Euros (EUR)'           },
  { value: 'ARS', label: 'Pesos (ARS)'           },
];

// ── Componentes atómicos compartidos ───────────────────────────────────────
import React from 'react';

export const Field = ({ label, children }) => (
  <div style={sx.field}>
    <label style={sx.label}>{label}</label>
    {children}
  </div>
);

export const TextInput = (props) => (
  <input {...props} style={{ ...sx.input, ...(props.style || {}) }} onFocus={focusOn} onBlur={focusOff} />
);

export const Select = ({ children, ...props }) => (
  <select {...props} style={{ ...sx.input, cursor: 'pointer', ...(props.style || {}) }} onFocus={focusOn} onBlur={focusOff}>
    {children}
  </select>
);