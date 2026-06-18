import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import api from '../axiosConfig';
import { useAuth } from '../context/AuthContext';
import ReportesEstadisticasGraficos from './ReportesEstadisticasGraficos';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const HANS_PCT = 5;

const calcularReparto = (asignadoA, montoBase) => {
  let pIgna = 8, pJose = 8;
  if (asignadoA === 'IGNA')       { pIgna = 16; pJose = 8; }
  else if (asignadoA === 'JOSE')  { pIgna = 8;  pJose = 16; }
  else if (asignadoA === 'AMBOS') { pIgna = 12.5; pJose = 12.5; }
  else                            { pIgna = 10; pJose = 10; }
  const pHans = HANS_PCT;
  return {
    pIgna, pJose, pHans,
    mIgna: (montoBase * pIgna) / 100,
    mJose: (montoBase * pJose) / 100,
    mHans: (montoBase * pHans) / 100,
  };
};

// ── Nombres EXACTOS de las tarjetas en Pasivos ──────────────────
const PASIVO_TITULOS = {
  JOSE: 'José Sánchez',
  IGNA: 'Igna Krebs',
  HANS: 'Hans Leonhard Wurbs',
};

// ── Colores Náutica Atins ─────────────────────────────────────────
const NA = {
  primary:  '#1ABFA0',
  dark:     '#0F6E56',
  darker:   '#085041',
  light:    '#E1F5EE',
  mid:      '#9FE1CB',
  bg:       '#f0faf7',
  text:     '#0a2e27',
  text2:    '#3a6b5e',
  border:   '#c5e8df',
};

