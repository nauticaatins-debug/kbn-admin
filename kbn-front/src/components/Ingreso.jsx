import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// ── Paleta Náutica Atins ───────────────────────────────────────────────────
const NA = {
  primary: '#1ABFA0',
  dark: '#0F6E56',
  darker: '#085041',
  light: '#E1F5EE',
  mid: '#9FE1CB',
  bg: '#f0faf7',
  text: '#0a2e27',
  text2: '#3a6b5e',
  border: '#c5e8df',
};

const TARIFA_PREFIX = '__tarifa__:';

const decodeTarifa = (descripcionRaw) => {
  if (!descripcionRaw || !descripcionRaw.startsWith(TARIFA_PREFIX)) {
    return { tarifaHora: null, esInstructor: false };
  }
  const sin = descripcionRaw.slice(TARIFA_PREFIX.length);
  const sep = sin.indexOf('||');
  const tarifaHora = parseFloat(sin.slice(0, sep));
  return { tarifaHora, esInstructor: true };
};

const ACTIVIDADES = ['Clase de Kite', 'Clase de Wing', 'Clase de Windsurf', 'Rental', 'Otro'];

const MONEDAS = [
  { value: 'R$_STONE_JOSE', label: 'R$ Stone José' },
  { value: 'R$_STONE_IGNA', label: 'R$ Stone Igna' },
  { value: 'R$_EFECTIVO', label: 'R$ Efectivo' },
  { value: 'USD_EFECTIVO', label: 'USD Efectivo' },
  { value: 'USD_MARIANA', label: 'USD Mariana' },
  { value: 'EUR_WIZE_IGNA', label: '€ Wize Igna' },
  { divider: true },
  { value: 'BRL', label: 'Reales (BRL)' },
  { value: 'USD', label: 'Dólares (USD)' },
  { value: 'EUR', label: 'Euros (EUR)' },
  { value: 'ARS', label: 'Pesos (ARS)' },
  { value: 'CLP', label: 'Pesos Chilenos (CLP)' },
];

const FORMAS_PAGO = ['Efectivo', 'MercadoPago', 'Transferencia', 'Tarjeta de Crédito', 'USD', 'Otro'];

// ── Estilos reutilizables ────────────────────────────────────────────────
const sx = {
  label: { fontSize: 11, color: NA.text2, display: 'block', marginBottom: 5, fontWeight: 500 },
  input: {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    border: `0.5px solid ${NA.border}`, background: '#fff',
    color: NA.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color .15s, box-shadow .15s',
  },
  field: { marginBottom: 16 },
  row: { display: 'grid', gap: 14 },
};

const Field = ({ label, children }) => (
  <div style={sx.field}>
    <label style={sx.label}>{label}</label>
    {children}
  </div>
);

const focusOn = (e) => { e.target.style.borderColor = NA.primary; e.target.style.boxShadow = `0 0 0 3px ${NA.light}`; };
const focusOff = (e) => { e.target.style.borderColor = NA.border; e.target.style.boxShadow = 'none'; };

const TextInput = (props) => (
  <input {...props} style={{ ...sx.input, ...(props.style || {}) }} onFocus={focusOn} onBlur={focusOff} />
);

const Select = ({ children, ...props }) => (
  <select {...props} style={{ ...sx.input, cursor: 'pointer', ...(props.style || {}) }} onFocus={focusOn} onBlur={focusOff}>
    {children}
  </select>
);

