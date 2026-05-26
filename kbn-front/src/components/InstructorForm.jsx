import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

import Ingreso from './Ingreso';
import Egreso from './Egreso';
import Agenda from './Agenda';
import Estadisticas from './Estadisticas';

// ─────────────────────────────────────────────────────────────────
// Helper: decodifica la tarifa guardada en el campo descripcion
// Formato: "__tarifa__:120||Descripción visible"
// ─────────────────────────────────────────────────────────────────
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

const InstructorForm = () => {
  const { user, token, loading: authLoading } = useAuth();
  const [view, setView] = useState('AGENDA');
  const [agendaItems, setAgendaItems] = useState([]);
  const [clasesFinalizadas, setClasesFinalizadas] = useState([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);

  const [listaInstructores, setListaInstructores] = useState([]);

  // ── Pasivos cargados una sola vez ─────────────────────────────
  const [pasivos, setPasivos] = useState([]);

  const axiosConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    tipoTransaccion: 'INGRESO',
    fecha: today,
    actividad: 'Clase de Kite',
    actividadOtro: '',
    vendedor: '',
    instructor: '',
    detalles: '',
    horas: 0,
    tarifa: 0,
    total: 0,
    gastos: 0,
    comision: 0,
    formaPago: 'Efectivo',
    formaPagoOtro: '',
    moneda: 'BRL'
  });

  // 1. INSTRUCTORES
  useEffect(() => {
    const fetchUsuarios = async () => {
      if (user?.role === 'ADMINISTRADOR' && token) {
        try {
          const res = await axios.get('https://kbnadmin-production.up.railway.app/usuario', axiosConfig);
          setListaInstructores(res.data);
        } catch (error) {
          console.error('Error cargando instructores:', error);
        }
      }
    };
    fetchUsuarios();
  }, [user?.role, token, axiosConfig]);

  // 2. PASIVOS — se cargan al montar para tenerlos disponibles en handleSubmit
  useEffect(() => {
    const fetchPasivos = async () => {
      if (!token) return;
      try {
        const res = await axios.get('https://kbnadmin-production.up.railway.app/api/pasivos', axiosConfig);
        setPasivos(res.data);
      } catch (err) {
        console.error('Error cargando pasivos:', err);
      }
    };
    fetchPasivos();
  }, [token, axiosConfig]);

  // 3. NOMBRE INICIAL
  useEffect(() => {
    if (user && !formData.instructor) {
      setFormData(prev => ({ ...prev, instructor: `${user.nombre} ${user.apellido}` }));
    }
  }, [user, formData.instructor]);

  // 4. CÁLCULOS AUTOMÁTICOS
  useEffect(() => {
    const h = parseFloat(formData.horas) || 0;
    const t = parseFloat(formData.tarifa) || 0;
    const g = parseFloat(formData.gastos) || 0;
    const calculado = (h * t) - g;
    setFormData(prev => ({ ...prev, total: calculado > 0 ? calculado : 0 }));
  }, [formData.horas, formData.tarifa, formData.gastos]);

  // 5. AGENDA
  const fetchAgenda = useCallback(async () => {
    if (!user?.id || !token) return;
    setLoadingAgenda(true);
    try {
      const res = await axios.get(
        `https://kbnadmin-production.up.railway.app/api/agenda/instructor/${user.id}`,
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

  // 6. ESTADÍSTICAS
  const fetchEstadisticas = useCallback(async () => {
    if (!user || !token) return;
    try {
      const res = await axios.get(
        'https://kbnadmin-production.up.railway.app/api/clases/listar',
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

  // 7. ESTADO DE AGENDA
  const handleStatusChange = async (id, nuevoEstado) => {
    try {
      await axios.put(
        `https://kbnadmin-production.up.railway.app/api/agenda/${id}/estado`,
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

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Buscar pasivo de instructor por nombre ────────────────────
  const buscarPasivoInstructor = (nombreInstructor) => {
    return pasivos.find((p) => {
      const { esInstructor } = decodeTarifa(p.descripcion);
      return esInstructor && p.titulo.toLowerCase() === nombreInstructor.toLowerCase();
    }) || null;
  };

  // 8. SUBMIT — guarda la clase y acumula deuda al pasivo del instructor
  const handleSubmit = async e => {
    e.preventDefault();

    const payload = {
      ...formData,
      tipoTransaccion: view,
      actividad: formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad,
      formaPago: formData.formaPago === 'Otro' ? formData.formaPagoOtro : formData.formaPago,
      cantidadHoras: String(formData.horas),
      tarifaPorHora: String(formData.tarifa),
      total: String(formData.total),
      gastosAsociados: String(formData.gastos || '0'),
      instructor: formData.instructor,
    };

    try {
      // A. Guardar el ingreso/egreso normalmente
      await axios.post(
        'https://kbnadmin-production.up.railway.app/api/clases/guardar',
        payload,
        axiosConfig
      );

      // B. Si es INGRESO y el instructor tiene pasivo vinculado, acumular deuda
      if (view === 'INGRESO') {
        const pasivoInstructor = buscarPasivoInstructor(formData.instructor);

        if (pasivoInstructor) {
          const { tarifaHora } = decodeTarifa(pasivoInstructor.descripcion);
          const horas = parseFloat(formData.horas) || 0;
          const deuda = Math.round(tarifaHora * horas * 100) / 100;

          if (deuda > 0) {
            const montoActual = parseFloat(pasivoInstructor.montoTotal) || 0;
            const actividad = formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad;

            await axios.put(
              `https://kbnadmin-production.up.railway.app/api/pasivos/${pasivoInstructor.id}`,
              {
                ...pasivoInstructor,
                montoTotal: montoActual - deuda,
                historialPagos: [
                  ...(pasivoInstructor.historialPagos || []),
                  {
                    montoPagado: -deuda,
                    fecha: formData.fecha,
                    nota: `${actividad} · ${horas}h × ${tarifaHora} BRL/h`,
                  },
                ],
              },
              axiosConfig
            );

            // Refrescar pasivos locales para que el próximo submit use el saldo actualizado
            setPasivos(prev =>
              prev.map(p =>
                p.id === pasivoInstructor.id
                  ? {
                      ...p,
                      montoTotal: montoActual - deuda,
                      historialPagos: [
                        ...(p.historialPagos || []),
                        {
                          montoPagado: -deuda,
                          fecha: formData.fecha,
                          nota: `${actividad} · ${horas}h × ${tarifaHora} BRL/h`,
                        },
                      ],
                    }
                  : p
              )
            );
          }
        }
      }

      alert(`${view} registrado correctamente.`);
      setFormData(prev => ({
        ...prev,
        detalles: '',
        horas: 0,
        tarifa: 0,
        gastos: 0,
        total: 0,
        actividadOtro: '',
        formaPagoOtro: '',
        instructor: `${user.nombre} ${user.apellido}`,
      }));
      setView('AGENDA');
    } catch (error) {
      console.error(error);
      alert('Error al guardar registro.');
    }
  };

  // 9. INSTRUCTOR FIELD
  const InstructorField = () => {
    const isAdmin = user?.role === 'ADMINISTRADOR';

    // Detectar si el instructor seleccionado tiene pasivo vinculado
    const pasivoVinculado = buscarPasivoInstructor(formData.instructor);
    const horas = parseFloat(formData.horas) || 0;
    const deudaPreview = pasivoVinculado
      ? Math.round(decodeTarifa(pasivoVinculado.descripcion).tarifaHora * horas * 100) / 100
      : 0;

    return (
      <div className="mb-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">Instructor Responsable</label>

        {isAdmin ? (
          <select
            name="instructor"
            value={formData.instructor}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2 border-gray-300 focus:border-green-500 focus:ring-green-500 bg-white"
            required
          >
            <option value={`${user.nombre} ${user.apellido}`}>
              {user.nombre} {user.apellido} (Tú)
            </option>
            {listaInstructores
              .filter(ins => `${ins.nombre} ${ins.apellido}` !== `${user.nombre} ${user.apellido}`)
              .map(ins => (
                <option key={ins.id} value={`${ins.nombre} ${ins.apellido}`}>
                  {ins.nombre} {ins.apellido}
                </option>
              ))}
          </select>
        ) : (
          <input
            type="text"
            value={formData.instructor}
            readOnly
            className="mt-1 block w-full rounded-md border p-2 border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed"
          />
        )}

        {/* Aviso si el instructor no tiene cuenta corriente */}
        {view === 'INGRESO' && !pasivoVinculado && formData.instructor && formData.instructor !== 'Secretaria' && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[11px] text-gray-400 font-bold">
            ℹ️ <span className="text-gray-600">{formData.instructor}</span> no tiene cuenta corriente.
            Creala en <span className="text-indigo-500">Cuentas Corrientes → 🎓 Instructor</span>.
          </div>
        )}
      </div>
    );
  };

  if (authLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <p className="font-black text-gray-300 animate-pulse italic uppercase tracking-tighter">Cargando...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:mt-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">KBN Panel</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <p className="text-indigo-600 font-black text-xs uppercase tracking-widest">
              {user?.nombre} {user?.apellido} ({user?.role})
            </p>
          </div>
        </div>

        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {['AGENDA', 'INGRESO', 'EGRESO', 'ESTADISTICAS'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 md:flex-none px-5 py-3 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {v === 'ESTADISTICAS' ? '📊 Estadísticas' : v}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {view === 'AGENDA' && (
          <Agenda
            agendaItems={agendaItems}
            loadingAgenda={loadingAgenda}
            handleStatusChange={handleStatusChange}
          />
        )}

        {view === 'INGRESO' && (
          <Ingreso
            formData={formData}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            InstructorField={InstructorField}
            setView={setView}
          />
        )}

        {view === 'EGRESO' && (
          <Egreso
            formData={formData}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            InstructorField={InstructorField}
            setView={setView}
          />
        )}

        {view === 'ESTADISTICAS' && (
          <Estadisticas clases={clasesFinalizadas} />
        )}
      </div>
    </div>
  );
};

export default InstructorForm;