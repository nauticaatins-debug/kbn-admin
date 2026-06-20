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

const encodeTarifa = (tarifaHora, descripcion) => {
  if (!tarifaHora) return descripcion || '';
  return `${TARIFA_PREFIX}${tarifaHora}||${descripcion || ''}`;
};

const decodeTarifa = (descripcionRaw) => {
  if (!descripcionRaw || !descripcionRaw.startsWith(TARIFA_PREFIX)) {
    return { tarifaHora: null, descripcion: descripcionRaw || '', esInstructor: false };
  }
  const sin = descripcionRaw.slice(TARIFA_PREFIX.length);
  const sep = sin.indexOf('||');
  const tarifaHora = parseFloat(sin.slice(0, sep));
  const descripcion = sin.slice(sep + 2);
  return { tarifaHora, descripcion, esInstructor: true };
};

// ── Estilos reutilizables ───────────────────────────────────────────────
const sx = {
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

const focusOn = (e) => { e.target.style.borderColor = NA.primary; e.target.style.boxShadow = `0 0 0 3px ${NA.light}`; };
const focusOff = (e) => { e.target.style.borderColor = NA.border; e.target.style.boxShadow = 'none'; };

const Field = ({ label, children }) => (
  <div style={sx.field}>
    <label style={sx.label}>{label}</label>
    {children}
  </div>
);

const TextInput = (props) => <input {...props} style={{ ...sx.input, ...(props.style || {}) }} onFocus={focusOn} onBlur={focusOff} />;
const Select = ({ children, ...props }) => (
  <select {...props} style={{ ...sx.input, cursor: 'pointer', ...(props.style || {}) }} onFocus={focusOn} onBlur={focusOff}>{children}</select>
);

// ── Estado del saldo: color + ícono + etiqueta ───────────────────────────
const getEstado = (balance) => {
  if (balance < -0.01) return { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', label: 'Les debemos', icon: 'ti-arrow-up-right' };
  if (balance > 0.01) return { color: NA.dark, bg: NA.light, border: NA.mid, label: 'Nos deben', icon: 'ti-arrow-down-left' };
  return { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: 'Saldado', icon: 'ti-check' };
};

const TX_CONFIG = {
  NUEVA_DEUDA: { title: 'Registrar deuda nueva', color: '#B91C1C', bg: '#FEF2F2', icon: 'ti-trending-down', showFormaPago: false },
  PAGO_DEUDA: { title: 'Registrar pago de deuda', color: '#92400E', bg: '#FFFBEB', icon: 'ti-receipt', showFormaPago: true },
  ADELANTO: { title: 'Dar adelanto', color: NA.dark, bg: NA.light, icon: 'ti-trending-up', showFormaPago: true },
};

const Pasivos = ({ axiosConfig, setView }) => {
  const [pasivos, setPasivos] = useState([]);
  const [selectedPasivo, setSelectedPasivo] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [transactionType, setTransactionType] = useState('PAGO_DEUDA');
  const [guardando, setGuardando] = useState(false);
  // Guard síncrono contra doble-tap al eliminar un movimiento del historial.
  const eliminandoMovRef = useRef(new Set());
  const [eliminandoMovIds, setEliminandoMovIds] = useState(new Set());

  const today = new Date().toISOString().split('T')[0];

  const initialPasivoForm = {
    titulo: '', descripcion: '', tarifaHora: '', esInstructor: false,
    montoInicial: '', moneda: 'BRL', fecha: today, tipoRegistro: 'DEUDA',
  };
  const [newPasivo, setNewPasivo] = useState(initialPasivoForm);
  const [editPasivo, setEditPasivo] = useState({});
  const [editDecoded, setEditDecoded] = useState({ tarifaHora: '', descripcion: '', esInstructor: false });

  const initialTransactionForm = { monto: '', fecha: today, formaPago: 'Efectivo', detalles: '' };
  const [transactionData, setTransactionData] = useState(initialTransactionForm);

  useEffect(() => { fetchPasivos(); }, []);

  const fetchPasivos = async () => {
    try {
      const res = await axios.get('https://kbn-admin-production.up.railway.app/api/pasivos', axiosConfig);
      setPasivos(res.data);
    } catch (err) {
      console.error('Error al cargar pasivos', err);
    }
  };

  const getBalance = (pasivo) => parseFloat(pasivo.montoTotal) || 0;

  // ─── CREAR ────────────────────────────────────────────────────
  const handleCreatePasivo = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const monto = parseFloat(newPasivo.montoInicial) || 0;
      const esAdelanto = newPasivo.tipoRegistro === 'ADELANTO';
      const descripcionEncoded = newPasivo.esInstructor
        ? encodeTarifa(newPasivo.tarifaHora, newPasivo.descripcion)
        : newPasivo.descripcion;

      const pasivoRes = await axios.post(
        'https://kbn-admin-production.up.railway.app/api/pasivos',
        {
          titulo: newPasivo.titulo,
          descripcion: descripcionEncoded,
          moneda: newPasivo.moneda,
          fecha: newPasivo.fecha,
          montoTotal: esAdelanto ? 0 : -Math.abs(monto),
          historialPagos: [],
        },
        axiosConfig
      );

      if (esAdelanto && monto > 0) {
        await axios.post(
          'https://kbn-admin-production.up.railway.app/api/clases/guardar',
          {
            tipoTransaccion: 'EGRESO',
            tipoMovimientoPasivo: 'ADELANTO',
            pasivoId: pasivoRes.data.id,
            total: String(Math.abs(monto)),
            fecha: newPasivo.fecha,
            moneda: newPasivo.moneda,
            formaPago: 'Efectivo',
            detalles: `Adelanto inicial: ${newPasivo.titulo}`,
            actividad: 'Pago Pasivo',
            instructor: 'Secretaria',
          },
          axiosConfig
        );
      }

      setShowCreateModal(false);
      setNewPasivo(initialPasivoForm);
      setTimeout(fetchPasivos, 1000);
    } catch (err) {
      console.error(err);
      alert('Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  // ─── TRANSACCIÓN ──────────────────────────────────────────────
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const monto = parseFloat(transactionData.monto);
      const nota = transactionData.detalles || `${
        transactionType === 'NUEVA_DEUDA' ? 'Nueva deuda'
        : transactionType === 'ADELANTO' ? 'Adelanto'
        : 'Pago'
      }: ${selectedPasivo.titulo}`;

      if (transactionType === 'NUEVA_DEUDA') {
        // Solo registra deuda interna: NO sale plata de caja, así que no
        // genera un movimiento en clases_registros (no aparece en Egresos).
        await axios.put(
          `https://kbn-admin-production.up.railway.app/api/pasivos/${selectedPasivo.id}/acumular`,
          {
            monto: -Math.abs(monto),
            nota,
            fecha: transactionData.fecha,
          },
          axiosConfig
        );
      } else {
        // PAGO_DEUDA / ADELANTO: acá sí sale plata real de la caja, por eso
        // queda registrado como EGRESO en clases_registros (visible en Reportes).
        const payload = {
          tipoTransaccion: 'EGRESO',
          tipoMovimientoPasivo: transactionType,
          pasivoId: selectedPasivo.id,
          total: String(Math.abs(monto)),
          fecha: transactionData.fecha,
          moneda: selectedPasivo.moneda,
          formaPago: transactionData.formaPago || 'Efectivo',
          detalles: nota,
          actividad: 'Pago Pasivo',
          instructor: 'Secretaria',
        };
        await axios.post('https://kbn-admin-production.up.railway.app/api/clases/guardar', payload, axiosConfig);
      }

      setShowTransactionModal(false);
      setTransactionData(initialTransactionForm);
      setTimeout(() => { fetchPasivos(); }, 800);
    } catch (err) {
      console.error(err);
      alert('Error en la transacción.');
    } finally {
      setGuardando(false);
    }
  };

  // ─── EDITAR ───────────────────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const descripcionEncoded = editDecoded.esInstructor
        ? encodeTarifa(editDecoded.tarifaHora, editDecoded.descripcion)
        : editDecoded.descripcion;

      await axios.put(
        `https://kbn-admin-production.up.railway.app/api/pasivos/${editPasivo.id}`,
        { ...editPasivo, descripcion: descripcionEncoded },
        axiosConfig
      );
      setShowEditModal(false);
      fetchPasivos();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar.');
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta cuenta corriente? Esta acción no se puede deshacer.')) return;
    try {
      await axios.delete(`https://kbn-admin-production.up.railway.app/api/pasivos/${id}`, axiosConfig);
      fetchPasivos();
    } catch (err) {
      alert('Error al eliminar.');
    }
  };

  // ─── ELIMINAR UN MOVIMIENTO PUNTUAL DEL HISTORIAL ──────────────
  // Resta del saldo exactamente lo que ese movimiento había sumado.
  // Útil para corregir cargas duplicadas (ej: la misma clase acumulada
  // dos veces por mal wifi).
  const handleDeleteMovimiento = async (mov) => {
    if (!selectedPasivo) return;
    if (!window.confirm(`¿Eliminar este movimiento? Esto va a restar ${mov.montoPagado > 0 ? '' : '-'}${Math.abs(mov.montoPagado).toFixed(2)} del saldo de ${selectedPasivo.titulo}.`)) return;

    if (eliminandoMovRef.current.has(mov.id)) return;
    eliminandoMovRef.current.add(mov.id);
    setEliminandoMovIds(new Set(eliminandoMovRef.current));

    try {
      const res = await axios.delete(
        `https://kbn-admin-production.up.railway.app/api/pasivos/${selectedPasivo.id}/historial/${mov.id}`,
        axiosConfig
      );
      // Actualiza la tarjeta seleccionada en el modal con el saldo nuevo
      setSelectedPasivo(res.data);
      fetchPasivos();
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar el movimiento.');
    } finally {
      eliminandoMovRef.current.delete(mov.id);
      setEliminandoMovIds(new Set(eliminandoMovRef.current));
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 4px 60px' }}>
      <style>{`@keyframes kbn-spin { to { transform:rotate(360deg) } }`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {setView && (
            <button
              onClick={() => setView('INICIO')}
              style={{ width: 36, height: 36, borderRadius: 10, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              aria-label="Volver"
            >
              <i className="ti ti-arrow-left" style={{ fontSize: 17 }} aria-hidden="true" />
            </button>
          )}
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 500, color: NA.text, margin: 0 }}>Cuentas corrientes</h1>
            <p style={{ fontSize: 12, color: NA.text2, margin: '2px 0 0' }}>Deudas, adelantos e instructores</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: NA.dark, color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
          Nueva cuenta
        </button>
      </div>

      {/* ── Leyenda ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { color: '#B91C1C', bg: '#FEF2F2', label: 'Les debemos' },
          { color: NA.dark, bg: NA.light, label: 'Nos deben' },
          { color: '#6b7280', bg: '#f9fafb', label: 'Saldado' },
        ].map((l) => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: l.bg, color: l.color, fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 99 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} />
            {l.label}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EEF2FF', color: '#4338CA', fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 99 }}>
          <i className="ti ti-school" style={{ fontSize: 13 }} aria-hidden="true" />
          Instructor = tarifa automática
        </span>
      </div>

      {/* ── Grid de tarjetas ── */}
      {pasivos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: NA.text2, background: '#fff', borderRadius: 16, border: `0.5px solid ${NA.border}` }}>
          <i className="ti ti-wallet-off" style={{ fontSize: 32, opacity: 0.4 }} aria-hidden="true" />
          <p style={{ fontSize: 14, margin: '10px 0 0' }}>Todavía no hay cuentas corrientes creadas.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {pasivos.map((p) => {
            const balance = getBalance(p);
            const estado = getEstado(balance);
            const decoded = decodeTarifa(p.descripcion);
            return (
              <div key={p.id} style={{
                background: '#fff', borderRadius: 16, border: `0.5px solid ${NA.border}`,
                borderTop: `3px solid ${estado.color}`, padding: 20, display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: estado.bg, color: estado.color, textTransform: 'uppercase', letterSpacing: '.04em', width: 'fit-content' }}>
                      <i className={`ti ${estado.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
                      {estado.label}
                    </span>
                    {decoded.esInstructor && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: '#EEF2FF', color: '#4338CA', width: 'fit-content' }}>
                        <i className="ti ti-school" style={{ fontSize: 12 }} aria-hidden="true" />
                        {decoded.tarifaHora} BRL/h
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      onClick={() => { setEditPasivo(p); setEditDecoded(decodeTarifa(p.descripcion)); setShowEditModal(true); }}
                      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      aria-label="Editar"
                    >
                      <i className="ti ti-edit" style={{ fontSize: 16 }} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      aria-label="Eliminar"
                    >
                      <i className="ti ti-trash" style={{ fontSize: 16 }} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 500, color: NA.text, margin: '0 0 2px' }}>{p.titulo}</h3>
                <p style={{ fontSize: 12, color: NA.text2, margin: '0 0 14px', minHeight: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {decoded.descripcion || '—'}
                </p>

                <div style={{ background: estado.bg, borderRadius: 12, padding: '14px', textAlign: 'center', marginBottom: 16 }}>
                  <span style={{ display: 'block', fontSize: 10, color: NA.text2, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Saldo actual</span>
                  <span style={{ fontSize: 24, fontWeight: 600, color: estado.color }}>
                    {p.moneda} {Math.abs(balance).toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                  {[
                    { type: 'NUEVA_DEUDA', label: 'Deuda', icon: 'ti-trending-down', color: '#B91C1C', bg: '#FEF2F2' },
                    { type: 'PAGO_DEUDA', label: 'Pagar', icon: 'ti-receipt', color: '#92400E', bg: '#FFFBEB' },
                    { type: 'ADELANTO', label: 'Adelanto', icon: 'ti-trending-up', color: NA.dark, bg: NA.light },
                  ].map((b) => (
                    <button
                      key={b.type}
                      onClick={() => { setTransactionType(b.type); setSelectedPasivo(p); setTransactionData(initialTransactionForm); setShowTransactionModal(true); }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        padding: '8px 4px', borderRadius: 9, border: 'none', background: b.bg, color: b.color,
                        fontSize: 10, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      <i className={`ti ${b.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
                      {b.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setSelectedPasivo(p); setShowHistoryModal(true); }}
                  style={{ width: '100%', padding: '9px', borderRadius: 9, border: `0.5px solid ${NA.border}`, background: 'transparent', color: NA.text2, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <i className="ti ti-history" style={{ fontSize: 14 }} aria-hidden="true" />
                  Ver historial
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: CREAR ── */}
      {showCreateModal && (
        <div style={sx.overlay} onClick={() => setShowCreateModal(false)}>
          <div style={sx.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: NA.text, margin: '0 0 4px', textAlign: 'center' }}>Nueva cuenta corriente</h2>
            <p style={{ fontSize: 12, color: NA.text2, textAlign: 'center', margin: '0 0 20px' }}>Registrá una deuda, adelanto o cuenta de instructor</p>

            <form onSubmit={handleCreatePasivo}>
              <Field label="Tipo de cuenta">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[{ v: false, l: 'General', i: 'ti-file-text' }, { v: true, l: 'Instructor', i: 'ti-school' }].map((opt) => (
                    <button
                      key={opt.l} type="button"
                      onClick={() => setNewPasivo({ ...newPasivo, esInstructor: opt.v, tipoRegistro: 'DEUDA' })}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        border: `1.5px solid ${newPasivo.esInstructor === opt.v ? NA.dark : NA.border}`,
                        background: newPasivo.esInstructor === opt.v ? NA.dark : '#fff',
                        color: newPasivo.esInstructor === opt.v ? '#fff' : NA.text2,
                      }}
                    >
                      <i className={`ti ${opt.i}`} style={{ fontSize: 15 }} aria-hidden="true" />
                      {opt.l}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={newPasivo.esInstructor ? 'Nombre del instructor' : 'Nombre / referencia'}>
                <TextInput
                  type="text"
                  placeholder={newPasivo.esInstructor ? 'Ej: Facundo Moreno' : 'Ej: Alquiler local'}
                  value={newPasivo.titulo}
                  onChange={(e) => setNewPasivo({ ...newPasivo, titulo: e.target.value })}
                  required
                />
              </Field>

              {newPasivo.esInstructor && (
                <div style={{ background: NA.light, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                  <Field label={<span style={{ color: NA.darker }}>Tarifa por hora (BRL)</span>}>
                    <input
                      type="number" step="0.01" placeholder="Ej: 120"
                      value={newPasivo.tarifaHora}
                      onChange={(e) => setNewPasivo({ ...newPasivo, tarifaHora: e.target.value })}
                      required={newPasivo.esInstructor}
                      style={{ ...sx.input, fontSize: 17, fontWeight: 600, color: NA.darker }}
                      onFocus={focusOn} onBlur={focusOff}
                    />
                  </Field>
                  <p style={{ fontSize: 11, color: NA.dark, margin: 0 }}>
                    Cada clase registrada en Ingreso sumará automáticamente horas × tarifa a esta cuenta.
                  </p>
                </div>
              )}

              {!newPasivo.esInstructor && (
                <Field label="¿Qué es?">
                  <Select value={newPasivo.tipoRegistro} onChange={(e) => setNewPasivo({ ...newPasivo, tipoRegistro: e.target.value })}>
                    <option value="DEUDA">Deuda — les debemos plata (rojo)</option>
                    <option value="ADELANTO">Adelanto — nos quedan debiendo (verde)</option>
                  </Select>
                </Field>
              )}

              {!newPasivo.esInstructor && (
                <div style={{
                  background: newPasivo.tipoRegistro === 'DEUDA' ? '#FEF2F2' : NA.light,
                  color: newPasivo.tipoRegistro === 'DEUDA' ? '#B91C1C' : NA.darker,
                  fontSize: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                }}>
                  {newPasivo.tipoRegistro === 'DEUDA'
                    ? 'Solo registra la deuda. No sale plata de caja.'
                    : 'Sale de caja. El saldo queda en verde (nos deben).'}
                </div>
              )}

              <Field label="Descripción / nota">
                <TextInput
                  type="text" placeholder="Ej: Pago de clases enero"
                  value={newPasivo.descripcion}
                  onChange={(e) => setNewPasivo({ ...newPasivo, descripcion: e.target.value })}
                />
              </Field>

              {!newPasivo.esInstructor && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <Field label="Monto inicial">
                    <TextInput
                      type="number" step="0.01"
                      value={newPasivo.montoInicial}
                      onChange={(e) => setNewPasivo({ ...newPasivo, montoInicial: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="Moneda">
                    <Select value={newPasivo.moneda} onChange={(e) => setNewPasivo({ ...newPasivo, moneda: e.target.value })}>
                      <option value="BRL">BRL</option>
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </Select>
                  </Field>
                </div>
              )}

              {newPasivo.esInstructor && (
                <div style={{ background: '#f9fafb', color: '#6b7280', fontSize: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 14 }}>
                  El saldo arranca en 0. Cada clase registrada acumulará la deuda automáticamente.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: guardando ? NA.mid : NA.dark, color: '#fff', fontSize: 13, fontWeight: 500, cursor: guardando ? 'default' : 'pointer' }}>
                  {guardando ? 'Creando...' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TRANSACCIÓN ── */}
      {showTransactionModal && selectedPasivo && (() => {
        const cfg = TX_CONFIG[transactionType];
        return (
          <div style={sx.overlay} onClick={() => setShowTransactionModal(false)}>
            <div style={{ ...sx.modal, borderTop: `4px solid ${cfg.color}` }} onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize: 22 }} aria-hidden="true" />
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 500, color: cfg.color, margin: 0 }}>{cfg.title}</h2>
                <p style={{ fontSize: 12, color: NA.text2, margin: '4px 0 0' }}>{selectedPasivo.titulo}</p>
              </div>

              <form onSubmit={handleTransactionSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: cfg.showFormaPago ? '1fr 1fr' : '1fr', gap: 12 }}>
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
                  {cfg.showFormaPago && (
                    <Field label="Forma de pago">
                      <Select value={transactionData.formaPago} onChange={(e) => setTransactionData({ ...transactionData, formaPago: e.target.value })}>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                      </Select>
                    </Field>
                  )}
                </div>
                <Field label="Concepto">
                  <TextInput
                    type="text" placeholder="Ej: Pago de clases enero"
                    value={transactionData.detalles}
                    onChange={(e) => setTransactionData({ ...transactionData, detalles: e.target.value })}
                    required
                  />
                </Field>
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button type="button" onClick={() => setShowTransactionModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardando} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: guardando ? '#d1d5db' : cfg.color, color: '#fff', fontSize: 13, fontWeight: 500, cursor: guardando ? 'default' : 'pointer' }}>
                    {guardando ? 'Confirmando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL: EDITAR ── */}
      {showEditModal && (
        <div style={sx.overlay} onClick={() => setShowEditModal(false)}>
          <div style={{ ...sx.modal, borderTop: '4px solid #92400E' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 500, color: '#92400E', margin: '0 0 20px', textAlign: 'center' }}>Editar cuenta</h2>
            <form onSubmit={handleEditSubmit}>
              <Field label="Tipo de cuenta">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[{ v: false, l: 'General', i: 'ti-file-text' }, { v: true, l: 'Instructor', i: 'ti-school' }].map((opt) => (
                    <button
                      key={opt.l} type="button"
                      onClick={() => setEditDecoded({ ...editDecoded, esInstructor: opt.v })}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        border: `1.5px solid ${editDecoded.esInstructor === opt.v ? '#92400E' : NA.border}`,
                        background: editDecoded.esInstructor === opt.v ? '#92400E' : '#fff',
                        color: editDecoded.esInstructor === opt.v ? '#fff' : NA.text2,
                      }}
                    >
                      <i className={`ti ${opt.i}`} style={{ fontSize: 15 }} aria-hidden="true" />
                      {opt.l}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Nombre / referencia">
                <TextInput
                  type="text"
                  value={editPasivo.titulo || ''}
                  onChange={(e) => setEditPasivo({ ...editPasivo, titulo: e.target.value })}
                  required
                />
              </Field>

              {editDecoded.esInstructor && (
                <div style={{ background: NA.light, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                  <Field label={<span style={{ color: NA.darker }}>Tarifa por hora (BRL)</span>}>
                    <input
                      type="number" step="0.01"
                      value={editDecoded.tarifaHora || ''}
                      onChange={(e) => setEditDecoded({ ...editDecoded, tarifaHora: e.target.value })}
                      required
                      style={{ ...sx.input, fontSize: 17, fontWeight: 600, color: NA.darker }}
                      onFocus={focusOn} onBlur={focusOff}
                    />
                  </Field>
                </div>
              )}

              <Field label="Descripción">
                <textarea
                  value={editDecoded.descripcion || ''}
                  onChange={(e) => setEditDecoded({ ...editDecoded, descripcion: e.target.value })}
                  rows={3}
                  style={{ ...sx.input, resize: 'vertical', fontFamily: 'inherit' }}
                  onFocus={focusOn} onBlur={focusOff}
                />
              </Field>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: guardando ? '#fcd9a8' : '#92400E', color: '#fff', fontSize: 13, fontWeight: 500, cursor: guardando ? 'default' : 'pointer' }}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: HISTORIAL ── */}
      {showHistoryModal && selectedPasivo && (
        <div style={sx.overlay} onClick={() => setShowHistoryModal(false)}>
          <div style={{ ...sx.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <h2 style={{ fontSize: 17, fontWeight: 500, color: NA.text, margin: 0 }}>{selectedPasivo.titulo}</h2>
              <button onClick={() => setShowHistoryModal(false)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
              </button>
            </div>
            <p style={{ fontSize: 12, color: NA.text2, margin: '0 0 18px' }}>Historial de movimientos</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', marginBottom: 18 }}>
              {selectedPasivo.historialPagos?.length > 0 ? (
                [...selectedPasivo.historialPagos].reverse().map((mov) => {
                  const monto = parseFloat(mov.montoPagado) || 0;
                  const esPositivo = monto > 0;
                  const eliminandoEsteMov = eliminandoMovIds.has(mov.id);
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
                          onClick={() => handleDeleteMovimiento(mov)}
                          disabled={eliminandoEsteMov}
                          title="Eliminar este movimiento"
                          style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', color: '#fca5a5', cursor: eliminandoEsteMov ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <i className={`ti ${eliminandoEsteMov ? 'ti-loader-2' : 'ti-trash'}`} aria-hidden="true" style={{ fontSize: 14, ...(eliminandoEsteMov ? { animation: 'kbn-spin .7s linear infinite' } : {}) }} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
                  Sin movimientos registrados.
                </div>
              )}
            </div>

            <button
              onClick={() => setShowHistoryModal(false)}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: NA.darker, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pasivos;

export { decodeTarifa, encodeTarifa };