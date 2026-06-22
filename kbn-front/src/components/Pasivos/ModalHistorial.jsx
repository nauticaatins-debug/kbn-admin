import React from 'react';
import { NA, sx } from './PasivosShared';

const ModalHistorial = ({ selectedPasivo, eliminandoMovIds, onDeleteMovimiento, onClose }) => {
  if (!selectedPasivo) return null;

  const historial = [...(selectedPasivo.historialPagos || [])].reverse();

  return (
    <div style={sx.overlay} onClick={onClose}>
      <div style={{ ...sx.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: NA.text, margin: 0 }}>{selectedPasivo.titulo}</h2>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
          </button>
        </div>
        <p style={{ fontSize: 12, color: NA.text2, margin: '0 0 18px' }}>Historial de movimientos</p>

        {/* ── Lista ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', marginBottom: 18 }}>
          {historial.length > 0 ? historial.map((mov) => {
            const monto = parseFloat(mov.montoPagado) || 0;
            const esPositivo = monto > 0;
            const eliminando = eliminandoMovIds.has(mov.id);

            return (
              <div key={mov.id} style={{
                background: '#f9fafb', borderRadius: 12, padding: '12px 14px',
                borderLeft: `3px solid ${esPositivo ? NA.dark : '#B91C1C'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{mov.fecha}</p>
                  <p style={{ fontSize: 13, color: NA.text, margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>{mov.nota}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: esPositivo ? NA.dark : '#B91C1C', whiteSpace: 'nowrap' }}>
                    {esPositivo ? `+${monto.toFixed(2)}` : `-${Math.abs(monto).toFixed(2)}`}
                  </span>
                  <button
                    onClick={() => onDeleteMovimiento(mov)}
                    disabled={eliminando}
                    title="Eliminar este movimiento"
                    style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', color: '#fca5a5', cursor: eliminando ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i
                      className={`ti ${eliminando ? 'ti-loader-2' : 'ti-trash'}`}
                      aria-hidden="true"
                      style={{ fontSize: 14, ...(eliminando ? { animation: 'kbn-spin .7s linear infinite' } : {}) }}
                    />
                  </button>
                </div>
              </div>
            );
          }) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
              Sin movimientos registrados.
            </div>
          )}
        </div>

        <button onClick={onClose}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: NA.darker, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default ModalHistorial;