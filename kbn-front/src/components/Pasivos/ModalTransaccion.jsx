import React from 'react';
import { NA, sx, focusOn, focusOff, TX_CONFIG, MONEDAS_CAJA, Field, TextInput, Select } from './PasivosShared';

// ── ModalTransaccion ────────────────────────────────────────────────────────
// NUEVA_DEUDA: solo acumula deuda interna, no sale plata → sin selector de caja.
// PAGO_DEUDA / ADELANTO: sale plata real de la caja → muestra selector de canal
// (Stone José, Stone Igna, Wize Igna, Efectivo, etc.) igual que en Egreso.jsx,
// para que quede registrado de qué pozo salió el dinero.

const ModalTransaccion = ({ transactionType, selectedPasivo, transactionData, setTransactionData, onSubmit, onClose, guardando }) => {
  const cfg = TX_CONFIG[transactionType];
  if (!cfg || !selectedPasivo) return null;

  return (
    <div style={sx.overlay} onClick={onClose}>
      <div style={{ ...sx.modal, borderTop: `4px solid ${cfg.color}` }} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <i className={`ti ${cfg.icon}`} style={{ fontSize: 22 }} aria-hidden="true" />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 500, color: cfg.color, margin: 0 }}>{cfg.title}</h2>
          <p style={{ fontSize: 12, color: NA.text2, margin: '4px 0 0' }}>{selectedPasivo.titulo}</p>
        </div>

        <form onSubmit={onSubmit}>
          {/* ── Monto ── */}
          <Field label="Monto">
            <input
              type="number" step="0.01" placeholder="0.00"
              value={transactionData.monto}
              onChange={(e) => setTransactionData({ ...transactionData, monto: e.target.value })}
              required
              style={{ ...sx.input, fontSize: 18, fontWeight: 600 }}
              onFocus={focusOn} onBlur={focusOff}
            />
          </Field>

          {/* ── Canal de caja (solo cuando sale plata real) ── */}
          {cfg.showCaja && (
            <Field label="Caja de origen — ¿de dónde sale el dinero?">
              <select
                value={transactionData.cajaSalida}
                onChange={(e) => setTransactionData({ ...transactionData, cajaSalida: e.target.value })}
                required
                style={{ ...sx.input, cursor: 'pointer' }}
                onFocus={focusOn} onBlur={focusOff}
              >
                <option value="">Seleccionar caja...</option>
                {MONEDAS_CAJA.map((m, i) =>
                  m.divider
                    ? <option key={`div-${i}`} disabled>──────────</option>
                    : <option key={m.value} value={m.value}>{m.label}</option>
                )}
              </select>
              <p style={{ fontSize: 11, color: NA.text2, margin: '5px 0 0' }}>
                Se va a registrar como egreso en esa caja para que el pozo quede cuadrado.
              </p>
            </Field>
          )}

          {/* ── Fecha ── */}
          <Field label="Fecha">
            <TextInput
              type="date"
              value={transactionData.fecha}
              onChange={(e) => setTransactionData({ ...transactionData, fecha: e.target.value })}
            />
          </Field>

          {/* ── Concepto ── */}
          <Field label="Concepto">
            <TextInput
              type="text" placeholder="Ej: Pago de clases enero"
              value={transactionData.detalles}
              onChange={(e) => setTransactionData({ ...transactionData, detalles: e.target.value })}
              required
            />
          </Field>

          {/* ── Advertencia para NUEVA_DEUDA ── */}
          {transactionType === 'NUEVA_DEUDA' && (
            <div style={{ background: '#FEF2F2', color: '#B91C1C', fontSize: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 14 }}>
              Esta operación registra una deuda interna. No sale plata de ninguna caja.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: guardando ? '#d1d5db' : cfg.color, color: '#fff', fontSize: 13, fontWeight: 500, cursor: guardando ? 'default' : 'pointer' }}>
              {guardando ? 'Confirmando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalTransaccion;