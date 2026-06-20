import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocation } from "react-router-dom";

// Componentes financieros reutilizados
import Ingreso from './Ingreso';
import Egreso from './Egreso';
import Pasivos from './Pasivos';

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

const sx = {
  label: { fontSize: 11, color: NA.text2, display: 'block', marginBottom: 5, fontWeight: 500 },
  input: {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    border: `0.5px solid ${NA.border}`, background: '#fff',
    color: NA.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color .15s, box-shadow .15s',
  },
};
const focusOn = (e) => { e.target.style.borderColor = NA.primary; e.target.style.boxShadow = `0 0 0 3px ${NA.light}`; };
const focusOff = (e) => { e.target.style.borderColor = NA.border; e.target.style.boxShadow = 'none'; };

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
    formaPago: 'Efectivo', formaPagoOtro: '', moneda: 'R$_STONE_JOSE',
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
      setFinanceData(initialFinanceData);
      setView('INICIO');
    } catch (err) {
      console.error("Error finanzas:", err);
      alert("Error al registrar movimiento financiero");
    }
  };

  // --- SUB-COMPONENTES ---
  const InstructorSelector = ({ value, onChange, label, name, isFinance = false }) => (
    <div style={{ marginBottom: 0 }}>
      <label style={sx.label}>{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        style={{ ...sx.input, cursor: 'pointer' }}
        onFocus={focusOn}
        onBlur={focusOff}
        required={!isFinance} // No obligatorio en egresos generales
      >
        <option value="">Seleccionar...</option>
        {instructors.map(i => {
          const nombreCompleto = `${i.nombre} ${i.apellido}`.replace(/\s+/g, ' ').trim();
          return (
            <option key={i.id} value={isFinance ? nombreCompleto : i.id}>
              {nombreCompleto}
            </option>
          );
        })}
      </select>
    </div>
  );

  const MenuCard = ({ icon, title, sub, color, onClick }) => (
    <button
      onClick={onClick}
      style={{
        background: color, padding: '24px 16px', borderRadius: 16, color: '#fff',
        textAlign: 'center', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        transition: 'transform .15s, box-shadow .15s',
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 30 }} aria-hidden="true" />
      <div style={{ fontWeight: 500, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 11, opacity: 0.75 }}>{sub}</div>
    </button>
  );

  // --- RENDERIZADO DE VISTAS ---
  if (view === 'INICIO') {
    return (
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 4px 60px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: NA.text, margin: 0 }}>Panel de Secretaría</h1>
          <p style={{ fontSize: 12, color: NA.text2, margin: '2px 0 0' }}>Gestioná agenda, caja y cuentas corrientes</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <MenuCard icon="ti-device-desktop" title="Monitor" sub="Estados" color={NA.darker} onClick={() => setView('MONITOR')} />
          <MenuCard icon="ti-calendar-plus" title="Agendar" sub="Nueva clase" color={NA.dark} onClick={() => setView('CALENDARIO')} />
          <MenuCard icon="ti-receipt-2" title="Pasivos" sub="Deudas" color="#92400E" onClick={() => setView('PASIVOS')} />
          <MenuCard icon="ti-cash" title="Ingreso" sub="Caja" color={NA.primary} onClick={() => setView('INGRESO')} />
          <MenuCard icon="ti-minus" title="Egreso" sub="Gastos" color="#c23a3a" onClick={() => setView('EGRESO')} />
        </div>
      </div>
    );
  }

  if (view === 'MONITOR') {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 4px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setView('INICIO')}
              style={{ width: 36, height: 36, borderRadius: 10, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <i className="ti ti-arrow-left" style={{ fontSize: 17 }} aria-hidden="true" />
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 500, color: NA.text, margin: 0 }}>Monitor de operaciones</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {loading ? (
            <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: NA.text2 }}>Actualizando datos...</p>
          ) : agendaList.map(item => {
            const estadoColor = item.estado === 'RECHAZADA' ? '#B91C1C' : item.estado === 'PENDIENTE' ? '#92400E' : NA.dark;
            const estadoBg = item.estado === 'RECHAZADA' ? '#FEF2F2' : item.estado === 'PENDIENTE' ? '#FFFBEB' : NA.light;
            return (
              <div key={item.id} style={{ background: '#fff', borderRadius: 16, padding: 18, border: `0.5px solid ${NA.border}`, borderTop: `3px solid ${estadoColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: estadoBg, color: estadoColor, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {item.estado === 'PENDIENTE' ? 'Pendiente' : item.estado}
                  </span>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{item.fecha}</p>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: NA.text, margin: '0 0 2px' }}>{item.alumno}</h3>
                <p style={{ fontSize: 12, color: NA.dark, margin: '0 0 12px' }}>{item.nombreInstructor}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: NA.bg, borderRadius: 10, padding: 12, fontSize: 12, color: NA.text2, marginBottom: 12 }}>
                  <p style={{ margin: 0 }}>{item.lugar || 'Sin lugar'}</p>
                  <p style={{ margin: 0 }}>{item.hotelDerivacion || 'Sin hotel'}</p>
                  <p style={{ margin: 0 }}>{item.horas} hs · {item.hora?.substring(0, 5)}</p>
                  <p style={{ margin: 0, color: NA.dark, fontWeight: 500 }}>${item.tarifa}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `0.5px solid ${NA.border}`, paddingTop: 10 }}>
                  <div>
                    <span style={{ fontSize: 10, color: '#9ca3af', display: 'block' }}>Seña/Pagado</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: NA.text }}>${item.horasPagadas || 0}</span>
                  </div>
                  {item.estado === 'RECHAZADA' && (
                    <button
                      onClick={() => prepararReasignacion(item)}
                      style={{ background: '#B91C1C', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
                    >
                      Reasignar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (view === 'CALENDARIO') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 4px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setView('INICIO')}
            style={{ width: 36, height: 36, borderRadius: 10, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <i className="ti ti-arrow-left" style={{ fontSize: 17 }} aria-hidden="true" />
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: NA.text, margin: 0 }}>
            {agendaData.id ? 'Reasignar instructor' : 'Nueva asignación'}
          </h2>
        </div>

        <form onSubmit={handleAgendaSubmit}>
          <div style={{ background: '#fff', borderRadius: 16, border: `0.5px solid ${NA.border}`, padding: 22, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={sx.label}>Nombre alumno</label>
                <input type="text" placeholder="Juan" value={agendaData.alumno} onChange={e => setAgendaData({ ...agendaData, alumno: e.target.value })} style={sx.input} onFocus={focusOn} onBlur={focusOff} required />
              </div>
              <InstructorSelector
                label="Asignar instructor"
                name="instructorId"
                value={agendaData.instructorId}
                onChange={e => setAgendaData({ ...agendaData, instructorId: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={sx.label}>Fecha clase</label>
                <input type="date" value={agendaData.fecha} onChange={e => setAgendaData({ ...agendaData, fecha: e.target.value })} style={sx.input} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label style={sx.label}>Horario</label>
                <input type="time" value={agendaData.hora} onChange={e => setAgendaData({ ...agendaData, hora: e.target.value })} style={sx.input} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={sx.label}>Lugar / Spot</label>
                <input type="text" value={agendaData.lugar} onChange={e => setAgendaData({ ...agendaData, lugar: e.target.value })} style={sx.input} onFocus={focusOn} onBlur={focusOff} />
              </div>
              <div>
                <label style={sx.label}>Descripción / Hotel</label>
                <input type="text" value={agendaData.hotelDerivacion} onChange={e => setAgendaData({ ...agendaData, hotelDerivacion: e.target.value })} style={sx.input} onFocus={focusOn} onBlur={focusOff} />
              </div>
            </div>
          </div>

          <div style={{ background: NA.darker, borderRadius: 16, padding: 22, marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 14px' }}>Condiciones acordadas</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <div>
                <label style={{ ...sx.label, color: 'rgba(255,255,255,.6)' }}>Tarifa pactada</label>
                <input type="number" value={agendaData.tarifa} onChange={e => setAgendaData({ ...agendaData, tarifa: e.target.value })} style={{ ...sx.input, background: 'rgba(255,255,255,.08)', border: '0.5px solid rgba(255,255,255,.15)', color: '#fff' }} />
              </div>
              <div>
                <label style={{ ...sx.label, color: 'rgba(255,255,255,.6)' }}>Horas solicitadas</label>
                <input type="number" value={agendaData.horas} onChange={e => setAgendaData({ ...agendaData, horas: e.target.value })} style={{ ...sx.input, background: 'rgba(255,255,255,.08)', border: '0.5px solid rgba(255,255,255,.15)', color: '#fff' }} />
              </div>
              <div>
                <label style={{ ...sx.label, color: 'rgba(255,255,255,.6)' }}>Horas pagadas</label>
                <input type="number" value={agendaData.horasPagadas} onChange={e => setAgendaData({ ...agendaData, horasPagadas: e.target.value })} style={{ ...sx.input, background: 'rgba(255,255,255,.08)', border: '0.5px solid rgba(255,255,255,.15)', color: '#fff' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setView('INICIO')} style={{ flex: 1, padding: '14px', borderRadius: 12, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: NA.dark, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Confirmar asignación
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (view === 'INGRESO' || view === 'EGRESO') {
    const Component = view === 'INGRESO' ? Ingreso : Egreso;
    // Sin wrapper extra: Ingreso/Egreso ya traen su propio header,
    // padding y botón de volver con el diseño Náutica Atins.
    return (
      <Component
        formData={financeData}
        handleChange={e => setFinanceData({ ...financeData, [e.target.name]: e.target.value })}
        handleSubmit={handleFinanceSubmit}
        axiosConfig={axiosConfig}
        InstructorField={() => (
          <InstructorSelector
            label="Instructor relacionado (opcional)"
            name="instructor"
            isFinance={true}
            value={financeData.instructor}
            onChange={e => setFinanceData({ ...financeData, instructor: e.target.value })}
          />
        )}
        setView={(v) => setView(v || 'INICIO')}
      />
    );
  }

  if (view === 'PASIVOS') {
    return <Pasivos axiosConfig={axiosConfig} setView={setView} />;
  }
  return null;
};

export default Secretaria;