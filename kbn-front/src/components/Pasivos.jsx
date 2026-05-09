import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Pasivos = ({ axiosConfig, setView }) => {
  const [pasivos, setPasivos] = useState([]);
  const [selectedPasivo, setSelectedPasivo] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const initialPasivoForm = {
    titulo: '',
    descripcion: '',
    montoTotal: '',
    moneda: 'USD',
    fecha: new Date().toISOString().split('T')[0]
  };
  const [newPasivo, setNewPasivo] = useState(initialPasivoForm);

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
      await axios.post('https://kbnadmin-production.up.railway.app/api/pasivos', newPasivo, axiosConfig);
      alert("Pasivo creado con éxito");
      setShowCreateModal(false);
      setNewPasivo(initialPasivoForm);
      fetchPasivos(); 
    } catch (err) {
      console.error("Error al crear pasivo", err);
      alert("Error al guardar el pasivo. Revisa la consola.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fadeIn">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-black uppercase text-gray-800 italic tracking-tighter">💸 Deudas y Pasivos</h2>
        <button onClick={() => setView('INICIO')} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm uppercase tracking-widest transition-colors">← Volver</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* TARJETA AGREGAR */}
        <button 
          onClick={() => setShowCreateModal(true)}
          className="border-4 border-dashed border-gray-200 rounded-[2rem] p-6 flex flex-col items-center justify-center hover:border-indigo-400 hover:bg-indigo-50 transition-all group min-h-[200px]"
        >
          <div className="text-5xl mb-2 group-hover:scale-110 transition-transform">➕</div>
          <span className="font-black text-gray-400 uppercase text-sm group-hover:text-indigo-600 tracking-widest">Nueva Deuda</span>
        </button>

        {/* LISTADO DE PASIVOS */}
        {pasivos.map(p => {
            const isAdelanto = parseFloat(p.montoTotal) < 0;
            return (
                <div key={p.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border-t-8 flex flex-col min-h-[200px] ${isAdelanto ? 'border-emerald-400' : 'border-rose-400'}`}>
                    <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase">{p.fecha}</span>
                    <span className={`text-lg font-black ${isAdelanto ? 'text-emerald-500' : 'text-rose-600'}`}>
                        {p.moneda} {p.montoTotal}
                    </span>
                    </div>
                    <h3 className="font-black text-gray-800 uppercase text-xl mb-1 leading-tight">{p.titulo}</h3>
                    <p className="text-xs text-gray-500 mb-4 flex-grow">{p.descripcion}</p>
                    
                    <button 
                    onClick={() => { setSelectedPasivo(p); setShowHistoryModal(true); }}
                    className="mt-auto w-full bg-gray-50 text-gray-800 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 transition-all tracking-widest"
                    >
                    Ver Historial
                    </button>
                </div>
            );
        })}
      </div>

      {/* MODAL CREAR */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <h2 className="font-black uppercase italic text-gray-800 mb-6 text-xl text-center">Registrar Nueva Deuda</h2>
            <form onSubmit={handleCreatePasivo} className="space-y-4">
              <input type="text" placeholder="Título (Ej: Alquiler Mayo)" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={newPasivo.titulo} onChange={e => setNewPasivo({...newPasivo, titulo: e.target.value})} required />
              <textarea placeholder="Descripción" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={newPasivo.descripcion} onChange={e => setNewPasivo({...newPasivo, descripcion: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" placeholder="Monto" className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={newPasivo.montoTotal} onChange={e => setNewPasivo({...newPasivo, montoTotal: e.target.value})} required />
                <select className="w-full p-4 bg-gray-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={newPasivo.moneda} onChange={e => setNewPasivo({...newPasivo, moneda: e.target.value})}>
                  <option value="USD">USD</option><option value="ARS">ARS</option><option value="BRL">BRL</option><option value="EUR">EUR</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-200">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL */}
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
                <p className="text-center text-gray-400 py-10 font-bold italic text-sm">No hay pagos registrados aún.</p>
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