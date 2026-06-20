import React, { useState, useRef } from 'react';

// ── Paleta Náutica Atins (variante rosa/rojo para egresos) ──────────────────
const NA = {
  primary: '#1ABFA0',
  dark: '#0F6E56',
  darker: '#085041',
  light: '#E1F5EE',
  border: '#c5e8df',
  text: '#0a2e27',
  text2: '#3a6b5e',
};

const ROSE = {
  bg: '#fdf2f2',
  border: '#f3d4d4',
  text: '#9f1d1d',
  dark: '#7a1515',
  accent: '#c23a3a',
};

const MONEDAS = [
  { value: 'R$_STONE_JOSE', label: 'R$ Stone José' },
  { value: 'R$_STONE_IGNA', label: 'R$ Stone Igna' },
  { value: 'R$_EFECTIVO', label: 'R$ Efectivo' },
  { value: 'USD_EFECTIVO', label: 'USD Efectivo' },
  { value: 'USD_MARIANA', label: 'USD Mariana' },
  { value: 'EUR_WIZE_IGNA', label: '€ Wize Igna' },
  { divider: true },
  { value: 'USD', label: 'Dólares (USD)' },
  { value: 'BRL', label: 'Reales (BRL)' },
  { value: 'EUR', label: 'Euros (EUR)' },
  { value: 'ARS', label: 'Pesos (ARS)' },
  { value: 'CLP', label: 'Pesos Chilenos (CLP)' },
];

const sx = {
  label: { fontSize: 11, color: NA.text2, display: 'block', marginBottom: 5, fontWeight: 500 },
  input: {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    border: `0.5px solid ${NA.border}`, background: '#fff',
    color: NA.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color .15s, box-shadow .15s',
  },
  field: { marginBottom: 16 },
};

const focusOn = (e) => { e.target.style.borderColor = ROSE.accent; e.target.style.boxShadow = `0 0 0 3px ${ROSE.bg}`; };
const focusOff = (e) => { e.target.style.borderColor = NA.border; e.target.style.boxShadow = 'none'; };

const Field = ({ label, children }) => (
  <div style={sx.field}>
    <label style={sx.label}>{label}</label>
    {children}
  </div>
);

const Egreso = ({ formData, handleChange, handleSubmit, InstructorField, setView }) => {
  const [guardando, setGuardando] = useState(false);
  // Guard síncrono contra doble-tap con mal wifi (ver nota en Ingreso.jsx).
  const enviandoRef = useRef(false);

  const onSubmit = async (e) => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);
    try {
      await handleSubmit(e);
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  const monto = parseFloat(formData.total) || 0;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 4px 60px' }}>
      {/* ── Header de pantalla ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        {setView && (
          <button
            onClick={() => setView()}
            style={{
              width: 36, height: 36, borderRadius: 10, border: `0.5px solid ${NA.border}`,
              background: '#fff', color: NA.text2, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
            aria-label="Volver"
          >
            <i className="ti ti-arrow-left" style={{ fontSize: 17 }} aria-hidden="true" />
          </button>
        )}
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 500, color: NA.text, margin: 0 }}>Nuevo egreso</h1>
          <p style={{ fontSize: 12, color: NA.text2, margin: '2px 0 0' }}>Registrá un gasto o salida de caja</p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <input type="hidden" name="tipoTransaccion" value="EGRESO" />

        {/* ── Card protagonista: el monto ── */}
        <div style={{
          background: ROSE.dark, borderRadius: 16, padding: 24, marginBottom: 16,
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 11, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase',
            letterSpacing: '.08em', margin: '0 0 10px',
          }}>
            Monto a descontar de caja
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 22, color: 'rgba(255,255,255,.45)' }}>$</span>
            <input
              type="number"
              name="total"
              inputMode="decimal"
              value={formData.total}
              onChange={handleChange}
              placeholder="0.00"
              required
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 42, fontWeight: 600, textAlign: 'center',
                width: 220, fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginTop: 18, display: 'inline-block', textAlign: 'left' }}>
            <select
              name="moneda"
              value={formData.moneda}
              onChange={handleChange}
              style={{
                background: 'rgba(255,255,255,.1)', border: '0.5px solid rgba(255,255,255,.2)',
                color: '#fff', borderRadius: 99, padding: '6px 14px', fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {MONEDAS.map((m, i) => m.divider
                ? <option key={`div-${i}`} disabled>──────────</option>
                : <option key={m.value} value={m.value} style={{ color: '#000' }}>{m.label}</option>
              )}
            </select>
          </div>
        </div>

        {/* ── Card: detalle de la operación ── */}
        <div style={{ background: '#fff', borderRadius: 16, border: `0.5px solid ${NA.border}`, padding: 22, marginBottom: 16 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 0 }}>
            <Field label="Fecha">
              <input
                type="date" name="fecha" value={formData.fecha} onChange={handleChange} required
                style={sx.input} onFocus={focusOn} onBlur={focusOff}
              />
            </Field>
            <Field label="Forma de pago">
              <select
                name="formaPago" value={formData.formaPago} onChange={handleChange}
                style={{ ...sx.input, cursor: 'pointer' }} onFocus={focusOn} onBlur={focusOff}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Otro">Otra...</option>
              </select>
            </Field>
          </div>

          {formData.formaPago === 'Otro' && (
            <Field label="Especificar forma de pago">
              <input
                type="text" name="detalleFormaPago" value={formData.detalleFormaPago || ''} onChange={handleChange}
                style={sx.input} onFocus={focusOn} onBlur={focusOff}
              />
            </Field>
          )}

          <Field label="Instructor relacionado (opcional)">
            <InstructorField />
          </Field>

          <Field label="Concepto">
            <textarea
              name="detalles" rows={3} value={formData.detalles || ''} onChange={handleChange}
              placeholder="Ej: Pago de lancha, reparación de kite, etc."
              required
              style={{ ...sx.input, resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={focusOn} onBlur={focusOff}
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={guardando}
          style={{
            width: '100%', padding: '15px', borderRadius: 12, border: 'none',
            background: guardando ? '#e0a3a3' : ROSE.accent, color: '#fff',
            fontSize: 14, fontWeight: 500, cursor: guardando ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background .15s',
          }}
        >
          {guardando ? (
            <>
              <i className="ti ti-loader-2" style={{ fontSize: 17, animation: 'kbn-spin .7s linear infinite' }} aria-hidden="true" />
              Registrando...
            </>
          ) : (
            <>
              <i className="ti ti-minus" style={{ fontSize: 17 }} aria-hidden="true" />
              Registrar egreso{monto > 0 ? ` · ${monto.toFixed(2)}` : ''}
            </>
          )}
        </button>
      </form>

      <style>{`@keyframes kbn-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Egreso;