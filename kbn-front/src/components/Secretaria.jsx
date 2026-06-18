import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocation } from "react-router-dom";

// Componentes financieros reutilizados
import Ingreso from './Ingreso';
import Egreso from './Egreso';
import Pasivos from './Pasivos';

const Secretaria = () => {
  const { user, token } = useAuth(); // Extraemos el token para las peticiones
  const [view, setView] = useState('INICIO'); 
  const [instructors, setInstructors] = useState([]);
  const [agendaList, setAgendaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Configuramos las cabeceras de autorización de forma centralizada
  const axiosConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const today = new Date().toISOString().split('T')[0];
  
  const initialAgendaData = {
    alumno: '', fecha: today, hora: '10:00', instructorId: '',
    lugar: '', tarifa: '', horas: 1, horasPagadas: 0,
    hotelDerivacion: '', estado: 'PENDIENTE'
  };
  const [agendaData, setAgendaData] = useState(initialAgendaData);

  // AGREGAMOS pasivoId PARA PODER VINCULAR EL EGRESO CON LA DEUDA
  const initialFinanceData = {
    tipoTransaccion: 'INGRESO', fecha: today, actividad: 'Clases',
    actividadOtro: '', vendedor: '', instructor: '', detalles: '',
    horas: 0, tarifa: 0, total: 0, gastos: 0, comision: 0,
    formaPago: 'Efectivo', formaPagoOtro: '', moneda: 'R$_STONE_IGNA',
    pasivoId: '' // <- CLAVE PARA PAGAR PASIVOS
  };
  const [financeData, setFinanceData] = useState(initialFinanceData);

  // --- CARGA DE DATOS CON SEGURIDAD (TOKEN) ---
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [resUsers, resAgenda] = await Promise.all([
        axios.get('https://kbn-admin-production.up.railway.app/usuario', axiosConfig),
        axios.get('https://kbn-admin-production.up.railway.app/api/agenda/listar', axiosConfig)
      ]);
      
      setInstructors(resUsers.data);
      
      const sorted = resAgenda.data.sort((a, b) => {
        const order = { 'RECHAZADA': 0, 'PENDIENTE': 1, 'CONFIRMADA': 2 };
        return order[a.estado] - order[b.estado] || new Date(b.fecha) - new Date(a.fecha);
      });
      setAgendaList(sorted);
    } catch (err) {
      console.error('Error cargando datos de Secretaria:', err);
    } finally {
      setLoading(false);
    }
  }, [token, axiosConfig]);

  useEffect(() => {
    fetchData();
  }, [fetchData, view]);

// useEffect(() => {
//   setView('INICIO');
// }, [location.pathname]);
  
  useEffect(() => {
    const total = Number(financeData.horas) * Number(financeData.tarifa);
    setFinanceData(prev => ({
      ...prev,
      total
    }));
  }, [financeData.horas, financeData.tarifa]);

  // --- MANEJADORES DE EVENTOS ---
  const handleAgendaSubmit = async (e) => {
    e.preventDefault();
    if (!agendaData.instructorId) return alert("Por favor selecciona un instructor");

    const dataToSubmit = {
      ...agendaData,
      instructorId: Number(agendaData.instructorId),
      tarifa: Number(agendaData.tarifa),
      horas: Number(agendaData.horas),
      horasPagadas: Number(agendaData.horasPagadas)
    };

    try {
      await axios.post('https://kbn-admin-production.up.railway.app/api/agenda/crear', dataToSubmit, axiosConfig);
      alert(agendaData.id ? "Clase reasignada con éxito" : "Clase agendada con éxito");
      setAgendaData(initialAgendaData);
      setView('MONITOR');
    } catch (err) { 
      console.error("Detalle del error:", err.response?.data);
      alert("Error al guardar en agenda. Verifica los permisos."); 
    }
  };

  const prepararReasignacion = (clase) => {
    setAgendaData({ ...clase, estado: 'PENDIENTE' });
    setView('CALENDARIO');
  };

  const handleFinanceSubmit = async (e) => {
    e.preventDefault();
    try {
      // Si el pasivoId está vacío, lo mandamos como null para que el backend no falle
      const payload = { 
        ...financeData, 
        tipoTransaccion: view,
        pasivoId: financeData.pasivoId ? Number(financeData.pasivoId) : null
      };
      await axios.post('https://kbn-admin-production.up.railway.app/api/clases/guardar', payload, axiosConfig);
      alert(`${view} registrado correctamente.`);
      setFinanceData(initialFinanceData);
      setView('INICIO');
    } catch (err) { 
      console.error("Error finanzas:", err);
      alert("Error al registrar movimiento financiero"); 
    }
  };

  // --- SUB-COMPONENTES ---
  const InstructorSelector = ({ value, onChange, label, name, isFinance = false }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 uppercase ml-2">{label}</label>
      <select 
        name={name}
        value={value} 
        onChange={onChange} 
        className="p-4 bg-gray-50 rounded-2xl w-full border-none focus:ring-2 focus:ring-indigo-500 font-bold" 
        required={!isFinance} // Hacemos que no sea obligatorio en egresos generales
      >
        <option value="">Seleccionar...</option>
        {instructors.map(i => (
          <option key={i.id} value={isFinance ? `${i.nombre} ${i.apellido}` : i.id}>
            {i.nombre} {i.apellido}
          </option>
        ))}
      </select>
    </div>
  );
  <MenuCard
  icon="💰"
  title="Ingreso"
  sub="Caja"
  color="bg-emerald-600"
  onClick={() => {
    console.log('CLICK INGRESO');
    setView('INGRESO');
  }}
