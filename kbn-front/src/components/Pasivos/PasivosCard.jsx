import React from 'react';
import { NA, getEstado, decodeTarifa } from './PasivosShared';

const PasivosCard = ({ p, onTransaction, onHistory, onEdit, onDelete }) => {
  const balance = parseFloat(p.montoTotal) || 0;
  const estado  = getEstado(balance);
  const decoded = decodeTarifa(p.descripcion);

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: `0.5px solid ${NA.border}`,
      borderTop: `3px solid ${estado.color}`, padding: 20, display: 'flex', flexDirection: 'column',
    }}>
      {/* ── Badges + acciones ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 500,
            padding: '3px 10px', borderRadius: 99, background: estado.bg, color: estado.color,
            textTransform: 'uppercase', letterSpacing: '.04em', width: 'fit-content',
          }}>
            <i className={`ti ${estado.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
            {estado.label}
          </span>
          {decoded.esInstructor && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 500,
              padding: '3px 10px', borderRadius: 99, background: '#EEF2FF', color: '#4338CA', width: 'fit-content',
            }}>
              <i className="ti ti-school" style={{ fontSize: 12 }} aria-hidden="true" />
              {decoded.tarifaHora} BRL/h
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={() => onEdit(p)} aria-label="Editar"
            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-edit" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
          <button onClick={() => onDelete(p.id)} aria-label="Eliminar"
            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-trash" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Nombre y descripción ── */}
      <h3 style={{ fontSize: 16, fontWeight: 500, color: NA.text, margin: '0 0 2px' }}>{p.titulo}</h3>
      <p style={{ fontSize: 12, color: NA.text2, margin: '0 0 14px', minHeight: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {decoded.descripcion || '—'}
      </p>

      {/* ── Saldo ── */}
      <div style={{ background: estado.bg, borderRadius: 12, padding: '14px', textAlign: 'center', marginBottom: 16 }}>
        <span style={{ display: 'block', fontSize: 10, color: NA.text2, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Saldo actual</span>
        <span style={{ fontSize: 24, fontWeight: 600, color: estado.color }}>
          {p.moneda} {Math.abs(balance).toFixed(2)}
        </span>
      </div>

      {/* ── Botones de transacción ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
        {[
          { type: 'NUEVA_DEUDA', label: 'Deuda',   icon: 'ti-trending-down', color: '#B91C1C', bg: '#FEF2F2' },
          { type: 'PAGO_DEUDA',  label: 'Pagar',   icon: 'ti-receipt',       color: '#92400E', bg: '#FFFBEB' },
          { type: 'ADELANTO',    label: 'Adelanto', icon: 'ti-trending-up',   color: NA.dark,   bg: NA.light  },
        ].map((b) => (
          <button key={b.type} onClick={() => onTransaction(b.type, p)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '8px 4px', borderRadius: 9, border: 'none', background: b.bg, color: b.color,
              fontSize: 10, fontWeight: 500, cursor: 'pointer',
            }}>
            <i className={`ti ${b.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
            {b.label}
          </button>
        ))}
      </div>

      {/* ── Ver historial ── */}
      <button onClick={() => onHistory(p)}
        style={{ width: '100%', padding: '9px', borderRadius: 9, border: `0.5px solid ${NA.border}`, background: 'transparent', color: NA.text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <i className="ti ti-history" style={{ fontSize: 14 }} aria-hidden="true" />
        Ver historial
      </button>
    </div>
  );
};

export default PasivosCard;