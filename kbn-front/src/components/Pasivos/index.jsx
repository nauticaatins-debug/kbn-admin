import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

import { NA, encodeTarifa, decodeTarifa } from './PasivosShared';
import PasivosCard    from './PasivosCard';
import ModalCrear     from './ModalCrear';
import ModalTransaccion from './ModalTransaccion';
import ModalEditar    from './ModalEditar';
import ModalHistorial from './ModalHistorial';

const BACKEND = 'https://kbn-admin-production.up.railway.app';

const Pasivos = ({ axiosConfig, setView }) => {
  const [pasivos, setPasivos] = useState([]);
  const [selectedPasivo, setSelectedPasivo] = useState(null);

  const [showCreateModal,      setShowCreateModal]      = useState(false);
  const [showHistoryModal,     setShowHistoryModal]     = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showEditModal,        setShowEditModal]        = useState(false);

  const [transactionType, setTransactionType] = useState('PAGO_DEUDA');

  // ── Guards de doble-tap con useRef (síncrono, no espera re-render) ─────────
  const enviandoRef     = useRef(false);          // cubre crear, editar
  const eliminandoMovRef = useRef(new Set());     // por movimiento de historial
  const [guardando,        setGuardando]        = useState(false);
  const [eliminandoMovIds, setEliminandoMovIds] = useState(new Set());

  const today = new Date().toISOString().split('T')[0];

  const initialPasivoForm = {
    titulo: '', descripcion: '', tarifaHora: '', esInstructor: false,
    montoInicial: '', moneda: 'BRL', fecha: today, tipoRegistro: 'DEUDA',
  };
  const [newPasivo,   setNewPasivo]   = useState(initialPasivoForm);
  const [editPasivo,  setEditPasivo]  = useState({});
  const [editDecoded, setEditDecoded] = useState({ tarifaHora: '', descripcion: '', esInstructor: false });

  const initialTransactionForm = { monto: '', fecha: today, cajaSalida: '', detalles: '' };
  const [transactionData, setTransactionData] = useState(initialTransactionForm);

  useEffect(() => { fetchPasivos(); }, []);

  // ── FETCH ───────────────────────────────────────────────────────────────────
  const fetchPasivos = async () => {
    try {
      const res = await axios.get(`${BACKEND}/api/pasivos`, axiosConfig);
      setPasivos(res.data);
    } catch (err) {
      console.error('Error al cargar pasivos', err);
    }
  };

  // ── CREAR ───────────────────────────────────────────────────────────────────
  const handleCreatePasivo = async (e) => {
    e.preventDefault();
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);
    try {
      const monto      = parseFloat(newPasivo.montoInicial) || 0;
      const esAdelanto = newPasivo.tipoRegistro === 'ADELANTO';
      const descripcionEncoded = newPasivo.esInstructor
        ? encodeTarifa(newPasivo.tarifaHora, newPasivo.descripcion)
        : newPasivo.descripcion;

      const pasivoRes = await axios.post(`${BACKEND}/api/pasivos`, {
        titulo:         newPasivo.titulo,
        descripcion:    descripcionEncoded,
        moneda:         newPasivo.moneda,
        fecha:          newPasivo.fecha,
        montoTotal:     esAdelanto ? 0 : -Math.abs(monto),
        historialPagos: [],
      }, axiosConfig);

      // Adelanto: sale plata real → EGRESO en caja
      if (esAdelanto && monto > 0) {
        await axios.post(`${BACKEND}/api/clases/guardar`, {
          tipoTransaccion:     'EGRESO',
          tipoMovimientoPasivo: 'ADELANTO',
          pasivoId:            pasivoRes.data.id,
          total:               String(Math.abs(monto)),
          fecha:               newPasivo.fecha,
          moneda:              newPasivo.moneda,
          formaPago:           'Efectivo',
          detalles:            `Adelanto inicial: ${newPasivo.titulo}`,
          actividad:           'Pago Pasivo',
          instructor:          'Secretaria',
        }, axiosConfig);
      }

      setShowCreateModal(false);
      setNewPasivo(initialPasivoForm);
      setTimeout(fetchPasivos, 800);
    } catch (err) {
      console.error(err);
      alert('Error al guardar.');
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  // ── TRANSACCIÓN ─────────────────────────────────────────────────────────────
  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);
    try {
      const monto = parseFloat(transactionData.monto);
      const nota  = transactionData.detalles || `${
        transactionType === 'NUEVA_DEUDA' ? 'Nueva deuda'
        : transactionType === 'ADELANTO'  ? 'Adelanto'
        : 'Pago'
      }: ${selectedPasivo.titulo}`;

      if (transactionType === 'NUEVA_DEUDA') {
        // Solo acumula deuda interna — no sale plata de ninguna caja
        await axios.put(`${BACKEND}/api/pasivos/${selectedPasivo.id}/acumular`, {
          monto: -Math.abs(monto),
          nota,
          fecha: transactionData.fecha,
        }, axiosConfig);

      } else {
        // PAGO_DEUDA / ADELANTO: sale plata real → EGRESO registrado en caja
        // cajaSalida es el canal de donde sale (Stone José, Wize Igna, etc.)
        await axios.post(`${BACKEND}/api/clases/guardar`, {
          tipoTransaccion:     'EGRESO',
          tipoMovimientoPasivo: transactionType,
          pasivoId:            selectedPasivo.id,
          total:               String(Math.abs(monto)),
          fecha:               transactionData.fecha,
          // Usamos cajaSalida como moneda para que en Reportes se sepa de
          // qué pozo salió. Si no seleccionó ninguno, fallback al moneda
          // de la tarjeta (comportamiento anterior).
          moneda:              transactionData.cajaSalida || selectedPasivo.moneda,
          formaPago:           'Transferencia',
          detalles:            nota,
          actividad:           'Pago Pasivo',
          instructor:          'Secretaria',
        }, axiosConfig);
      }

      setShowTransactionModal(false);
      setTransactionData(initialTransactionForm);
      setTimeout(fetchPasivos, 800);
    } catch (err) {
      console.error(err);
      alert('Error en la transacción.');
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  // ── EDITAR ──────────────────────────────────────────────────────────────────
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setGuardando(true);
    try {
      const descripcionEncoded = editDecoded.esInstructor
        ? encodeTarifa(editDecoded.tarifaHora, editDecoded.descripcion)
        : editDecoded.descripcion;

      await axios.put(`${BACKEND}/api/pasivos/${editPasivo.id}`,
        { ...editPasivo, descripcion: descripcionEncoded },
        axiosConfig
      );
      setShowEditModal(false);
      fetchPasivos();
    } catch (err) {
      console.error(err);
      alert('Error al actualizar.');
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  // ── ELIMINAR CUENTA ─────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta cuenta corriente? Esta acción no se puede deshacer.')) return;
    try {
      await axios.delete(`${BACKEND}/api/pasivos/${id}`, axiosConfig);
      fetchPasivos();
    } catch (err) {
      alert('Error al eliminar.');
    }
  };

  // ── ELIMINAR MOVIMIENTO DEL HISTORIAL ───────────────────────────────────────
  // Resta del saldo exactamente lo que ese movimiento había sumado.
  // Util para corregir duplicados por mal wifi (ej: deuda acumulada dos veces).
  const handleDeleteMovimiento = async (mov) => {
    if (!selectedPasivo) return;
    const signo = mov.montoPagado > 0 ? '+' : '-';
    if (!window.confirm(`¿Eliminar este movimiento? Esto va a restar ${signo}${Math.abs(mov.montoPagado).toFixed(2)} del saldo de ${selectedPasivo.titulo}.`)) return;

    if (eliminandoMovRef.current.has(mov.id)) return;
    eliminandoMovRef.current.add(mov.id);
    setEliminandoMovIds(new Set(eliminandoMovRef.current));
    try {
      const res = await axios.delete(
        `${BACKEND}/api/pasivos/${selectedPasivo.id}/historial/${mov.id}`,
        axiosConfig
      );
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

  // ── HANDLERS DE APERTURA DE MODALES ────────────────────────────────────────
  const openTransaction = (type, pasivo) => {
    setTransactionType(type);
    setSelectedPasivo(pasivo);
    setTransactionData(initialTransactionForm);
    setShowTransactionModal(true);
  };

  const openHistory = (pasivo) => {
    setSelectedPasivo(pasivo);
    setShowHistoryModal(true);
  };

  const openEdit = (pasivo) => {
    setEditPasivo(pasivo);
    setEditDecoded(decodeTarifa(pasivo.descripcion));
    setShowEditModal(true);
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
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
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: NA.dark, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
          Nueva cuenta
        </button>
      </div>

      {/* ── Leyenda ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { color: '#B91C1C', bg: '#FEF2F2', label: 'Les debemos' },
          { color: NA.dark,   bg: NA.light,  label: 'Nos deben'   },
          { color: '#6b7280', bg: '#f9fafb', label: 'Saldado'     },
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
          {pasivos.map((p) => (
            <PasivosCard
              key={p.id}
              p={p}
              onTransaction={openTransaction}
              onHistory={openHistory}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Modales ── */}
      {showCreateModal && (
        <ModalCrear
          newPasivo={newPasivo}
          setNewPasivo={setNewPasivo}
          onSubmit={handleCreatePasivo}
          onClose={() => setShowCreateModal(false)}
          guardando={guardando}
        />
      )}

      {showTransactionModal && selectedPasivo && (
        <ModalTransaccion
          transactionType={transactionType}
          selectedPasivo={selectedPasivo}
          transactionData={transactionData}
          setTransactionData={setTransactionData}
          onSubmit={handleTransactionSubmit}
          onClose={() => setShowTransactionModal(false)}
          guardando={guardando}
        />
      )}

      {showEditModal && (
        <ModalEditar
          editPasivo={editPasivo}
          setEditPasivo={setEditPasivo}
          editDecoded={editDecoded}
          setEditDecoded={setEditDecoded}
          onSubmit={handleEditSubmit}
          onClose={() => setShowEditModal(false)}
          guardando={guardando}
        />
      )}

      {showHistoryModal && (
        <ModalHistorial
          selectedPasivo={selectedPasivo}
          eliminandoMovIds={eliminandoMovIds}
          onDeleteMovimiento={handleDeleteMovimiento}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
};

export default Pasivos;