/>

  // --- RENDERIZADO DE VISTAS ---
  if (view === 'INICIO') {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-10 mt-5 animate-fadeIn">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-8 text-center uppercase italic tracking-tighter">Panel de Secretaria KBN</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <MenuCard icon="🖥️" title="Monitor" sub="Estados" color="bg-gray-900" onClick={() => setView('MONITOR')} />
          <MenuCard icon="📅" title="Agendar" sub="Nueva Clase" color="bg-indigo-600" onClick={() => setView('CALENDARIO')} />
          <MenuCard icon="📉" title="Pasivos" sub="Deudas" color="bg-amber-500" onClick={() => setView('PASIVOS')} />
          <MenuCard icon="💰" title="Ingreso" sub="Caja" color="bg-emerald-600" onClick={() => setView('INGRESO')} />
          <MenuCard icon="💸" title="Egreso" sub="Gastos" color="bg-rose-600" onClick={() => setView('EGRESO')} />
        </div>
      </div>
    );
  }

  if (view === 'MONITOR') {
    return (
      <div className="max-w-6xl mx-auto p-4 animate-fadeIn">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-black uppercase text-gray-800 italic">Monitor de Operaciones</h2>
          <button onClick={() => setView('INICIO')} className="text-indigo-600 font-bold text-sm uppercase tracking-widest">← VOLVER</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? <p className="col-span-full text-center py-10 font-bold text-gray-400">Actualizando datos...</p> : 
            agendaList.map(item => (
            <div key={item.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border-t-8 transition-all ${
              item.estado === 'RECHAZADA' ? 'border-rose-500 shadow-rose-50' : 
              item.estado === 'PENDIENTE' ? 'border-amber-400 shadow-amber-50' : 'border-emerald-500 shadow-emerald-50'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                  item.estado === 'RECHAZADA' ? 'bg-rose-100 text-rose-700' : 
                  item.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {item.estado === 'PENDIENTE' ? '⏳ Pendiente' : item.estado}
                </span>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{item.fecha}</p>
              </div>
              <h3 className="font-black text-gray-800 uppercase text-lg leading-tight mb-1 truncate">{item.alumno}</h3>
              <p className="text-xs font-bold text-indigo-600 mb-4 tracking-wide italic">🏄‍♂️ {item.nombreInstructor}</p>
              <div className="grid grid-cols-2 gap-3 text-[11px] bg-gray-50 p-4 rounded-2xl font-bold text-gray-500 mb-4">
                <p className="truncate">📍 {item.lugar || 'No especif.'}</p>
                <p className="truncate">🏨 {item.hotelDerivacion || 'Sin Hotel'}</p>
                <p>⏱️ {item.horas} hs / {item.hora?.substring(0,5)} hs</p>
                <p className="text-emerald-600 font-black">💵 TARIFA: ${item.tarifa}</p>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-auto">
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400 uppercase font-black">Seña/Pagado</span>
                  <span className="text-sm font-black text-gray-700">${item.horasPagadas || 0}</span>
                </div>
                {item.estado === 'RECHAZADA' && (
                  <button onClick={() => prepararReasignacion(item)} className="bg-rose-600 text-white text-[10px] px-4 py-2 rounded-xl font-black uppercase hover:scale-105 transition-all shadow-lg shadow-rose-200">Reasignar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'CALENDARIO') {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-10 bg-white shadow-2xl rounded-[2.5rem] mt-5 md:mt-10 border border-gray-100 animate-fadeIn">
        <button onClick={() => setView('INICIO')} className="text-indigo-600 font-bold text-sm uppercase tracking-widest mb-4">← VOLVER</button>
        <h2 className="text-2xl font-black text-center mb-8 uppercase italic tracking-tighter">{agendaData.id ? '🔄 Reasignar Instructor' : '📅 Nueva Asignación'}</h2>
        <form onSubmit={handleAgendaSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nombre Alumno</label>
              <input type="text" placeholder="Juan " value={agendaData.alumno} onChange={e => setAgendaData({...agendaData, alumno: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none focus:ring-2 focus:ring-indigo-500 font-bold" required />
            </div>
            <InstructorSelector 
              label="Asignar Instructor" 
              name="instructorId" 
              value={agendaData.instructorId} 
              onChange={e => setAgendaData({...agendaData, instructorId: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Fecha Clase</label>
              <input type="date" value={agendaData.fecha} onChange={e => setAgendaData({...agendaData, fecha: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Horario</label>
              <input type="time" value={agendaData.hora} onChange={e => setAgendaData({...agendaData, hora: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Lugar / Spot" value={agendaData.lugar} onChange={e => setAgendaData({...agendaData, lugar: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold shadow-inner" />
            <input type="text" placeholder="Descripción / Hotel" value={agendaData.hotelDerivacion} onChange={e => setAgendaData({...agendaData, hotelDerivacion: e.target.value})} className="p-4 bg-gray-50 rounded-2xl w-full border-none font-bold shadow-inner" />
          </div>
          <div className="grid grid-cols-3 gap-3 bg-indigo-50 p-6 rounded-[2rem] border-2 border-indigo-100 shadow-inner">
            <div>
              <label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Tarifa Pactada</label>
              <input type="number" value={agendaData.tarifa} onChange={e => setAgendaData({ ...agendaData, tarifa: e.target.value })} className="w-full bg-transparent border p-2 rounded text-xl font-black text-indigo-700 p-0" />
            </div>
            <div>
              <label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Horas Solicitadas</label>
              <input type="number" value={agendaData.horas} onChange={e => setAgendaData({ ...agendaData, horas: e.target.value })} className="w-full bg-transparent border p-2 rounded text-xl font-black text-indigo-700 p-0" />
            </div>
            <div>
              <label className="text-[9px] font-black text-indigo-400 uppercase ml-1">Horas Pagadas</label>
              <input type="number" value={agendaData.horasPagadas} onChange={e => setAgendaData({ ...agendaData, horasPagadas: e.target.value })} className="w-full bg-transparent border p-2 rounded text-xl font-black text-indigo-700 p-0" />
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 pt-4">
            <button type="submit" className="flex-[2] bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all">Confirmar Asignación</button>
            <button type="button" onClick={() => setView('INICIO')} className="flex-1 bg-gray-100 text-gray-400 p-5 rounded-2xl font-black uppercase hover:bg-gray-200 transition-all">Cancelar</button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'INGRESO' || view === 'EGRESO') {
    const Component = view === 'INGRESO' ? Ingreso : Egreso;
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 mt-5 animate-fadeIn">
        <button onClick={() => setView('INICIO')} className="text-indigo-600 font-bold text-sm uppercase tracking-widest mb-4">← VOLVER</button>
        <Component 
          formData={financeData} 
          handleChange={e => setFinanceData({...financeData, [e.target.name]: e.target.value})}
          handleSubmit={handleFinanceSubmit} 
          axiosConfig={axiosConfig} /* Pasamos axiosConfig por si Egreso necesita cargar los pasivos */
          InstructorField={() => (
            <InstructorSelector 
              label="Instructor Relacionado (Opcional)" 
              name="instructor" 
              isFinance={true}
              value={financeData.instructor} 
              onChange={e => setFinanceData({...financeData, instructor: e.target.value})} 
            />
          )}
          setView={setView} 
        />
      </div>
    );
  }

  if (view === 'PASIVOS') {
    return <Pasivos axiosConfig={axiosConfig} setView={setView} />;
  }
  return null;
};

const MenuCard = ({ icon, title, sub, color, onClick }) => (
  <button onClick={onClick} className={`${color} p-6 md:p-8 rounded-[2rem] text-white text-center transition-all active:scale-90 shadow-xl hover:shadow-2xl`}>
    <div className="text-4xl md:text-5xl mb-3">{icon}</div>
    <div className="font-black uppercase text-sm md:text-xl tracking-tighter">{title}</div>
    <div className="text-[10px] opacity-60 uppercase font-black tracking-widest mt-1">{sub}</div>
  </button>
);

export default Secretaria;