const Ingreso = ({ formData, handleChange, handleSubmit: originalHandleSubmit, InstructorField, setView, axiosConfig }) => {
  const [pasivos, setPasivos] = useState([]);
  const [pasivoVinculado, setPasivoVinculado] = useState(null);
  const [deudaCalculada, setDeudaCalculada] = useState(0);
  const [guardando, setGuardando] = useState(false);
  // Guard síncrono: en mobile con mal wifi, un doble-tap puede disparar
  // dos eventos submit antes de que React re-renderice el botón como
  // disabled. useRef cambia al instante, sin esperar al re-render.
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (!axiosConfig) return;
    axios.get('https://kbn-admin-production.up.railway.app/api/pasivos', axiosConfig)
      .then((res) => setPasivos(res.data))
      .catch((err) => console.error('Error cargando pasivos:', err));
  }, [axiosConfig]);

  useEffect(() => {
    if (!formData.instructor || pasivos.length === 0) {
      setPasivoVinculado(null);
      setDeudaCalculada(0);
      return;
    }
    const match = pasivos.find((p) => {
      const { esInstructor } = decodeTarifa(p.descripcion);
      const tituloNorm = p.titulo.toLowerCase().replace(/\s+/g, ' ').trim();
      const instructorNorm = formData.instructor.toLowerCase().replace(/\s+/g, ' ').trim();
      return esInstructor && tituloNorm === instructorNorm;
    });
    if (match) {
      const { tarifaHora } = decodeTarifa(match.descripcion);
      const horas = parseFloat(formData.horas) || 0;
      setPasivoVinculado(match);
      setDeudaCalculada(Math.round(tarifaHora * horas * 100) / 100);
    } else {
      setPasivoVinculado(null);
      setDeudaCalculada(0);
    }
  }, [formData.instructor, formData.horas, pasivos]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Si ya hay un envío en curso, ignoramos cualquier toque/click extra
    // (doble-tap, doble-click, Enter repetido) hasta que termine.
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);

    try {
      await originalHandleSubmit(e);

      const actividad = formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad;

      if (pasivoVinculado && deudaCalculada > 0 && axiosConfig) {
        try {
          const { tarifaHora } = decodeTarifa(pasivoVinculado.descripcion);
          const horas = parseFloat(formData.horas) || 0;
          const detalles = formData.detalles ? ` — ${formData.detalles}` : '';
          const nota = `Pago por ${horas}h de ${actividad}${detalles} · ${horas}h × ${tarifaHora} BRL/h = ${deudaCalculada.toFixed(2)} BRL`;
          // Acumula la deuda en la tarjeta del instructor SIN generar un movimiento
          // de caja (no es plata que salió, es deuda interna acumulada).
          await axios.put(
            `https://kbn-admin-production.up.railway.app/api/pasivos/${pasivoVinculado.id}/acumular`,
            {
              monto: -deudaCalculada,
              nota,
              fecha: formData.fecha,
            },
            axiosConfig
          );
        } catch (err) {
          console.error('Error al acumular deuda instructor:', err);
          alert(`El ingreso se guardó, pero no se pudo acumular a ${pasivoVinculado.titulo}. Revisá en Cuentas Corrientes.`);
        }
      }
    } finally {
      // finally asegura que el botón se reactive incluso si algo falla,
      // así nunca queda "trabado" en estado Guardando para siempre.
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  const tarifaInstructor = pasivoVinculado ? decodeTarifa(pasivoVinculado.descripcion).tarifaHora : null;
  const horasIngresadas = parseFloat(formData.horas) > 0;
  const total = parseFloat(formData.total) || 0;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 4px 60px' }}>
      {/* ── Header de pantalla ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => setView()}
          style={{
            width: 36, height: 36, borderRadius: 10, border: `0.5px solid ${NA.border}`,
            background: '#fff', color: NA.text2, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}
          aria-label="Volver a agenda"
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 17 }} aria-hidden="true" />
        </button>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 500, color: NA.text, margin: 0 }}>Nuevo ingreso</h1>
          <p style={{ fontSize: 12, color: NA.text2, margin: '2px 0 0' }}>Registrá una clase, rental u otro cobro</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Card principal: datos de la operación ── */}
        <div style={{ background: '#fff', borderRadius: 16, border: `0.5px solid ${NA.border}`, padding: 22, marginBottom: 16 }}>

          <Field label="Instructor responsable">
            <InstructorField />
          </Field>

          {/* ── Estado de vínculo con cuenta corriente ── */}
          {pasivoVinculado ? (
            <div style={{
              background: NA.light, borderRadius: 12, padding: '12px 14px', marginBottom: 16,
              display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <i className="ti ti-link" style={{ fontSize: 17, color: NA.dark, marginTop: 1 }} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: NA.darker, margin: 0 }}>
                  {pasivoVinculado.titulo} <span style={{ color: NA.text2, fontWeight: 400 }}>· {tarifaInstructor} BRL/h</span>
                </p>
                {horasIngresadas ? (
                  <p style={{ fontSize: 13, color: NA.dark, margin: '4px 0 0' }}>
                    Se sumarán <strong>{deudaCalculada.toFixed(2)} BRL</strong> a su cuenta corriente al guardar
                  </p>
                ) : (
                  <p style={{ fontSize: 12, color: '#92400E', margin: '4px 0 0' }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: 13, marginRight: 4 }} aria-hidden="true" />
                    Cargá las horas para calcular el monto
                  </p>
                )}
              </div>
            </div>
          ) : (
            formData.instructor && formData.instructor !== 'Secretaria' && (
              <div style={{
                background: '#f9fafb', borderRadius: 12, padding: '10px 14px', marginBottom: 16,
                fontSize: 12, color: '#9ca3af', display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <i className="ti ti-info-circle" style={{ fontSize: 15, marginTop: 1 }} aria-hidden="true" />
                <span>{formData.instructor} no tiene cuenta corriente vinculada. Se puede crear desde Cuentas Corrientes.</span>
              </div>
            )
          )}

          <div style={{ ...sx.row, gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Fecha">
              <TextInput type="date" name="fecha" value={formData.fecha} onChange={handleChange} required />
            </Field>
            <Field label="Actividad">
              <Select name="actividad" value={formData.actividad} onChange={handleChange} required>
                <option value="">Seleccionar...</option>
                {ACTIVIDADES.map((a) => <option key={a} value={a}>{a === 'Otro' ? 'Otra...' : a}</option>)}
              </Select>
            </Field>
          </div>

          {formData.actividad === 'Otro' && (
            <Field label="Especificar actividad">
              <TextInput type="text" name="actividadOtro" value={formData.actividadOtro || ''} onChange={handleChange} placeholder="Ej: Aula teórica" />
            </Field>
          )}

          <Field label="Vendedor (opcional)">
            <TextInput type="text" name="vendedor" value={formData.vendedor || ''} onChange={handleChange} />
          </Field>

          <Field label="Detalles">
            <textarea
              name="detalles" rows={2} value={formData.detalles || ''} onChange={handleChange}
              placeholder="Ej: Clase a José"
              style={{ ...sx.input, resize: 'vertical', fontFamily: 'inherit' }}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </Field>
        </div>

        {/* ── Card: cálculo del cobro ── */}
        <div style={{ background: NA.darker, borderRadius: 16, padding: 22, marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 14px' }}>
            Cálculo del cobro
          </p>

          <div style={{ ...sx.row, gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 4 }}>
            <Field label={<span style={{ color: 'rgba(255,255,255,.6)' }}>Horas</span>}>
              <input
                type="number" step="0.5" name="horas" inputMode="decimal" value={formData.horas} onChange={handleChange}
                style={{ ...sx.input, background: 'rgba(255,255,255,.08)', border: '0.5px solid rgba(255,255,255,.15)', color: '#fff' }}
              />
            </Field>
            <Field label={<span style={{ color: 'rgba(255,255,255,.6)' }}>Tarifa ($/h)</span>}>
              <input
                type="number" name="tarifa" inputMode="decimal" value={formData.tarifa} onChange={handleChange}
                style={{ ...sx.input, background: 'rgba(255,255,255,.08)', border: '0.5px solid rgba(255,255,255,.15)', color: '#fff' }}
              />
            </Field>
            <div>
              <label style={{ ...sx.label, color: 'rgba(255,255,255,.6)' }}>Total</label>
              <div style={{
                padding: '11px 13px', borderRadius: 10, background: NA.primary, color: NA.darker,
                fontSize: 16, fontWeight: 600, textAlign: 'right',
              }}>
                {total.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ ...sx.row, gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 16, marginBottom: 0 }}>
            <Field label={<span style={{ color: 'rgba(255,255,255,.6)' }}>Moneda</span>}>
              <select
                name="moneda" value={formData.moneda} onChange={handleChange}
                style={{ ...sx.input, background: 'rgba(255,255,255,.08)', border: '0.5px solid rgba(255,255,255,.15)', color: '#fff', cursor: 'pointer' }}
              >
                {MONEDAS.map((m, i) => m.divider
                  ? <option key={`div-${i}`} disabled>──────────</option>
                  : <option key={m.value} value={m.value}>{m.label}</option>
                )}
              </select>
            </Field>
            <Field label={<span style={{ color: 'rgba(255,255,255,.6)' }}>Gastos</span>}>
              <input
                type="number" name="gastos" inputMode="decimal" value={formData.gastos} onChange={handleChange}
                style={{ ...sx.input, background: 'rgba(255,255,255,.08)', border: '0.5px solid rgba(255,255,255,.15)', color: '#fff' }}
              />
            </Field>
            <Field label={<span style={{ color: 'rgba(255,255,255,.6)' }}>Comisión</span>}>
              <input
                type="number" name="comision" inputMode="decimal" value={formData.comision} onChange={handleChange}
                style={{ ...sx.input, background: 'rgba(255,255,255,.08)', border: '0.5px solid rgba(255,255,255,.15)', color: '#fff' }}
              />
            </Field>
          </div>
        </div>

        {/* ── Card: forma de pago ── */}
        <div style={{ background: '#fff', borderRadius: 16, border: `0.5px solid ${NA.border}`, padding: 22, marginBottom: 16 }}>
          <Field label="Forma de pago">
            <Select name="formaPago" value={formData.formaPago} onChange={handleChange}>
              {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f === 'Otro' ? 'Otra...' : f}</option>)}
            </Select>
          </Field>
          {formData.formaPago === 'Otro' && (
            <Field label="Especificar forma de pago">
              <TextInput type="text" name="formaPagoOtro" value={formData.formaPagoOtro || ''} onChange={handleChange} />
            </Field>
          )}
        </div>

        {/* ── Resumen final antes de guardar ── */}
        {pasivoVinculado && deudaCalculada > 0 && (
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            background: NA.light, borderRadius: 12, padding: '12px 14px', marginBottom: 16,
          }}>
            <i className="ti ti-circle-check" style={{ fontSize: 17, color: NA.dark, marginTop: 1 }} aria-hidden="true" />
            <p style={{ fontSize: 13, color: NA.darker, margin: 0, lineHeight: 1.5 }}>
              Se registra el ingreso y se suma <strong>{deudaCalculada.toFixed(2)} BRL</strong> al historial de <strong>{pasivoVinculado.titulo}</strong> en Cuentas Corrientes.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={guardando}
          style={{
            width: '100%', padding: '15px', borderRadius: 12, border: 'none',
            background: guardando ? NA.mid : NA.dark, color: '#fff',
            fontSize: 14, fontWeight: 500, cursor: guardando ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background .15s',
          }}
        >
          {guardando ? (
            <>
              <i className="ti ti-loader-2" style={{ fontSize: 17, animation: 'kbn-spin .7s linear infinite' }} aria-hidden="true" />
              Guardando...
            </>
          ) : (
            <>
              <i className="ti ti-check" style={{ fontSize: 17 }} aria-hidden="true" />
              Guardar ingreso
            </>
          )}
        </button>
      </form>

      <style>{`@keyframes kbn-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Ingreso;