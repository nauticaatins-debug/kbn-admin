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
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ReportesEstadisticasGraficos from './ReportesEstadisticasGraficos';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// ─────────────────────────────────────────────────────────────────
// PORCENTAJES:
//   Hans  → siempre 5% en todas las clases
//   IGNA presente  → 16%  |  ausente → 8%
//   JOSE presente  → 16%  |  ausente → 8%
//   Ambos presentes → 12.5% c/u
//   Ambos ausentes  → 10% c/u
//
// asignadoA valores: 'IGNA' | 'JOSE' | 'AMBOS' | 'ALE' (ausentes)
// ─────────────────────────────────────────────────────────────────
const HANS_PCT = 5;

const calcularReparto = (asignadoA, montoBase) => {
    let pIgna = 8, pJose = 8; // default: ambos ausentes base

    if (asignadoA === 'IGNA') {
        pIgna = 16;
        pJose = 8;
    } else if (asignadoA === 'JOSE') {
        pIgna = 8;
        pJose = 16;
    } else if (asignadoA === 'AMBOS') {
        pIgna = 12.5;
        pJose = 12.5;
    } else {
        // ALE / ausentes
        pIgna = 10;
        pJose = 10;
    }

    const pHans = HANS_PCT;

    return {
        pIgna, pJose, pHans,
        mIgna: (montoBase * pIgna) / 100,
        mJose: (montoBase * pJose) / 100,
        mHans: (montoBase * pHans) / 100,
    };
};

// Nombre exacto de la tarjeta de Hans en Pasivos
const HANS_PASIVO_TITULO = 'Hans Wurbs';

