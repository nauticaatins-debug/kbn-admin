import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Pasivos = ({ axiosConfig, setView }) => {
  const [pasivos, setPasivos] = useState([]);
  const [selectedPasivo, setSelectedPasivo] = useState(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [transactionType, setTransactionType] = useState('ADELANTO'); 

  const today = new Date().toISOString().split('T')[0];

  const initialPasivoForm = { titulo: '', descripcion: '', montoTotal: '', moneda: 'BRL', fecha: today };
  const [newPasivo, setNewPasivo] = useState(initialPasivoForm);
  const [editPasivo, setEditPasivo] = useState(initialPasivoForm);

  const initialTransactionForm = { monto: '', fecha: today, formaPago: 'Efectivo', detalles: '' };
  const [transactionData, setTransactionData] = useState(initialTransactionForm);

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

  const handleCreatePasivo = async (e) => {
    e.preventDefault();
    try {
      const montoInicial = parseFloat(newPasivo.montoTotal);
      const montoCalculado = newPasivo.tipoRegistro === 'DEUDA' ? -Math.abs(montoInicial) : Math.abs(montoInicial);
      
      const payload = { ...newPasivo, montoTotal: montoCalculado };
      const res = await axios.post('https://kbnadmin-production.up.railway.app/api/pasivos', payload, axiosConfig);
      
      if (newPasivo.tipoRegistro === 'ADELANTO') {
        const egresoPayload = {
          tipoTransaccion: 'EGRESO',
          pasivoId: res.data.id,
          total: Math.abs(montoCalculado),
          fecha: newPasivo.fecha,
          moneda: newPasivo.moneda,
          formaPago: 'Efectivo',
          detalles: `Adelanto inicial: ${newPasivo.titulo}`,
          actividad: 'Pago Pasivo',
          instructor: 'Secretaria'
        };
        await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', egresoPayload, axiosConfig);
      }
      setShowCreateModal(false);
      setNewPasivo(initialPasivoForm);
      fetchPasivos(); 
    } catch (err) {
      alert("Error al guardar.");
    }
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    try {
      const montoMovimiento = parseFloat(transactionData.monto);
      let nuevoSaldo = parseFloat(selectedPasivo.montoTotal);
      
      // Creamos una copia del historial actual
      const nuevoHistorial = [...(selectedPasivo.historialPagos || [])];

      if (transactionType === 'ADELANTO') {
        nuevoSaldo += montoMovimiento;
        
        // Registrar el Egreso en Caja
        const payloadEgreso = {
          tipoTransaccion: 'EGRESO',
          pasivoId: selectedPasivo.id,
          total: montoMovimiento,
          fecha: transactionData.fecha,
          moneda: selectedPasivo.moneda,
          formaPago: transactionData.formaPago,
          detalles: transactionData.detalles || `Pago a: ${selectedPasivo.titulo}`,
          actividad: 'Pago Pasivo',
          instructor: 'Secretaria'
        };
        await axios.post('https://kbnadmin-production.up.railway.app/api/clases/guardar', payloadEgreso, axiosConfig);
        
        // El pago ya se agrega al historial por el backend si está vinculado, 
        // pero para asegurar la vista inmediata (o si el backend no lo hace solo):
        nuevoHistorial.push({
            montoPagado: montoMovimiento,
            fecha: transactionData.fecha,
            nota: transactionData.detalles || "Pago/Adelanto registrado"
        });
      } else {
        // ES DEUDA: Resta al saldo
        nuevoSaldo -= montoMovimiento;
        
        // AGREGAMOS AL HISTORIAL: Aunque no sea un "pago", es un movimiento de la cuenta
        nuevoHistorial.push({
            montoPagado: -montoMovimiento, // Lo ponemos negativo para indicar que es deuda
            fecha: transactionData.fecha,
            nota: `DEUDA: ${transactionData.detalles}`
        });
      }

      // Actualizar el Pasivo con el nuevo saldo Y el nuevo historial
      await axios.put(`https://kbnadmin-production.up.railway.app/api/pasivos/${selectedPasivo.id}`, {
          ...selectedPasivo,
          montoTotal: nuevoSaldo,
          historialPagos: nuevoHistorial
      }, axiosConfig);

      setShowTransactionModal(false);
      setTransactionData(initialTransactionForm);
      fetchPasivos();
      alert('Operación realizada con éxito.');
    } catch (err) {
      alert("Error en la transacción.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
        await axios.put(`https://kbnadmin-production.up.railway.app/api/pasivos/${editPasivo.id}`, editPasivo, axiosConfig);
        setShowEditModal(false);
        fetchPasivos();
        alert("Datos actualizados");
    } catch (err) {
        console.error(err);
        alert("Error al actualizar");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("¿Eliminar esta cuenta corriente?")){
      try {
        await axios.delete(`https://kbnadmin-production.up.railway.app/api/pasivos/${id}`, axiosConfig);
        fetchPasivos();
      } catch (err) { alert("Error al eliminar."); }
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fadeIn">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black uppercase text-gray-800 italic tracking-tighter">Cuentas Corrientes</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestión de Deudas y Adelantos</p>
        </div>
        <button onClick={() => setView('INICIO')} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all">← Volver</button>
      </div>

      {/* BOTÓN CREAR */}
      <button onClick={() => setShowCreateModal(true)} className="w-full mb-8 bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-[2rem] shadow-xl shadow-indigo-100 flex flex-col items-center transition-all group">
        <span className="text-3xl mb-1 group-hover:scale-110 transition-transform">+ Registrar Pasivo</span>
      </button>

      {/* GRID DE TARJETAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pasivos.map(p => {
            const balance = parseFloat(p.montoTotal);
            const isNegative = balance < 0;
            const isPositive = balance > 0;

            return (
                <div key={p.id} className={`bg-white rounded-[2.5rem] p-6 shadow-sm border-t-[12px] flex flex-col transition-all hover:shadow-md ${isNegative ? 'border-rose-500' : (isPositive ? 'border-emerald-500' : 'border-gray-300')}`}>
                    <div className="flex justify-between items-start mb-4">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${isNegative ? 'bg-rose-100 text-rose-700' : (isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600')}`}>
                            {isNegative ? 'Le debemos' : (isPositive ? 'A nuestro favor' : 'Saldado')}
                        </span>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditPasivo(p); setShowEditModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg text-lg">✏️</button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-rose-50 rounded-lg text-lg">🗑️</button>
                        </div>
                    </div>
                    
                    <h3 className="font-black text-gray-800 uppercase text-xl leading-tight mb-1">{p.titulo}</h3>
                    <p className="text-[11px] text-gray-400 font-bold uppercase mb-4 h-8 overflow-hidden">{p.descripcion}</p>
                    
                    <div className={`${isNegative ? 'bg-rose-50' : (isPositive ? 'bg-emerald-50' : 'bg-gray-50')} p-5 rounded-3xl mb-6 text-center`}>
                        <span className="block text-[10px] font-black text-gray-400 uppercase mb-1">Saldo Actual</span>
                        <span className={`text-3xl font-black ${isNegative ? 'text-rose-600' : (isPositive ? 'text-emerald-600' : 'text-gray-400')}`}>
                            {p.moneda} {balance.toFixed(2)}
                        </span>
                    </div>
                    
                    <div className="space-y-2 mt-auto">
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { setTransactionType('DEUDA'); setSelectedPasivo(p); setShowTransactionModal(true); }} className="bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all">
                          + Registrar Deuda
                        </button>
                        <button onClick={() => { setTransactionType('ADELANTO'); setSelectedPasivo(p); setShowTransactionModal(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all">
                          + Dar Adelanto
                        </button>
                      </div>
                      <button onClick={() => { setSelectedPasivo(p); setShowHistoryModal(true); }} className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                        Ver Historial de Movimientos
                      </button>
                    </div>
                </div>
            );
        })}
      </div>

      {/* MODAL CREAR */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 text-gray-800">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
            <h2 className="font-black uppercase italic mb-6 text-2xl text-center">Nueva Cuenta</h2>
            <form onSubmit={handleCreatePasivo} className="space-y-4">
              {/* NOMBRE */}
              <input 
                type="text" 
                placeholder="Nombre (Ej: Profe Facu)" 
                className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none font-bold" 
                value={newPasivo.titulo} 
                onChange={e => setNewPasivo({...newPasivo, titulo: e.target.value})} 
                required 
              />
              
              {/* ESTADO INICIAL */}
              <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Estado Inicial</label>
                <select 
                  className="w-full p-4 bg-gray-100 rounded-2xl border-none font-bold" 
                  value={newPasivo.tipoRegistro} 
                  onChange={e => setNewPasivo({...newPasivo, tipoRegistro: e.target.value})} 
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="DEUDA">Deuda</option>
                  <option value="ADELANTO">Adelanto</option>
                </select>
              </div>

              {/* --- NUEVO CAMPO: DESCRIPCIÓN DEBAJO DE ESTADO INICIAL --- */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Descripción / Nota</label>
                <input 
                  type="text" 
                  placeholder="Ej: PAGO POR CLASES" 
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" 
                  value={newPasivo.descripcion} 
                  onChange={e => setNewPasivo({...newPasivo, descripcion: e.target.value})} 
                />
              </div>
              {/* ------------------------------------------------------ */}

              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Monto" 
                  className="p-4 bg-gray-50 rounded-2xl border-none font-bold" 
                  value={newPasivo.montoTotal} 
                  onChange={e => setNewPasivo({...newPasivo, montoTotal: e.target.value})} 
                  required 
                />
                <select 
                  className="p-4 bg-gray-50 rounded-2xl border-none font-bold" 
                  value={newPasivo.moneda} 
                  onChange={e => setNewPasivo({...newPasivo, moneda: e.target.value})}
                >
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 font-black uppercase text-xs text-gray-400">Cancelar</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Crear Cuenta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSACCION */}
      {showTransactionModal && selectedPasivo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 text-gray-800">
          <div className={`bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border-t-[15px] ${transactionType === 'ADELANTO' ? 'border-emerald-500' : 'border-rose-500'}`}>
            <h2 className={`font-black uppercase text-2xl text-center mb-1 ${transactionType === 'ADELANTO' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {transactionType === 'ADELANTO' ? 'Registrar Adelanto' : 'Registrar Deuda'}
            </h2>
            <p className="text-center text-[10px] font-black text-gray-400 uppercase mb-8 tracking-widest">{selectedPasivo.titulo}</p>
            
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" placeholder="Monto" className="p-4 bg-gray-50 rounded-2xl border-none font-black text-xl" value={transactionData.monto} onChange={e => setTransactionData({...transactionData, monto: e.target.value})} required />
                {transactionType === 'ADELANTO' && (
                  <select className="p-4 bg-gray-50 rounded-2xl border-none font-bold" value={transactionData.formaPago} onChange={e => setTransactionData({...transactionData, formaPago: e.target.value})}>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                )}
              </div>
              <input type="text" placeholder="Concepto (Ej: 5hs clase Facu)" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" value={transactionData.detalles} onChange={e => setTransactionData({...transactionData, detalles: e.target.value})} required />

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setShowTransactionModal(false)} className="flex-1 font-black uppercase text-xs text-gray-400">Cancelar</button>
                <button type="submit" className={`flex-[2] py-4 rounded-2xl font-black uppercase text-xs text-white shadow-xl ${transactionType === 'ADELANTO' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                  Confirmar {transactionType === 'ADELANTO' ? 'Pago' : 'Deuda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PASIVO */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 text-gray-800">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl border-t-[15px] border-amber-500">
            <h2 className="font-black uppercase italic mb-6 text-2xl text-center text-amber-600">Editar Perfil</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nombre / Referencia</label>
                <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold" value={editPasivo.titulo} onChange={e => setEditPasivo({...editPasivo, titulo: e.target.value})} required />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Descripción</label>
                <textarea className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold h-24" value={editPasivo.descripcion} onChange={e => setEditPasivo({...editPasivo, descripcion: e.target.value})} />
              </div>
              
              <div className="bg-amber-50 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-amber-700 text-center uppercase">Nota: El saldo se gestiona desde los botones de Deuda/Adelanto.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 font-black uppercase text-xs text-gray-400">Cancelar</button>
                <button type="submit" className="flex-[2] bg-amber-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL ACTUALIZADO */}
      {showHistoryModal && selectedPasivo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-black uppercase text-xl italic text-gray-800">Movimientos: {selectedPasivo.titulo}</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-2xl">✕</button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 mb-8">
              {selectedPasivo.historialPagos?.length > 0 ? (
                // Ordenamos por fecha descendente (más reciente arriba)
                [...selectedPasivo.historialPagos].reverse().map((mov, idx) => (
                  <div key={idx} className={`bg-gray-50 p-5 rounded-3xl flex justify-between items-center border-l-8 ${mov.montoPagado > 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">{mov.fecha}</p>
                      <p className="text-sm font-black text-gray-700">{mov.nota}</p>
                    </div>
                    <span className={`font-black text-lg ${mov.montoPagado > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {mov.montoPagado > 0 ? `+ ${mov.montoPagado}` : `- ${Math.abs(mov.montoPagado)}`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400 font-bold italic">Sin movimientos registrados.</div>
              )}
            </div>
            <button onClick={() => setShowHistoryModal(false)} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-xs transition-all hover:bg-black">Cerrar Historial</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pasivos;