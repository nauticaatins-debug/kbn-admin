import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// import Ingreso from './Ingreso';
// import Egreso from './Egreso';
import Agenda from './Agenda';
import Estadisticas from './Estadisticas';
import NotificationBanner from './NotificationBanner';

// const TARIFA_PREFIX = '__tarifa__:';

// const decodeTarifa = (descripcionRaw) => {
//   if (!descripcionRaw || !descripcionRaw.startsWith(TARIFA_PREFIX)) {
//     return { tarifaHora: null, esInstructor: false };
//   }
//   const sin = descripcionRaw.slice(TARIFA_PREFIX.length);
//   const sep = sin.indexOf('||');
//   const tarifaHora = parseFloat(sin.slice(0, sep));
//   return { tarifaHora, esInstructor: true };
// };

// Íconos inline para las tabs (sin dependencia externa)
const TAB_ICONS = {
  AGENDA:      '🗓️',
  ESTADISTICAS:'📊',
};

const TAB_LABELS = {
  AGENDA:      'Agenda',
  ESTADISTICAS:'Stats',
};

const InstructorForm = () => {
  const { user, token, loading: authLoading } = useAuth();
  const [view, setView] = useState('AGENDA');
  const [agendaItems, setAgendaItems] = useState([]);
  const [clasesFinalizadas, setClasesFinalizadas] = useState([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  // const [listaInstructores, setListaInstructores] = useState([]);
  // const [pasivos, setPasivos] = useState([]);
  const [fadeKey, setFadeKey] = useState(0); // para trigger de animación CSS pura

  const axiosConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  // const today = new Date().toISOString().split('T')[0];

  // const [formData, setFormData] = useState({
  //   tipoTransaccion: 'INGRESO',
  //   fecha: today,
  //   actividad: 'Clase de Kite',
  //   actividadOtro: '',
  //   vendedor: '',
  //   instructor: '',
  //   detalles: '',
  //   horas: 0,
  //   tarifa: 0,
  //   total: 0,
  //   gastos: 0,
  //   comision: 0,
  //   formaPago: 'Efectivo',
  //   formaPagoOtro: '',
  //   moneda: 'BRL',
  // });

  // ── 1. INSTRUCTORES ────────────────────────────────────────────────────────
  // useEffect(() => {
  //   const fetchUsuarios = async () => {
  //     if (user?.role === 'ADMINISTRADOR' && token) {
  //       try {
  //         const res = await axios.get('https://kbnadmin-production.up.railway.app/usuario', axiosConfig);
  //         setListaInstructores(res.data);
  //       } catch (error) {
  //         console.error('Error cargando instructores:', error);
  //       }
  //     }
  //   };
  //   fetchUsuarios();
  // }, [user?.role, token, axiosConfig]);

  // ── 2. PASIVOS ─────────────────────────────────────────────────────────────
  // const fetchPasivos = useCallback(async () => {
  //   if (!token) return;
  //   try {
  //     const res = await axios.get('https://kbn-admin-production.up.railway.app/api/pasivos', axiosConfig);
  //     setPasivos(res.data);
  //   } catch (err) {
  //     console.error('Error cargando pasivos:', err);
  //   }
  // }, [token, axiosConfig]);

  // useEffect(() => { fetchPasivos(); }, [fetchPasivos]);

  // ── 3. NOMBRE INICIAL ──────────────────────────────────────────────────────
  // useEffect(() => {
  //   if (user && !formData.instructor) {
  //     setFormData(prev => ({ ...prev, instructor: `${user.nombre} ${user.apellido}` }));
  //   }
  // }, [user, formData.instructor]);

  // ── 4. CÁLCULOS AUTOMÁTICOS ────────────────────────────────────────────────
  // useEffect(() => {
  //   const h = parseFloat(formData.horas) || 0;
  //   const t = parseFloat(formData.tarifa) || 0;
  //   const g = parseFloat(formData.gastos) || 0;
  //   const calculado = (h * t) - g;
  //   setFormData(prev => ({ ...prev, total: calculado > 0 ? calculado : 0 }));
  // }, [formData.horas, formData.tarifa, formData.gastos]);

  // ── 5. AGENDA ──────────────────────────────────────────────────────────────
  const fetchAgenda = useCallback(async () => {
    if (!user?.id || !token) return;
    setLoadingAgenda(true);
    try {
      const res = await axios.get(
        `https://kbn-admin-production.up.railway.app/api/agenda/instructor/${user.id}`,
        axiosConfig
      );
      const sorted = res.data.sort((a, b) => {
        const order = { PENDIENTE: 0, CONFIRMADA: 1, RECHAZADA: 2 };
        if (order[a.estado] !== order[b.estado]) return order[a.estado] - order[b.estado];
        return new Date(b.fecha) - new Date(a.fecha);
      });
      setAgendaItems(sorted);
    } catch (error) {
      console.error('Error cargando agenda:', error);
    } finally {
      setLoadingAgenda(false);
    }
  }, [user?.id, token, axiosConfig]);

  // ── 6. ESTADÍSTICAS ────────────────────────────────────────────────────────
  const fetchEstadisticas = useCallback(async () => {
    if (!user || !token) return;
    try {
      const res = await axios.get(
        'https://kbn-admin-production.up.railway.app/api/clases/listar',
        axiosConfig
      );
      const isAdmin = user?.role === 'ADMINISTRADOR';
      const filtradas = res.data.filter(c =>
        (isAdmin || c.instructor === `${user.nombre} ${user.apellido}`) &&
        c.tipoTransaccion === 'INGRESO'
      );
      setClasesFinalizadas(filtradas);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }, [user, token, axiosConfig]);

  useEffect(() => {
    if (!authLoading && token) {
      if (view === 'AGENDA') fetchAgenda();
      if (view === 'ESTADISTICAS') fetchEstadisticas();
    }
  }, [view, authLoading, token, fetchAgenda, fetchEstadisticas]);

  // ── 7. CAMBIO DE TAB ───────────────────────────────────────────────────────
  const handleViewChange = (v) => {
    setView(v || 'AGENDA');
    setFadeKey(k => k + 1); // resetea animación CSS
  };

  // ── 8. ESTADO DE AGENDA ────────────────────────────────────────────────────
  const handleStatusChange = async (id, nuevoEstado) => {
    try {
      await axios.put(
        `https://kbn-admin-production.up.railway.app/api/agenda/${id}/estado`,
        nuevoEstado,
        { headers: { ...axiosConfig.headers, 'Content-Type': 'text/plain' } }
      );
      setAgendaItems(prev =>
        prev.map(item => item.id === id ? { ...item, estado: nuevoEstado } : item)
      );
      if (nuevoEstado === 'RECHAZADA') fetchAgenda();
    } catch (error) {
      alert('Error al actualizar estado.');
    }
  };

  // const handleChange = e => {
  //   const { name, value } = e.target;
  //   setFormData(prev => ({ ...prev, [name]: value }));
  // };

  // const buscarPasivoInstructor = (nombreInstructor) => {
  //   return pasivos.find((p) => {
  //     const { esInstructor } = decodeTarifa(p.descripcion);
  //     return esInstructor && p.titulo.toLowerCase() === nombreInstructor.toLowerCase();
  //   }) || null;
  // };

  // ── 9. SUBMIT ──────────────────────────────────────────────────────────────
  // const handleSubmit = async e => {
  //   e.preventDefault();
  //
  //   const actividad = formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad;
  //   const formaPago = formData.formaPago === 'Otro' ? formData.formaPagoOtro : formData.formaPago;
  //
  //   const payload = {
  //     ...formData,
  //     tipoTransaccion: view,
  //     actividad,
  //     formaPago,
  //     cantidadHoras: String(formData.horas),
  //     tarifaPorHora: String(formData.tarifa),
  //     total: String(formData.total),
  //     gastosAsociados: String(formData.gastos || '0'),
  //     instructor: formData.instructor,
  //   };
  //
  //   try {
  //     await axios.post(
  //       'https://kbn-admin-production.up.railway.app/api/clases/guardar',
  //       payload,
  //       axiosConfig
  //     );
  //
  //     if (view === 'INGRESO') {
  //       const resPasivos = await axios.get(
  //         'https://kbn-admin-production.up.railway.app/api/pasivos',
  //         axiosConfig
  //       );
  //       const pasivosActuales = resPasivos.data;
  //       setPasivos(pasivosActuales);
  //
  //       const pasivoInstructor = pasivosActuales.find((p) => {
  //         const { esInstructor } = decodeTarifa(p.descripcion);
  //         return esInstructor && p.titulo.toLowerCase() === formData.instructor.toLowerCase();
  //       });
  //
  //       if (pasivoInstructor) {
  //         const { tarifaHora } = decodeTarifa(pasivoInstructor.descripcion);
  //         const horas = parseFloat(formData.horas) || 0;
  //         const deuda = Math.round(tarifaHora * horas * 100) / 100;
  //
  //         if (deuda > 0) {
  //           const detalles = formData.detalles ? ` — ${formData.detalles}` : '';
  //           const nota = `Pago por ${horas}h de ${actividad}${detalles} · ${horas}h × ${tarifaHora} BRL/h = ${deuda.toFixed(2)} BRL`;
  //
  //           await axios.post(
  //             'https://kbn-admin-production.up.railway.app/api/clases/guardar',
  //             {
  //               tipoTransaccion: 'EGRESO',
  //               tipoMovimientoPasivo: 'NUEVA_DEUDA',
  //               pasivoId: pasivoInstructor.id,
  //               total: String(-deuda),
  //               fecha: formData.fecha,
  //               moneda: pasivoInstructor.moneda,
  //               formaPago: 'Efectivo',
  //               detalles: nota,
  //               actividad: 'Pago Pasivo',
  //               instructor: formData.instructor,
  //             },
  //             axiosConfig
  //           );
  //         }
  //       }
  //     }
  //
  //     alert(`${view} registrado correctamente.`);
  //     setFormData(prev => ({
  //       ...prev,
  //       detalles: '',
  //       horas: 0,
  //       tarifa: 0,
  //       gastos: 0,
  //       total: 0,
  //       actividadOtro: '',
  //       formaPagoOtro: '',
  //       instructor: `${user.nombre} ${user.apellido}`,
  //     }));
  //     handleViewChange('AGENDA');
  //   } catch (error) {
  //     console.error(error);
  //     alert('Error al guardar registro.');
  //   }
  // };

  // ── 10. INSTRUCTOR FIELD ───────────────────────────────────────────────────
  // const InstructorField = () => {
  //   const isAdmin = user?.role === 'ADMINISTRADOR';
  //
  //   return (
  //     <div className="mb-4 space-y-2">
  //       <label className="block text-sm font-medium text-gray-700">
  //         Instructor Responsable
  //       </label>
  //       {isAdmin ? (
  //         <select
  //           name="instructor"
  //           value={formData.instructor}
  //           onChange={handleChange}
  //           className="mt-1 block w-full rounded-md border p-2 border-gray-300 focus:border-green-500 focus:ring-green-500 bg-white text-sm"
  //           required
  //         >
  //           <option value={`${user.nombre} ${user.apellido}`}>
  //             {user.nombre} {user.apellido} (Tú)
  //           </option>
  //           {listaInstructores
  //             .filter(ins => `${ins.nombre} ${ins.apellido}` !== `${user.nombre} ${user.apellido}`)
  //             .map(ins => (
  //               <option key={ins.id} value={`${ins.nombre} ${ins.apellido}`}>
  //                 {ins.nombre} {ins.apellido}
  //               </option>
  //             ))}
  //         </select>
  //       ) : (
  //         <input
  //           type="text"
  //           value={formData.instructor}
  //           readOnly
  //           className="mt-1 block w-full rounded-md border p-2 border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed text-sm"
  //         />
  //       )}
  //     </div>
  //   );
  // };

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <p className="font-black text-gray-300 animate-pulse italic uppercase tracking-tighter text-lg">
        Cargando...
      </p>
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Animación CSS pura — sin plugins de Tailwind */}
      <style>{`
        @keyframes kbn-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .kbn-view {
          animation: kbn-fadein 0.35s ease both;
        }
        /* Ocultar scrollbar horizontal en la tab bar */
        .kbn-tabs::-webkit-scrollbar { display: none; }
        .kbn-tabs { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-3 py-4 md:px-6 md:py-8">

          {/* ── HEADER ── */}
          <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-gray-100 px-5 py-5 md:px-8 md:py-6 mb-4">

            {/* Brand + usuario */}
            <div className="flex items-center justify-between mb-4 md:mb-5">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">
                  KBN Panel
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping flex-shrink-0" />
                  <p className="text-indigo-600 font-black text-[10px] md:text-xs uppercase tracking-widest truncate">
                    {user?.nombre} {user?.apellido}
                    <span className="text-indigo-300 ml-1">({user?.role})</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Tab bar — scroll horizontal en mobile, wrap en desktop */}
            <div className="kbn-tabs flex bg-gray-100 p-1 rounded-xl overflow-x-auto gap-1">
              {['AGENDA', 'ESTADISTICAS'].map(v => (
                <button
                  key={v}
                  onClick={() => handleViewChange(v)}
                  className={`
                    flex-shrink-0 flex items-center justify-center gap-1.5
                    px-4 py-2.5 rounded-lg
                    text-[11px] md:text-xs font-black uppercase tracking-wide
                    transition-all duration-200 whitespace-nowrap
                    ${view === v
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                    }
                  `}
                >
                  <span>{TAB_ICONS[v]}</span>
                  <span>{TAB_LABELS[v]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── NOTIFICACIONES ── */}
          <NotificationBanner axiosConfig={axiosConfig} userId={user?.id} />

          {/* ── CONTENIDO ── */}
          <div key={fadeKey} className="kbn-view">
            {view === 'AGENDA' && (
              <Agenda
                agendaItems={agendaItems}
                loadingAgenda={loadingAgenda}
                handleStatusChange={handleStatusChange}
              />
            )}

            {/* 
            {view === 'INGRESO' && (
              <Ingreso
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                InstructorField={InstructorField}
                setView={handleViewChange}
              />
            )}

            {view === 'EGRESO' && (
              <Egreso
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                InstructorField={InstructorField}
                setView={handleViewChange}
              />
            )}
            */}

            {view === 'ESTADISTICAS' && (
              <Estadisticas clases={clasesFinalizadas} />
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default InstructorForm;