const ReporteEstadisticas = () => {
  const { token } = useAuth();

  const axiosConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const [allData,    setAllData]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pendientes, setPendientes] = useState([]);
  const [egresos,    setEgresos]    = useState([]);
  const [asignados,  setAsignados]  = useState([]);
  const [pasivos,    setPasivos]    = useState([]);

  const [mostrarFiltros,       setMostrarFiltros]       = useState(false);
  const [showOtherCurrencies,  setShowOtherCurrencies]  = useState(false);
  const [expandedId,           setExpandedId]           = useState(null);

  const [filtros, setFiltros] = useState({
    moneda: '', formaPago: '', instructor: '',
    actividad: '', fechaInicio: '', fechaFin: '', asignadoA: ''
  });

  useEffect(() => {
    if (token) { fetchData(); fetchPasivos(); }
  }, [token]);

  const fetchPasivos = async () => {
    try {
      const res = await api.get('/api/pasivos');
      setPasivos(res.data);
    } catch (e) { console.error('Error cargando pasivos', e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/clases/listar', axiosConfig);
      const data = response.data;
      const listPendientes = [], listEgresos = [], listAsignados = [];
      data.forEach(item => {
        if (item.tipoTransaccion === 'EGRESO') {
          listEgresos.push(item);
        } else if (item.tipoTransaccion === 'INGRESO') {
          if (!item.asignadoA || item.asignadoA.trim() === '' || item.asignadoA.toUpperCase() === 'NINGUNO') {
            item.asignadoA = 'NINGUNO';
            listPendientes.push(item);
          } else {
            listAsignados.push(item);
          }
        }
      });
      setAllData(data);
      setPendientes(listPendientes);
      setEgresos(listEgresos);
      setAsignados(listAsignados);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const instructoresDisponibles = useMemo(() => {
    const set = new Set(allData.map(i => i.instructor).filter(Boolean));
    return Array.from(set);
  }, [allData]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const limpiarFiltros = () => setFiltros({
    moneda: '', formaPago: '', instructor: '',
    actividad: '', fechaInicio: '', fechaFin: '', asignadoA: ''
  });

  const aplicarFiltros = (lista, ignorarAsignadoA = false) => lista.filter(item => {
    if (filtros.moneda      && item.moneda      !== filtros.moneda)      return false;
    if (filtros.formaPago   && item.formaPago   !== filtros.formaPago)   return false;
    if (filtros.instructor  && item.instructor  !== filtros.instructor)  return false;
    if (filtros.actividad   && item.actividad   !== filtros.actividad)   return false;
    if (filtros.fechaInicio && item.fecha < filtros.fechaInicio)         return false;
    if (filtros.fechaFin    && item.fecha > filtros.fechaFin)            return false;
    if (!ignorarAsignadoA && filtros.asignadoA && item.asignadoA !== filtros.asignadoA) return false;
    return true;
  });

  const pendientesFiltrados      = useMemo(() => aplicarFiltros(pendientes),        [pendientes, filtros]);
  const egresosFiltrados         = useMemo(() => aplicarFiltros(egresos),           [egresos,    filtros]);
  const asignadosFiltrados       = useMemo(() => aplicarFiltros(asignados),         [asignados,  filtros]);
  const asignadosParaLiquidacion = useMemo(() => aplicarFiltros(asignados, true),   [asignados,  filtros]);

  const totalesPorMoneda = useMemo(() => {
    const totales = {};
    const add = (moneda, monto) => {
      const m = moneda || 'USD';
      totales[m] = (totales[m] || 0) + monto;
    };
    [...pendientesFiltrados, ...asignadosFiltrados].forEach(i => add(i.moneda, parseFloat(i.total) || 0));
    egresosFiltrados.forEach(i => add(i.moneda, -(parseFloat(i.total) || parseFloat(i.gastosAsociados) || 0)));
    return totales;
  }, [pendientesFiltrados, egresosFiltrados, asignadosFiltrados]);

  const liquidacionInstructores = useMemo(() => {
    const totales = { IGNA: {}, JOSE: {}, HANS: {} };
    asignadosParaLiquidacion.forEach(item => {
      const base   = parseFloat(item.total) || 0;
      const moneda = item.moneda || 'USD';
      const { mIgna, mJose, mHans } = calcularReparto(item.asignadoA, base);
      totales.IGNA[moneda] = (totales.IGNA[moneda] || 0) + mIgna;
      totales.JOSE[moneda] = (totales.JOSE[moneda] || 0) + mJose;
      totales.HANS[moneda] = (totales.HANS[moneda] || 0) + mHans;
    });
    return totales;
  }, [asignadosParaLiquidacion]);

  const toggleDetails = (id) => setExpandedId(prev => prev === id ? null : id);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
      .format(parseFloat(val) || 0).replace('US', '');

  const handlePendienteChange = (id, val) =>
    setPendientes(prev => prev.map(p => p.id === id ? { ...p, asignadoA: val } : p));

  const acumularEnPasivo = async (pasivo, monto, item, etiqueta) => {
    if (!pasivo) {
      console.warn('[saveAssignment] No se acumuló', etiqueta, '— no se encontró la tarjeta de pasivo.');
      return;
    }
    if (monto <= 0) {
      console.warn('[saveAssignment] No se acumuló', etiqueta, 'en', pasivo.titulo, '— monto calculado es', monto);
      return;
    }
    const montoRedondeado = Math.round(monto * 100) / 100;
    const nota = `${etiqueta} de ${item.actividad || 'Clase'} — ${item.fecha} = ${montoRedondeado.toFixed(2)} ${item.moneda}`;
    console.log('[saveAssignment] Acumulando', montoRedondeado, 'en', pasivo.titulo, '(id', pasivo.id + ')');
    try {
      // /acumular actualiza el saldo + historial de la tarjeta SIN generar
      // un movimiento de caja: esto es deuda interna, todavía no salió plata.
      const res = await api.put(`/api/pasivos/${pasivo.id}/acumular`, {
        monto: -montoRedondeado,
        nota,
        fecha: item.fecha,
      });
      console.log('[saveAssignment] OK ->', pasivo.titulo, res.status, res.data);
    } catch (e) {
      console.error(`[saveAssignment] ERROR acumulando en pasivo de ${pasivo.titulo}:`, e.response?.data || e.message);
    }
  };

  const saveAssignment = async (item, asignadoA) => {
    if (!asignadoA || asignadoA === 'NINGUNO') return alert('Selecciona un instructor válido.');
    const montoBase = parseFloat(item.total) || 0;
    const { pIgna, pJose, pHans, mIgna, mJose, mHans } = calcularReparto(asignadoA, montoBase);
    const fmt = n => n.toString().replace('.', ',');
    const notaPct = ` | Reparto: IGNA ${fmt(pIgna)}% ($${mIgna.toFixed(2)}) - JOSE ${fmt(pJose)}% ($${mJose.toFixed(2)}) - HANS ${fmt(pHans)}% ($${mHans.toFixed(2)})`;
    let base = (item.detalles || '').includes('| Reparto:')
      ? item.detalles.split('| Reparto:')[0].trim()
      : item.detalles || '';

    console.log('[saveAssignment] Asignando item', item.id, 'a', asignadoA, '| montoBase:', montoBase, '| reparto:', { mJose, mIgna, mHans });

    try {
      await api.put(`/api/clases/asignar/${item.id}`, { asignadoA, detalles: base + notaPct });

      const resPasivos = await api.get('/api/pasivos');
      const pasivosActuales = resPasivos.data;
      setPasivos(pasivosActuales);
      console.log('[saveAssignment] Pasivos disponibles:', pasivosActuales.map(p => p.titulo));

      const buscar = (titulo) => pasivosActuales.find(p => p.titulo.trim().toLowerCase() === titulo.trim().toLowerCase());

      const pJoseObj = buscar(PASIVO_TITULOS.JOSE);
      const pIgnaObj = buscar(PASIVO_TITULOS.IGNA);
      const pHansObj = buscar(PASIVO_TITULOS.HANS);

      console.log('[saveAssignment] Match José:', pJoseObj?.titulo || 'NO ENCONTRADO');
      console.log('[saveAssignment] Match Igna:', pIgnaObj?.titulo || 'NO ENCONTRADO');
      console.log('[saveAssignment] Match Hans:', pHansObj?.titulo || 'NO ENCONTRADO');

      const faltantes = [];
      if (!pJoseObj) faltantes.push(PASIVO_TITULOS.JOSE);
      if (!pIgnaObj) faltantes.push(PASIVO_TITULOS.IGNA);
      if (!pHansObj) faltantes.push(PASIVO_TITULOS.HANS);

      await Promise.all([
        acumularEnPasivo(pJoseObj, mJose, item, `${fmt(pJose)}%`),
        acumularEnPasivo(pIgnaObj, mIgna, item, `${fmt(pIgna)}%`),
        acumularEnPasivo(pHansObj, mHans, item, `${fmt(pHans)}%`),
      ]);

      fetchPasivos();
      fetchData();

      if (faltantes.length > 0) {
        alert(`Asignado correctamente, pero no se encontraron estas tarjetas en Pasivos: ${faltantes.join(', ')}. Verificá que el nombre coincida exactamente.`);
      } else {
        alert('Asignado correctamente. Montos acumulados en Cuentas Corrientes de José, Igna y Hans.');
      }
    } catch (e) {
      console.error('[saveAssignment] ERROR general:', e.response?.data || e.message);
      alert('Error de red o no autorizado al asignar.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar registro?')) return;
    alert('Funcionalidad pendiente de Endpoint DELETE');
  };

  const handleEdit = (id) => alert(`Editar ID: ${id}`);

  const renderRepartoDesglose = (item) => {
    const { pIgna, pJose, pHans, mIgna, mJose, mHans } = calcularReparto(item.asignadoA, parseFloat(item.total) || 0);
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        <span style={styles.pill('#E1F5EE', NA.darker)}>IGNA {pIgna}%: {formatCurrency(mIgna)} {item.moneda}</span>
        <span style={styles.pill('#E1F5EE', NA.dark)}>JOSE {pJose}%: {formatCurrency(mJose)} {item.moneda}</span>
        <span style={styles.pill('#FFF8E1', '#7B5E00')}>HANS {pHans}%: {formatCurrency(mHans)} {item.moneda}</span>
      </div>
    );
  };

  const RenderDetails = ({ item }) => (
    <div style={{ background: NA.light, padding: '12px 20px', borderTop: `1px solid ${NA.border}`, fontSize: 13, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 10 }}>
      <div style={{ gridColumn: '1/-1' }}><span style={{ color: NA.text2, fontWeight: 500 }}>Detalle:</span> {item.detalles || '-'}</div>
      <div><span style={{ color: NA.text2 }}>Vendedor:</span> {item.vendedor || '-'}</div>
      <div><span style={{ color: NA.text2 }}>Forma pago:</span> {item.formaPago || '-'}</div>
      {item.tipoTransaccion === 'INGRESO' && (<>
        <div><span style={{ color: NA.text2 }}>Horas:</span> {item.cantidadHoras}</div>
        <div><span style={{ color: NA.text2 }}>Tarifa:</span> {formatCurrency(item.tarifaPorHora)}</div>
        <div><span style={{ color: NA.text2 }}>Comisión:</span> {formatCurrency(item.comision)}</div>
        <div><span style={{ color: '#B91C1C' }}>Gastos:</span> {formatCurrency(item.gastosAsociados)}</div>
      </>)}
      <div style={{ gridColumn: '1/-1' }}><span style={{ color: NA.text2 }}>Creado por:</span> {item.instructor}</div>
    </div>
  );

  const styles = {
    pill: (bg, color) => ({
      background: bg, color, fontSize: 11, fontWeight: 500,
      padding: '2px 10px', borderRadius: 99,
    }),
    sectionCard: (accent) => ({
      background: '#fff',
      borderRadius: 14,
      border: `0.5px solid ${NA.border}`,
      borderLeft: `4px solid ${accent}`,
      overflow: 'hidden',
    }),
    sectionHeader: (bg) => ({
      background: bg,
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${NA.border}`,
    }),
    sectionTitle: (color) => ({
      fontSize: 15, fontWeight: 500, color, display: 'flex', alignItems: 'center', gap: 8,
    }),
    row: {
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      borderBottom: `0.5px solid ${NA.border}`,
    },
    countBadge: (bg, color) => ({
      background: bg, color,
      fontSize: 11, fontWeight: 500,
      padding: '2px 8px', borderRadius: 99,
    }),
  };

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: NA.bg }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${NA.mid}`, borderTopColor: NA.dark, borderRadius: '50%', animation: 'kbn-spin .7s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 12, color: NA.text2, letterSpacing: '.1em', textTransform: 'uppercase' }}>Cargando datos...</p>
        <style>{`@keyframes kbn-spin { to { transform:rotate(360deg) } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 16px 80px', display: 'flex', flexDirection: 'column', gap: 20, background: NA.bg, minHeight: '100%' }}>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 20, borderBottom: `1px solid ${NA.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: `1px solid ${mostrarFiltros ? NA.dark : NA.border}`,
              background: mostrarFiltros ? NA.dark : '#fff',
              color: mostrarFiltros ? '#fff' : NA.text2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 16,
            }}
            title="Filtros"
          >
            <i className="ti ti-adjustments-horizontal" aria-hidden="true" />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 500, color: NA.text, margin: 0 }}>Panel Financiero</h1>
            <p style={{ fontSize: 11, color: NA.text2, margin: 0 }}>Estadísticas · Náutica Atins</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ background: NA.dark, color: '#fff', borderRadius: 10, padding: '8px 16px', minWidth: 110, textAlign: 'center' }}>
            <p style={{ fontSize: 10, opacity: .75, margin: 0, letterSpacing: '.08em', textTransform: 'uppercase' }}>USD</p>
            <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>{formatCurrency(totalesPorMoneda['USD'] || 0)}</p>
          </div>
          <div style={{ background: '#7B5E00', color: '#fff', borderRadius: 10, padding: '8px 16px', minWidth: 110, textAlign: 'center' }}>
            <p style={{ fontSize: 10, opacity: .75, margin: 0, letterSpacing: '.08em', textTransform: 'uppercase' }}>BRL</p>
            <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>R$ {formatCurrency(totalesPorMoneda['BRL'] || 0).replace('$', '')}</p>
          </div>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowOtherCurrencies(!showOtherCurrencies)}
              style={{ background: '#fff', border: `1px solid ${NA.border}`, color: NA.text, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="ti ti-world" aria-hidden="true" style={{ fontSize: 15 }} /> Otras
            </button>
            {showOtherCurrencies && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#fff', border: `0.5px solid ${NA.border}`, borderRadius: 10, padding: 12, minWidth: 160, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}>
                <p style={{ fontSize: 10, color: NA.text2, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.06em' }}>Otras monedas</p>
                {Object.entries(totalesPorMoneda).map(([moneda, valor]) => {
                  if (moneda === 'USD' || moneda === 'BRL') return null;
                  return (
                    <div key={moneda} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                      <span style={{ color: NA.text2 }}>{moneda}</span>
                      <span style={{ color: valor < 0 ? '#B91C1C' : NA.dark, fontWeight: 500 }}>{formatCurrency(valor)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {mostrarFiltros && (
        <div style={{ background: '#fff', borderRadius: 14, border: `0.5px solid ${NA.border}`, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${NA.border}` }}>
            <span style={{ fontSize: 12, color: NA.text2, textTransform: 'uppercase', letterSpacing: '.08em' }}>Filtros</span>
            <button onClick={limpiarFiltros} style={{ fontSize: 12, color: NA.dark, background: 'none', border: 'none', cursor: 'pointer' }}>Limpiar todo</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
            {[
              { label: 'Desde', name: 'fechaInicio', type: 'date' },
              { label: 'Hasta',  name: 'fechaFin',    type: 'date' },
            ].map(f => (
              <div key={f.name}>
                <label style={{ fontSize: 11, color: NA.text2, display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} name={f.name} value={filtros[f.name]} onChange={handleFiltroChange}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `0.5px solid ${NA.border}`, background: NA.light, color: NA.text, fontSize: 13 }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, color: NA.text2, display: 'block', marginBottom: 4 }}>Moneda</label>
              <select name="moneda" value={filtros.moneda} onChange={handleFiltroChange}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `0.5px solid ${NA.border}`, background: NA.light, color: NA.text, fontSize: 13 }}>
                <option value="">Todas</option>
                <option value="USD">USD</option><option value="BRL">BRL</option>
                <option value="EUR">EUR</option><option value="ARS">ARS</option><option value="CLP">CLP</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: NA.text2, display: 'block', marginBottom: 4 }}>Forma de pago</label>
              <select name="formaPago" value={filtros.formaPago} onChange={handleFiltroChange}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `0.5px solid ${NA.border}`, background: NA.light, color: NA.text, fontSize: 13 }}>
                <option value="">Todas</option>
                <option value="Efectivo">Efectivo</option>
                <option value="MercadoPago">MercadoPago</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: NA.text2, display: 'block', marginBottom: 4 }}>Instructor</label>
              <select name="instructor" value={filtros.instructor} onChange={handleFiltroChange}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `0.5px solid ${NA.border}`, background: NA.light, color: NA.text, fontSize: 13 }}>
                <option value="">Todos</option>
                {instructoresDisponibles.map(inst => <option key={inst} value={inst}>{inst}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: NA.text2, display: 'block', marginBottom: 4 }}>Actividad</label>
              <select name="actividad" value={filtros.actividad} onChange={handleFiltroChange}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `0.5px solid ${NA.border}`, background: NA.light, color: NA.text, fontSize: 13 }}>
                <option value="">Todas</option>
                <option value="Clase de Kite">Clase de Kite</option>
                <option value="Clase de Wing">Clase de Wing</option>
                <option value="Clase de Windsurf">Clase de Windsurf</option>
                <option value="Rental">Rental</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: NA.dark, display: 'block', marginBottom: 4, fontWeight: 500 }}>Asignado a</label>
              <select name="asignadoA" value={filtros.asignadoA} onChange={handleFiltroChange}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: `1px solid ${NA.mid}`, background: NA.light, color: NA.darker, fontSize: 13, fontWeight: 500 }}>
                <option value="">Todos</option>
                <option value="IGNA">Igna (pres 16% / aus 8%)</option>
                <option value="JOSE">Jose (pres 16% / aus 8%)</option>
                <option value="AMBOS">Ambos presentes (12,5% c/u)</option>
                <option value="ALE">Ambos ausentes (10% c/u)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {filtros.asignadoA !== '' && (
        <div style={{ background: NA.darker, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid rgba(255,255,255,.1)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 15, fontWeight: 500, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-cash" aria-hidden="true" /> Liquidación a pagar
            </h2>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Hans 5% · Igna/Jose: pres 16% / aus 8% / ambos 12,5%</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 1, background: 'rgba(255,255,255,.05)' }}>
            {[
              { key: 'IGNA', label: 'Igna', color: NA.mid },
              { key: 'JOSE', label: 'Jose', color: NA.primary },
              { key: 'HANS', label: 'Hans · 5%', color: '#F6C94E' },
            ].map(({ key, label, color }) => (
              <div key={key} style={{ padding: '16px 20px', background: NA.darker }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</p>
                {Object.entries(liquidacionInstructores[key]).map(([m, v]) => (
                  <div key={m} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>{m}</span>
                    <span style={{ color, fontSize: 18, fontWeight: 500 }}>{formatCurrency(v)}</span>
                  </div>
                ))}
                {Object.keys(liquidacionInstructores[key]).length === 0 &&
                  <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 13 }}>Sin montos</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.sectionCard('#F59E0B')}>
        <div style={styles.sectionHeader('#FFFBEB')}>
          <h2 style={styles.sectionTitle('#92400E')}>
            <i className="ti ti-bell" aria-hidden="true" style={{ fontSize: 17 }} />
            Pendientes de asignación
            <span style={styles.countBadge('#FDE68A', '#92400E')}>{pendientesFiltrados.length}</span>
          </h2>
        </div>
        {pendientesFiltrados.length === 0
          ? <div style={{ padding: '20px', textAlign: 'center', color: NA.text2, fontSize: 14 }}>No hay ingresos pendientes.</div>
          : pendientesFiltrados.map(item => (
            <div key={item.id}>
              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 500, color: NA.text, fontSize: 14 }}>{item.fecha}</span>
                    <span style={{ color: NA.dark, fontWeight: 500, fontSize: 15 }}>{formatCurrency(item.total)} <span style={{ fontSize: 11, color: NA.text2 }}>{item.moneda}</span></span>
                  </div>
                  <div style={{ fontSize: 13, color: NA.text2, marginTop: 3 }}>{item.actividad} · {item.instructor}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select
                    value={item.asignadoA}
                    onChange={(e) => handlePendienteChange(item.id, e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: `0.5px solid ${NA.border}`, background: NA.light, color: NA.text, fontSize: 13 }}
                  >
                    <option value="NINGUNO">Elegir...</option>
                    <option value="IGNA">Igna (pres)</option>
                    <option value="JOSE">Jose (pres)</option>
                    <option value="AMBOS">Ambos presentes</option>
                    <option value="ALE">Ausentes</option>
                  </select>
                  <button onClick={() => saveAssignment(item, item.asignadoA)}
                    style={{ padding: '6px 14px', background: NA.dark, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                    OK
                  </button>
                  <button onClick={() => toggleDetails(item.id)}
                    style={{ padding: '6px 10px', background: '#fff', color: NA.text2, border: `0.5px solid ${NA.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    <i className={`ti ti-chevron-${expandedId === item.id ? 'up' : 'down'}`} aria-hidden="true" />
                  </button>
                </div>
              </div>
              {expandedId === item.id && <RenderDetails item={item} />}
            </div>
          ))
        }
      </div>

      <div style={styles.sectionCard('#EF4444')}>
        <div style={styles.sectionHeader('#FEF2F2')}>
          <h2 style={styles.sectionTitle('#991B1B')}>
            <i className="ti ti-trending-down" aria-hidden="true" style={{ fontSize: 17 }} />
            Egresos
            <span style={styles.countBadge('#FECACA', '#991B1B')}>{egresosFiltrados.length}</span>
          </h2>
        </div>
        {egresosFiltrados.length === 0
          ? <div style={{ padding: '20px', textAlign: 'center', color: NA.text2, fontSize: 14 }}>No se registraron egresos con estos filtros.</div>
          : egresosFiltrados.map(item => {
            const monto = parseFloat(item.total) || parseFloat(item.gastosAsociados) || 0;
            return (
              <div key={item.id}>
                <div style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 500, color: NA.text, fontSize: 14 }}>{item.fecha}</span>
                      <span style={{ color: '#B91C1C', fontWeight: 500, fontSize: 15 }}>-{formatCurrency(monto)} <span style={{ fontSize: 11, color: NA.text2 }}>{item.moneda}</span></span>
                    </div>
                    <div style={{ fontSize: 13, color: NA.text2, marginTop: 3 }}>{item.detalles || 'Egreso general'}</div>
                  </div>
                  <button onClick={() => toggleDetails(item.id)}
                    style={{ padding: '5px 12px', background: '#FEF2F2', color: '#991B1B', border: '0.5px solid #FECACA', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                    Ver detalle
                  </button>
                </div>
                {expandedId === item.id && <RenderDetails item={item} />}
              </div>
            );
          })
        }
      </div>

      <div style={styles.sectionCard(NA.primary)}>
        <div style={styles.sectionHeader(NA.light)}>
          <h2 style={styles.sectionTitle(NA.darker)}>
            <i className="ti ti-circle-check" aria-hidden="true" style={{ fontSize: 17 }} />
            Ingresos asignados
            <span style={styles.countBadge(NA.mid, NA.darker)}>{asignadosFiltrados.length}</span>
          </h2>
        </div>
        {asignadosFiltrados.length === 0
          ? <div style={{ padding: '20px', textAlign: 'center', color: NA.text2, fontSize: 14 }}>No hay ingresos asignados con estos filtros.</div>
          : asignadosFiltrados.map(item => (
            <div key={item.id}>
              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 500, color: NA.text, fontSize: 14 }}>{item.fecha}</span>
                    <span style={{ color: NA.dark, fontWeight: 500, fontSize: 15 }}>{formatCurrency(item.total)} <span style={{ fontSize: 11, color: NA.text2 }}>{item.moneda}</span></span>
                    {parseFloat(item.gastosAsociados) > 0 && <span style={{ color: '#B91C1C', fontSize: 11 }}>-{formatCurrency(item.gastosAsociados)} gastos</span>}
                    <span style={styles.pill(NA.mid, NA.darker)}>{item.asignadoA}</span>
                  </div>
                  <div style={{ fontSize: 13, color: NA.text2, marginTop: 3 }}>{item.actividad}</div>
                  {renderRepartoDesglose(item)}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { icon: 'ti-eye',   fn: () => toggleDetails(item.id),  color: NA.dark },
                    { icon: 'ti-edit',  fn: () => handleEdit(item.id),     color: '#92400E' },
                    { icon: 'ti-trash', fn: () => handleDelete(item.id),   color: '#B91C1C' },
                  ].map(({ icon, fn, color }) => (
                    <button key={icon} onClick={fn}
                      style={{ width: 32, height: 32, borderRadius: 8, border: `0.5px solid ${NA.border}`, background: '#fff', color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                      <i className={`ti ${icon}`} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
              {expandedId === item.id && <RenderDetails item={item} />}
            </div>
          ))
        }
      </div>

      <ReportesEstadisticasGraficos asignados={asignadosFiltrados} egresos={egresosFiltrados} />

    </div>
  );
};

export default ReporteEstadisticas;