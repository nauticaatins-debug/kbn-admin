import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Pasivos = ({ axiosConfig, setView }) => {
  const [pasivos, setPasivos] = useState([]);
  const [selectedPasivo, setSelectedPasivo] = useState(null);
  
  // Controladores de Modales
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Tipo de creación (deuda o adelanto)
  const [createType, setCreateType] = useState('DEUDA');

  const today = new Date().toISOString().split('T')[0];

  // Estado para Nueva Deuda/Adelanto
  const initialPasivoForm = {
    titulo: '', descripcion: '', montoTotal: '', moneda: 'USD', fecha: today
  };
  const [newPasivo, setNewPasivo] = useState(initialPasivoForm);

  // Estado para el Pago (Egreso)
  const initialPaymentForm = {
    total: '', fecha: today, moneda: 'USD', formaPago: 'Efectivo', detalles: ''
  };
  const [paymentData, setPaymentData] = useState(initialPaymentForm);

  useEffect(() => {
    fetchPasivos();
  }, []);

  const fetchPasivos = async () => {
    try {
      const res = await axios.get('https://kbnadmin-production.up.railway.app/api/pasivos', axiosConfig);
      setPasivos(res.data);
    } catch (err) {
      console.error("Error al cargar pasivos", err);
    }
  };

  // 1. Crear nueva cuenta (Deuda o Adelanto)
  const handleCreatePasivo = async (e) => {
    e.preventDefault();
    try {
      // Si es un adelanto, el monto inicial entra como negativo
      const monto = createType === 'ADELANTO' ? -Math.abs(newPasivo.montoTotal) : Math.abs(newPasivo.montoTotal);
      
      const payload = { ...newPasivo, montoTotal: monto };
      
      await axios.post('https://kbnadmin-production.up.railway.app/api/pasivos', payload, axiosConfig);
      setShowCreateModal(false);
      setNewPasivo(initialPasivoForm);
      fetchPasivos(); 
    } catch (err) {
      alert("Error al guardar. Revisa la consola.");
    }
  };

  // 2. Registrar Pago (Egreso vinculado)
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      // Armamos el objeto como si fuera un Egreso de la caja general
      const payload = {
        tipoTransaccion: 'EGRESO',
        pasivoId: selectedPasivo.id,
        total: paymentData.total,
        fecha: paymentData.fecha,
        moneda: paymentData.moneda,
        formaPago: paymentData.formaPago,
        detalles: paymentData.detalles || `Pago a cuenta: ${selectedPasivo.titulo}`,
        actividad: 'Pago a Proveedor/Staff' // Para que en el reporte se entienda
      };

      await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payload, axiosConfig);
      alert('Pago registrado correctamente. Se descontó del saldo y se guardó en Egresos.');
      
      setShowPaymentModal(false);
      setPaymentData(initialPaymentForm);
      fetchPasivos(); // Recargamos para ver el nuevo saldo
    } catch (err) {
      console.error(err);
      alert("Error al registrar el pago.");
    }
  };

  const openCreateModal = (type) => {
    setCreateType(type);
    setNewPasivo(initialPasivoForm);
    setShowCreateModal(true);
  };

  const openPaymentModal = (pasivo) => {
    setSelectedPasivo(pasivo);
    setPaymentData({ ...initialPaymentForm, moneda: pasivo.moneda });
    setShowPaymentModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fadeIn">
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black uppercase text-gray-800 italic tracking-tighter">💸 Cuentas Corrientes</h2>
        <button onClick={() => setView('INICIO')} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm uppercase tracking-widest transition-colors">← Volver</button>
      </div>

      {/* ACCIONES RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button onClick={() => openCreateModal('DEUDA')} className="bg-rose-50 border-2 border-rose-100 hover:bg-rose-100 p-6 rounded-[2rem] flex flex-col items-center transition-all group">
          <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📉</span>
          <span className="font-black text-rose-600 uppercase text-sm tracking-widest">Registrar Nueva Deuda</span>
        </button>
        <button onClick={() => openCreateModal('ADELANTO')} className="bg-emerald-50 border-2 border-emerald-100 hover:bg-emerald-100 p-6 rounded-[2rem] flex flex-col items-center transition-all group">
          <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📈</span>
          <span className="font-black text-emerald-600 uppercase text-sm tracking-widest">Registrar Nuevo Adelanto</span>
        </button>
      </div>

      {/* LISTADO DE TARJETAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pasivos.map(p => {
            const isAdelanto = parseFloat(p.montoTotal) < 0;
            return (
                <div key={p.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border-t-8 flex flex-col min-h-[200px] ${isAdelanto ? 'border-emerald-400' : 'border-rose-400'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${isAdelanto ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {isAdelanto ? 'A Favor (Adelanto)' : 'Pendiente (Deuda)'}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 uppercase">{p.fecha}</span>
                    </div>
                    
                    <h3 className="font-black text-gray-800 uppercase text-xl mt-2 leading-tight">{p.titulo}</h3>
                    <p className="text-xs text-gray-500 mb-4 flex-grow">{p.descripcion}</p>
                    
                    <div className="bg-gray-50 p-4 rounded-2xl mb-4 text-center">
                        <span className="block text-[10px] font-black text-gray-400 uppercase mb-1">Saldo Actual</span>
                        <span className={`text-2xl font-black ${isAdelanto ? 'text-emerald-500' : 'text-rose-600'}`}>
                            {p.moneda} {Math.abs(p.montoTotal)}
                        </span>
                    </div>
                    
                    <div className="flex gap-2 mt-auto">
                        <button onClick={() => { setSelectedPasivo(p); setShowHistoryModal(true); }} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 transition-all tracking-widest">
                            Historial
                        </button>
                        <button onClick={() => openPaymentModal(p)} className={`flex-1 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all tracking-widest ${isAdelanto ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-gray-900 hover:bg-black'}`}>
                            {isAdelanto ? '+ Adelantar' : '💸 Pagar'}
                        </button>
                    </div>
                </div>
            );
        })}
      </div>

      {/* --- MODALES --- */}

      {/* MODAL 1: CREAR CUENTA */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h2 className={`font-black uppercase italic mb-6 text-xl text-center ${createType === 'DEUDA' ? 'text-rose-600' : 'text-emerald-600'}`}>
              Crear {createType === 'DEUDA' ? 'Deuda' : 'Adelanto'} Inicial
            </h2>
            <form onSubmit={handleCreatePasivo} className="space-y-4">
              <input type="text" placeholder="Referencia (Ej: Alquiler Posada, Profe Juan)" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-indigo-500" value={newPasivo.titulo} onChange={e => setNewPasivo({...newPasivo, titulo: e.target.value})} required />
              <textarea placeholder="Descripción o detalles..." className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-indigo-500" value={newPasivo.descripcion} onChange={e => setNewPasivo({...newPasivo, descripcion: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" min="0" placeholder="Monto Inicial" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-indigo-500" value={newPasivo.montoTotal} onChange={e => setNewPasivo({...newPasivo, montoTotal: e.target.value})} required />
                <select className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-indigo-500" value={newPasivo.moneda} onChange={e => setNewPasivo({...newPasivo, moneda: e.target.value})}>
                  <option value="USD">USD</option><option value="ARS">ARS</option><option value="BRL">BRL</option><option value="EUR">EUR</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" className={`flex-1 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg ${createType === 'DEUDA' ? 'bg-rose-600' : 'bg-emerald-600'}`}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR PAGO (EGRESO) */}
      {showPaymentModal && selectedPasivo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border-4 border-gray-900">
            <h2 className="font-black uppercase italic text-gray-800 mb-2 text-xl text-center">Registrar Salida de Dinero</h2>
            <p className="text-center text-[10px] font-bold text-gray-400 uppercase mb-6">Impacta en caja (Egreso) y en la cuenta de: {selectedPasivo.titulo}</p>
            
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Monto Físico Pagado</label>
                  <input type="number" step="0.01" min="0.01" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-black text-lg text-rose-600 focus:ring-2 focus:ring-rose-500" value={paymentData.total} onChange={e => setPaymentData({...paymentData, total: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Forma de Pago</label>
                  <select className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-rose-500" value={paymentData.formaPago} onChange={e => setPaymentData({...paymentData, formaPago: e.target.value})}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Notas del Pago</label>
                <input type="text" placeholder="Ej: Transferencia quincena, adelanto lancha..." className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-rose-500" value={paymentData.detalles} onChange={e => setPaymentData({...paymentData, detalles: e.target.value})} required />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-[2] bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-colors">Confirmar Salida</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: HISTORIAL */}
      {showHistoryModal && selectedPasivo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black uppercase italic text-gray-800 text-lg">Historial: {selectedPasivo.titulo}</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 text-2xl hover:text-rose-500 transition-colors">✕</button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-2">
              {selectedPasivo.historialPagos?.length > 0 ? (
                selectedPasivo.historialPagos.map(pago => (
                  <div key={pago.id} className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border-l-4 border-emerald-500">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">{pago.fecha}</p>
                      <p className="text-xs font-bold text-gray-700">{pago.nota}</p>
                    </div>
                    <span className="font-black text-emerald-600 text-lg">-${pago.montoPagado}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-10 font-bold italic text-sm">No hay movimientos registrados.</p>
              )}
            </div>
            <button onClick={() => setShowHistoryModal(false)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase shadow-lg text-xs tracking-widest">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pasivos;