const ReporteEstadisticas = () => {
    const { token } = useAuth();

    const axiosConfig = useMemo(() => ({
        headers: { Authorization: `Bearer ${token}` }
    }), [token]);

    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendientes, setPendientes] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [asignados, setAsignados] = useState([]);
    const [pasivos, setPasivos] = useState([]);

    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [filtros, setFiltros] = useState({
        moneda: '', formaPago: '', instructor: '',
        actividad: '', fechaInicio: '', fechaFin: '', asignadoA: ''
    });

    const [expandedId, setExpandedId] = useState(null);
    const [showOtherCurrencies, setShowOtherCurrencies] = useState(false);

    useEffect(() => {
        if (token) { fetchData(); fetchPasivos(); }
    }, [token]);

    const fetchPasivos = async () => {
        try {
            const res = await axios.get('https://kbnadmin-production.up.railway.app/api/pasivos', axiosConfig);
            setPasivos(res.data);
        } catch (e) { console.error('Error cargando pasivos', e); }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('https://kbnadmin-production.up.railway.app/api/clases/listar', {
                headers: { Authorization: `Bearer ${token}` }
            });
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
        if (filtros.moneda && item.moneda !== filtros.moneda) return false;
        if (filtros.formaPago && item.formaPago !== filtros.formaPago) return false;
        if (filtros.instructor && item.instructor !== filtros.instructor) return false;
        if (filtros.actividad && item.actividad !== filtros.actividad) return false;
        if (filtros.fechaInicio && item.fecha < filtros.fechaInicio) return false;
        if (filtros.fechaFin && item.fecha > filtros.fechaFin) return false;
        if (!ignorarAsignadoA && filtros.asignadoA && item.asignadoA !== filtros.asignadoA) return false;
        return true;
    });

    const pendientesFiltrados    = useMemo(() => aplicarFiltros(pendientes),         [pendientes, filtros]);
    const egresosFiltrados       = useMemo(() => aplicarFiltros(egresos),            [egresos, filtros]);
    const asignadosFiltrados     = useMemo(() => aplicarFiltros(asignados),          [asignados, filtros]);
    const asignadosParaLiquidacion = useMemo(() => aplicarFiltros(asignados, true),  [asignados, filtros]);

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
            const base = parseFloat(item.total) || 0;
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

    // ── Acumular % de Hans en su pasivo ──────────────────────────
    const acumularHans = async (item, montoBase) => {
        const pasivoHans = pasivos.find(p => p.titulo.toLowerCase() === HANS_PASIVO_TITULO.toLowerCase());
        if (!pasivoHans) return;
        const mHans = Math.round((montoBase * HANS_PCT / 100) * 100) / 100;
        if (mHans <= 0) return;
        const nota = `5% de ${item.actividad || 'Clase'} — ${item.fecha} = ${mHans.toFixed(2)} ${item.moneda}`;
        try {
            await axios.post(
                'https://kbnadmin-production.up.railway.app/api/clases/guardar',
                {
                    tipoTransaccion: 'EGRESO',
                    tipoMovimientoPasivo: 'NUEVA_DEUDA',
                    pasivoId: pasivoHans.id,
                    total: String(-mHans),
                    fecha: item.fecha,
                    moneda: pasivoHans.moneda,
                    formaPago: 'Efectivo',
                    detalles: nota,
                    actividad: 'Pago Pasivo',
                    instructor: 'Sistema',
                },
                axiosConfig
            );
            fetchPasivos();
        } catch (e) {
            console.error('Error acumulando Hans:', e);
        }
    };

    const saveAssignment = async (item, asignadoA) => {
        if (!asignadoA || asignadoA === 'NINGUNO') return alert('Selecciona un instructor válido.');
        const montoBase = parseFloat(item.total) || 0;
        const { pIgna, pJose, pHans, mIgna, mJose, mHans } = calcularReparto(asignadoA, montoBase);

        const strIgna = pIgna.toString().replace('.', ',');
        const strJose = pJose.toString().replace('.', ',');
        const strHans = pHans.toString().replace('.', ',');
        const notaPct = ` | Reparto: IGNA ${strIgna}% ($${mIgna.toFixed(2)}) - JOSE ${strJose}% ($${mJose.toFixed(2)}) - HANS ${strHans}% ($${mHans.toFixed(2)})`;

        let detallesActuales = item.detalles || '';
        if (detallesActuales.includes('| Reparto:')) {
            detallesActuales = detallesActuales.split('| Reparto:')[0].trim();
        }
        const nuevosDetalles = detallesActuales + notaPct;

        try {
            await axios.put(
                `https://kbnadmin-production.up.railway.app/api/clases/asignar/${item.id}`,
                { asignadoA, detalles: nuevosDetalles },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            // Acumular % Hans en su pasivo
            await acumularHans(item, montoBase);
            alert('Asignado correctamente.');
            fetchData();
        } catch (e) {
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
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase">
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                    IGNA {pIgna.toString().replace('.', ',')}%: <span className="text-indigo-900 ml-1">{formatCurrency(mIgna)} {item.moneda}</span>
                </span>
                <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                    JOSE {pJose.toString().replace('.', ',')}%: <span className="text-emerald-900 ml-1">{formatCurrency(mJose)} {item.moneda}</span>
                </span>
                <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 shadow-sm">
                    HANS {pHans}%: <span className="text-amber-900 ml-1">{formatCurrency(mHans)} {item.moneda}</span>
                </span>
            </div>
        );
    };

    const RenderDetails = ({ item }) => (
        <div className="bg-gray-50 p-4 rounded-b-lg border-t border-gray-200 text-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-1 md:col-span-2 lg:col-span-4"><span className="font-bold text-gray-700">Detalle Completo:</span> {item.detalles || '-'}</div>
            <div><span className="font-bold text-gray-700">Vendedor:</span> {item.vendedor || '-'}</div>
            <div><span className="font-bold text-gray-700">Forma Pago:</span> {item.formaPago || '-'}</div>
            {item.tipoTransaccion === 'INGRESO' && (
                <>
                    <div><span className="font-bold text-gray-700">Horas:</span> {item.cantidadHoras}</div>
                    <div><span className="font-bold text-gray-700">Tarifa:</span> {formatCurrency(item.tarifaPorHora)}</div>
                    <div><span className="font-bold text-gray-700">Comisión:</span> {formatCurrency(item.comision)}</div>
                    <div><span className="font-bold text-red-600">Gastos:</span> {formatCurrency(item.gastosAsociados)}</div>
                </>
            )}
            <div className="col-span-1 md:col-span-2"><span className="font-bold text-gray-700">Creado por:</span> {item.instructor}</div>
        </div>
    );

    if (loading) return <div className="p-10 text-center text-xl text-indigo-600 font-bold">Cargando datos...</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-8 pb-20">

            {/* HEADER */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b pb-6 gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMostrarFiltros(!mostrarFiltros)}
                        className={`p-2 rounded-lg transition-colors flex items-center justify-center shadow-sm border ${mostrarFiltros ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">Panel Financiero</h1>
                </div>

                <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                    <div className="bg-green-600 text-white px-5 py-3 rounded-lg shadow-md flex-1 lg:flex-none text-center min-w-[140px]">
                        <p className="text-xs uppercase opacity-80 font-semibold">Total USD</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalesPorMoneda['USD'] || 0)}</p>
                    </div>
                    <div className="bg-yellow-500 text-white px-5 py-3 rounded-lg shadow-md flex-1 lg:flex-none text-center min-w-[140px]">
                        <p className="text-xs uppercase opacity-80 font-semibold">Total BRL</p>
                        <p className="text-2xl font-bold">R$ {formatCurrency(totalesPorMoneda['BRL'] || 0).replace('$', '')}</p>
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowOtherCurrencies(!showOtherCurrencies)}
                            className="bg-indigo-600 text-white p-3 rounded-lg shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2 h-full"
                        >
                            <span>🌐</span> Otras
                        </button>
                        {showOtherCurrencies && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200 p-2 text-gray-800">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b pb-1">Otras Monedas</h4>
                                {Object.entries(totalesPorMoneda).map(([moneda, valor]) => {
                                    if (moneda === 'USD' || moneda === 'BRL') return null;
                                    return (
                                        <div key={moneda} className="flex justify-between text-sm py-1">
                                            <span className="font-semibold">{moneda}:</span>
                                            <span className={valor < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{formatCurrency(valor)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FILTROS */}
            {mostrarFiltros && (
                <div className="bg-white p-5 rounded-xl shadow-md border border-indigo-100">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-wider">Filtros de Búsqueda</h3>
                        <button onClick={limpiarFiltros} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">✕ Limpiar Todo</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Desde Fecha</label>
                            <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Hasta Fecha</label>
                            <input type="date" name="fechaFin" value={filtros.fechaFin} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Moneda</label>
                            <select name="moneda" value={filtros.moneda} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold">
                                <option value="">Todas</option>
                                <option value="BRL">Reales (BRL)</option>
                                <option value="USD">Dólares (USD)</option>
                                <option value="EUR">Euros (EUR)</option>
                                <option value="ARS">Pesos (ARS)</option>
                                <option value="CLP">Pesos Chilenos (CLP)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-500 uppercase ml-1">Filtro Asignado A</label>
                            <select name="asignadoA" value={filtros.asignadoA} onChange={handleFiltroChange} className="w-full p-2.5 bg-indigo-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-indigo-900">
                                <option value="">Todos los registros</option>
                                <option value="IGNA">Solo Igna (pres:16% / aus:8%)</option>
                                <option value="JOSE">Solo Jose (pres:16% / aus:8%)</option>
                                <option value="AMBOS">Ambos Presentes (12,5% c/u)</option>
                                <option value="ALE">Ambos Ausentes (10% c/u)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Forma de Pago</label>
                            <select name="formaPago" value={filtros.formaPago} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold">
                                <option value="">Todas</option>
                                <option value="Efectivo">Efectivo</option>
                                <option value="MercadoPago">MercadoPago</option>
                                <option value="Transferencia">Transferencia</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Instructor</label>
                            <select name="instructor" value={filtros.instructor} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold">
                                <option value="">Todos</option>
                                {instructoresDisponibles.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Actividad</label>
                            <select name="actividad" value={filtros.actividad} onChange={handleFiltroChange} className="w-full p-2.5 bg-gray-50 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold">
                                <option value="">Todas</option>
                                <option value="Clase de Kite">Clase de Kite</option>
                                <option value="Clase de Wing">Clase de Wing</option>
                                <option value="Clase de Windsurf">Clase de Windsurf</option>
                                <option value="Rental">Rental</option>
                                <option value="Otro">Otro...</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* LIQUIDACIÓN */}
            {filtros.asignadoA !== '' && (
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">💰 Liquidación a Pagar</h2>
                        <span className="text-slate-400 text-xs hidden md:block">Hans siempre 5% · Igna/Jose: pres 16% / aus 8% / ambos 12,5%</span>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* IGNA */}
                        <div className="bg-slate-700/40 rounded-lg p-5 border border-slate-600/50">
                            <h3 className="text-lg font-black text-indigo-400 mb-3 border-b border-slate-600 pb-2">TOTAL IGNA</h3>
                            {Object.entries(liquidacionInstructores.IGNA).map(([m, v]) => (
                                <div key={m} className="flex justify-between items-center mb-1">
                                    <span className="text-slate-300 font-semibold">{m}:</span>
                                    <span className="text-xl font-bold text-white">{formatCurrency(v)}</span>
                                </div>
                            ))}
                            {Object.keys(liquidacionInstructores.IGNA).length === 0 && <span className="text-slate-500 italic text-sm">Sin montos.</span>}
                        </div>
                        {/* JOSE */}
                        <div className="bg-slate-700/40 rounded-lg p-5 border border-slate-600/50">
                            <h3 className="text-lg font-black text-emerald-400 mb-3 border-b border-slate-600 pb-2">TOTAL JOSE</h3>
                            {Object.entries(liquidacionInstructores.JOSE).map(([m, v]) => (
                                <div key={m} className="flex justify-between items-center mb-1">
                                    <span className="text-slate-300 font-semibold">{m}:</span>
                                    <span className="text-xl font-bold text-white">{formatCurrency(v)}</span>
                                </div>
                            ))}
                            {Object.keys(liquidacionInstructores.JOSE).length === 0 && <span className="text-slate-500 italic text-sm">Sin montos.</span>}
                        </div>
                        {/* HANS */}
                        <div className="bg-slate-700/40 rounded-lg p-5 border border-amber-600/30">
                            <h3 className="text-lg font-black text-amber-400 mb-3 border-b border-slate-600 pb-2">TOTAL HANS <span className="text-xs font-bold text-amber-600">5%</span></h3>
                            {Object.entries(liquidacionInstructores.HANS).map(([m, v]) => (
                                <div key={m} className="flex justify-between items-center mb-1">
                                    <span className="text-slate-300 font-semibold">{m}:</span>
                                    <span className="text-xl font-bold text-white">{formatCurrency(v)}</span>
                                </div>
                            ))}
                            {Object.keys(liquidacionInstructores.HANS).length === 0 && <span className="text-slate-500 italic text-sm">Sin montos.</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* PENDIENTES */}
            <div className="bg-white rounded-xl shadow-md border-l-4 border-yellow-500 overflow-hidden">
                <div className="bg-yellow-50 px-6 py-3 border-b border-yellow-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-yellow-800 flex items-center gap-2">
                        🔔 Pendientes de Asignación
                        <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded-full">{pendientesFiltrados.length}</span>
                    </h2>
                </div>
                {pendientesFiltrados.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 italic">No hay ingresos pendientes.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {pendientesFiltrados.map(item => (
                            <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between md:justify-start md:gap-4 items-baseline">
                                            <span className="font-bold text-gray-800">{item.fecha}</span>
                                            <span className="text-green-600 font-bold">{formatCurrency(item.total)} <span className="text-xs text-gray-500">{item.moneda}</span></span>
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">{item.actividad} - Creado por: {item.instructor}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={item.asignadoA}
                                            onChange={(e) => handlePendienteChange(item.id, e.target.value)}
                                            className="border rounded px-2 py-1 text-sm bg-white"
                                        >
                                            <option value="NINGUNO">Elegir...</option>
                                            <option value="IGNA">IGNA (pres)</option>
                                            <option value="JOSE">JOSE (pres)</option>
                                            <option value="AMBOS">AMBOS presentes</option>
                                            <option value="ALE">AUSENTES</option>
                                        </select>
                                        <button onClick={() => saveAssignment(item, item.asignadoA)} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 font-bold">OK</button>
                                        <button onClick={() => toggleDetails(item.id)} className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm">▼</button>
                                    </div>
                                </div>
                                {expandedId === item.id && <RenderDetails item={item} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* EGRESOS */}
            <div className="bg-white rounded-xl shadow-md border-l-4 border-red-500 overflow-hidden">
                <div className="bg-red-50 px-6 py-3 border-b border-red-100">
                    <h2 className="text-xl font-bold text-red-800 flex items-center gap-2">
                        💸 Egresos
                        <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded-full">{egresosFiltrados.length}</span>
                    </h2>
                </div>
                {egresosFiltrados.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 italic">No se registraron egresos con estos filtros.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {egresosFiltrados.map(item => {
                            const monto = parseFloat(item.total) || parseFloat(item.gastosAsociados) || 0;
                            return (
                                <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-4">
                                                <span className="font-bold text-gray-800">{item.fecha}</span>
                                                <span className="text-red-600 font-bold">-{formatCurrency(monto)} <span className="text-xs text-gray-500">{item.moneda}</span></span>
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">{item.detalles || 'Egreso general'}</div>
                                        </div>
                                        <button onClick={() => toggleDetails(item.id)} className="bg-red-50 text-red-600 px-4 py-1 rounded text-xs font-bold border border-red-100 hover:bg-red-100">VER DETALLE</button>
                                    </div>
                                    {expandedId === item.id && <RenderDetails item={item} />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ASIGNADOS */}
            <div className="bg-white rounded-xl shadow-md border-l-4 border-green-500 overflow-hidden">
                <div className="bg-green-50 px-6 py-3 border-b border-green-100">
                    <h2 className="text-xl font-bold text-green-800">✅ Ingresos Asignados</h2>
                </div>
                {asignadosFiltrados.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 italic">No hay ingresos asignados con estos filtros.</div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {asignadosFiltrados.map(item => (
                            <div key={item.id} className="hover:bg-gray-50 transition-colors">
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-gray-800 w-24">{item.fecha}</span>
                                            <div className="flex flex-col">
                                                <span className="text-green-600 font-bold text-lg">{formatCurrency(item.total)} <span className="text-xs text-gray-500">{item.moneda}</span></span>
                                                {parseFloat(item.gastosAsociados) > 0 && <span className="text-red-500 text-[10px] font-bold">📉 GASTOS: -{formatCurrency(item.gastosAsociados)}</span>}
                                            </div>
                                            <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{item.asignadoA}</span>
                                        </div>
                                        <div className="text-sm text-gray-500 mt-1 pl-0 md:pl-28">{item.actividad}</div>
                                        <div className="pl-0 md:pl-28">{renderRepartoDesglose(item)}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleDetails(item.id)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </button>
                                        <button onClick={() => handleEdit(item.id)} className="p-2 text-gray-400 hover:text-yellow-600 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                                {expandedId === item.id && <RenderDetails item={item} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* GRÁFICOS */}
            <ReportesEstadisticasGraficos asignados={asignadosFiltrados} egresos={egresosFiltrados} />
        </div>
    );
};

export default ReporteEstadisticas;