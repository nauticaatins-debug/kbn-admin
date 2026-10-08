import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import api from '../../axiosConfig';
import { useAuth } from '../../context/AuthContext';

import { toYMD, HOY, esPasado, normName } from './MonitorShared';
import MonitorCalendario from './MonitorCalendario';
import MonitorDia        from './MonitorDia';
import { ModalEditarClase, ModalNuevoIngreso, ModalAgendar } from './MonitorModales';
import MonitorResumen    from './MonitorResumen';

export const NA = {
  primary:'#1ABFA0',
  dark:'#0F6E56',
  darker:'#085041',
  light:'#E1F5EE',
  mid:'#9FE1CB',
  bg:'#f0faf7',
  text:'#0a2e27',
  text2:'#3a6b5e',
  border:'#c5e8df',
};
const normalizarTexto = (text) => {
  if (!text) return '';
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const Monitor = () => {
  // ── Mes actual ──────────────────────────────────────────────────────────────
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // ── Datos del servidor ──────────────────────────────────────────────────────
  const [agenda,   setAgenda]   = useState([]);
  const [clases,   setClases]   = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [diaSelec,   setDiaSelec]   = useState(null);
  const [filtroInst, setFiltroInst] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODO');

  // ── Modal: editar clase ─────────────────────────────────────────────────────
  const [editClase,      setEditClase]      = useState(null);
  const [editForm,       setEditForm]       = useState({});
  const [guardandoEdit,  setGuardandoEdit]  = useState(false);
  const guardandoEditRef = useRef(false);

  // ── Modal: nuevo ingreso ────────────────────────────────────────────────────
  const [showIngreso,   setShowIngreso]   = useState(false);
  const [ingresoFecha,  setIngresoFecha]  = useState(null);
  const [ingresoForm,   setIngresoForm]   = useState({});
  const [clasesSelec,   setClasesSelec]   = useState([]);
  const [enviando,      setEnviando]      = useState(false);
  const enviandoRef = useRef(false);

  // ── Modal: agendar clase ────────────────────────────────────────────────────
  const [showAgendar,      setShowAgendar]      = useState(false);
  const [agendarFecha,     setAgendarFecha]     = useState(null);
  const [agendarHora,      setAgendarHora]      = useState('09:00');
  const [duplicarPrefill,  setDuplicarPrefill]  = useState(null); // datos pre-llenados al duplicar
  const [guardandoAgendar, setGuardandoAgendar] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [rA, rC, rU] = await Promise.all([
        api.get('/api/agenda/listar'),
        api.get('/api/clases/listar'),
        api.get('/usuario'),
      ]);
      setAgenda(rA.data);
      setClases(rC.data);
      setUsuarios(rU.data);
    } catch (e) {
      console.error('Monitor:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Derivaciones ────────────────────────────────────────────────────────────
  const ingresos = useMemo(() => clases.filter(c => c.tipoTransaccion === 'INGRESO'), [clases]);
  const egresos  = useMemo(() => clases.filter(c => c.tipoTransaccion === 'EGRESO'),  [clases]);

  // Para el selector de instructor: solo gente que da clases, con el nombre
  // completo y ordenado. Deja afuera admin y la cuenta de la escuela.
  const instructoresSelect = useMemo(() => {
    // Todos los usuarios menos la cuenta de sistema: cualquiera puede quedar
    // a cargo de una clase, incluida la escuela como freelancer.
    return (usuarios || [])
      .filter(u => `${u.nombre || ''}`.trim().toLowerCase() !== 'admin')
      .map(u => ({
        id: u.id,
        nombre: `${u.nombre || ''} ${u.apellido || ''}`.replace(/\s+/g, ' ').trim(),
      }))
      .filter(u => u.nombre)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [usuarios]);

  const instructores = useMemo(() => {
    const set = new Set();
    agenda.forEach(a => a.nombreInstructor && set.add(a.nombreInstructor));
    usuarios.forEach(u => {
      const n = `${u.nombre} ${u.apellido}`.replace(/\s+/g, ' ').trim();
      if (n) set.add(n);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [agenda, usuarios]);

  // ── Cobro: vínculo explícito únicamente ─────────────────────────────────────
  // Solo se considera cobrada una clase cuando cobrada=true + ingresoId apunta
  // a un ingreso real. El fallback por fecha+instructor fue eliminado porque
  // causaba que todas las clases del mismo instructor en el mismo día
  // aparecieran como cobradas aunque solo una tuviera ingreso.
  // ── Cobro: Vínculo explícito e Inteligente por Nombre ───────────────────────
  const ingresoDeClase = useCallback((clase) => {
    if (!clase) return null;
    
    const fClase = clase.fecha?.toString();
    const claseIdStr = String(clase.id);
    const normAlumno = normalizarTexto(clase.alumno);

    // A. Vinculación directa por ID explícito
    if (clase.cobrada && clase.ingresoId) {
      const ing = ingresos.find(i => String(i.id) === String(clase.ingresoId));
      if (ing) return ing;
    }

    // B. Vinculación por agendaIds (si el ingreso agrupa varios IDs de clases)
    const ingPorIds = ingresos.find(i => 
      i.agendaIds && i.agendaIds.toString().split(',').map(x => x.trim()).includes(claseIdStr)
    );
    if (ingPorIds) return ingPorIds;

    // C. Nueva Heurística: Buscar el nombre del alumno en detalles/actividad del mismo día
    if (fClase && normAlumno) {
      return ingresos.find(i => {
        if (i.fecha !== fClase) return false; // Debe ser el mismo día

        // Unimos detalles y actividad para buscar en ambos campos a la vez
        const textoIngreso = normalizarTexto(`${i.detalles || ''} ${i.actividad || ''}`);
        
        // Si el texto del ingreso contiene el nombre del alumno, lo vinculamos
        return textoIngreso.includes(normAlumno);
      }) || null;
    }

    return null;
  }, [ingresos]);

  const tieneCobro = useCallback((clase) => {
    if (!clase) return false;
    return Boolean(clase.cobrada || ingresoDeClase(clase));
  }, [ingresoDeClase]);

  // ── Alertas: clases pasadas sin cobro ───────────────────────────────────────
  const alertas = useMemo(() => agenda.filter(a => {
    const f = a.fecha?.toString();
    return f && esPasado(f) && a.estado !== 'RECHAZADA' && !tieneCobro(a);
  }), [agenda, tieneCobro]);

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const agendaF = useMemo(() => agenda.filter(a => {
    if (filtroInst && a.nombreInstructor !== filtroInst) return false;
    if (filtroTipo === 'INGRESOS' || filtroTipo === 'EGRESOS') return false;
    if (filtroTipo === 'ALERTAS') {
      const f = a.fecha?.toString();
      return f && esPasado(f) && a.estado !== 'RECHAZADA' && !tieneCobro(a);
    }
    return true;
  }), [agenda, filtroInst, filtroTipo, tieneCobro]);

  const ingresosF = useMemo(() => ingresos.filter(i => {
    if (filtroInst && normName(i.instructor) !== normName(filtroInst)) return false;
    if (filtroTipo === 'CLASES' || filtroTipo === 'ALERTAS') return false;
    return true;
  }), [ingresos, filtroInst, filtroTipo]);

  const egresosF = useMemo(() => egresos.filter(e => {
    if (filtroTipo === 'CLASES' || filtroTipo === 'ALERTAS') return false;
    return true;
  }), [egresos, filtroTipo]);

  // ── Grilla del mes ──────────────────────────────────────────────────────────
  const grilla = useMemo(() => {
    const { y, m } = mes;
    const primer = new Date(y, m, 1).getDay();
    const ultimo = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < primer; i++) cells.push(null);
    for (let d = 1; d <= ultimo; d++) cells.push(toYMD(new Date(y, m, d)));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [mes]);

  // ── Dots por día ────────────────────────────────────────────────────────────
  const dotsD = useMemo(() => {
    const map = {};
    const add = (f, tipo) => {
      if (!f) return;
      if (!map[f]) map[f] = {};
      map[f][tipo] = (map[f][tipo] || 0) + 1;
    };
    agendaF.forEach(a => {
      const f = a.fecha?.toString();
      const esAlerta = f && esPasado(f) && a.estado !== 'RECHAZADA' && !tieneCobro(a);
      add(f, esAlerta ? 'alerta' : 'clase');
    });
    ingresosF.forEach(i => add(i.fecha, 'ingreso'));
    egresosF.forEach(e  => add(e.fecha,  'egreso'));
    return map;
  }, [agendaF, ingresosF, egresosF, tieneCobro]);

  // ── Eventos del día seleccionado ────────────────────────────────────────────
  const evD = useMemo(() => {
    if (!diaSelec) return { clases: [], ingresos: [], egresos: [] };
    return {
      clases:   agendaF.filter(a  => a.fecha?.toString() === diaSelec),
      ingresos: ingresosF.filter(i => i.fecha             === diaSelec),
      egresos:  egresosF.filter(e  => e.fecha              === diaSelec),
    };
  }, [diaSelec, agendaF, ingresosF, egresosF]);

  // ── Clases del día para selector de ingreso ─────────────────────────────────
  const clasesParaIngreso = useMemo(() => {
    if (!ingresoFecha) return [];
    return agenda.filter(a =>
      a.fecha?.toString() === ingresoFecha && a.estado !== 'RECHAZADA'
    );
  }, [agenda, ingresoFecha]);

  // ── Ingresos disponibles para vincular con una clase (todos del instructor) ─
  // No solo los del mismo día: un padre puede pagar N clases futuras de una vez,
  // o pagar varias clases juntas al final del período.
  const ingresosDisponiblesEdit = useMemo(() => {
    if (!editClase) return [];
    const fechaClase = editClase.fecha?.toString();
    const normInst   = normName(editClase.nombreInstructor || '');

    // Rango de ±7 días alrededor de la clase para capturar pagos adelantados/atrasados
    const fechaObj = new Date(fechaClase);
    const desde = new Date(fechaObj); desde.setDate(desde.getDate() - 7);
    const hasta = new Date(fechaObj); hasta.setDate(hasta.getDate() + 7);
    const enRango = (f) => { const d = new Date(f); return d >= desde && d <= hasta; };

    return ingresos
      .filter(i => {
        if (i.fecha === fechaClase)               return true; // mismo día siempre
        if (enRango(i.fecha))                     return true; // ±7 días
        if (normInst && normName(i.instructor) === normInst) return true; // mismo instructor
        if (!i.instructor || normName(i.instructor) === '') return true; // sin instructor
        return false;
      })
      .sort((a, b) => {
        const aSame = a.fecha === fechaClase ? 0 : 1;
        const bSame = b.fecha === fechaClase ? 0 : 1;
        if (aSame !== bSame) return aSame - bSame;
        return b.fecha.localeCompare(a.fecha);
      });
  }, [editClase, ingresos]);

  // ── Resumen del mes ─────────────────────────────────────────────────────────
  const resumen = useMemo(() => {
    const { y, m } = mes;
    const inMes = (f) => {
      if (!f) return false;
      const [fy, fm] = f.split('-');
      return parseInt(fy) === y && parseInt(fm) - 1 === m;
    };
    const clasesMes   = agendaF.filter(a  => inMes(a.fecha?.toString()));
    const ingresosMes = ingresosF.filter(i => inMes(i.fecha));
    const egresosMes  = egresosF.filter(e  => inMes(e.fecha));
    const alertasMes  = alertas.filter(a   => inMes(a.fecha?.toString()));

    const balances = {};
    ingresosMes.forEach(i => {
      const mo = i.moneda || 'BRL';
      balances[mo] = (balances[mo] || 0) + (parseFloat(i.total) || 0);
    });
    egresosMes.forEach(e => {
      const mo = e.moneda || 'BRL';
      balances[mo] = (balances[mo] || 0) - (parseFloat(e.total) || 0);
    });

    return { clasesMes, ingresosMes, egresosMes, alertasMes, balances };
  }, [mes, agendaF, ingresosF, egresosF, alertas]);

  // ── Navegar mes ─────────────────────────────────────────────────────────────
  const navMes = (dir) => {
    setMes(p => {
      let m = p.m + dir, y = p.y;
      if (m < 0)  { m = 11; y--; }
      if (m > 11) { m = 0;  y++; }
      return { y, m };
    });
    setDiaSelec(null);
  };

  // ── Cambiar estado de clase ─────────────────────────────────────────────────
  const { user } = useAuth();
  const puedeAdmin = user?.role === 'ADMINISTRADOR' || user?.role === 'SECRETARIA';

  // cambiarEstado — para instructor solo cambia a CONFIRMADA.
  // Para admin/secretaria que confirman → liquida automáticamente.
  const cambiarEstado = async (id, estado) => {
    const clase = agenda.find(a => a.id === id);

    // Una clase que todavía no ocurrió no se liquida: el instructor estaría
    // cobrando algo que no dio. Se confirma y queda esperando al día.
    const hoyStr = new Date().toISOString().slice(0, 10);
    const yaOcurrio = clase?.fecha ? String(clase.fecha).slice(0, 10) <= hoyStr : true;

    // Admin/secretaria confirman una clase YA DADA con instructor → liquidar
    if (estado === 'CONFIRMADA' && puedeAdmin && clase?.nombreInstructor && yaOcurrio) {
      try {
        await api.put(`/api/agenda/${id}/estado`, estado, {
          headers: { 'Content-Type': 'text/plain' },
        });
        const res = await api.post(`/api/agenda/${id}/liquidar`);
        const data = res.data;
        setAgenda(p => p.map(a => a.id === id ? { ...a, estado: data.estado || 'FINALIZADA' } : a));
        if (data.aviso) alert(`✓ ${data.aviso}`);
      } catch (e) {
        // Si liquidar falla (ej: no tiene tarjeta), igual confirmar
        setAgenda(p => p.map(a => a.id === id ? { ...a, estado: 'CONFIRMADA' } : a));
        const msg = e.response?.data;
        if (msg && !msg.includes('liquidada')) alert(`Clase confirmada. ${msg}`);
      }
      return;
    }

    // Caso normal: cambio de estado sin liquidar
    try {
      await api.put(`/api/agenda/${id}/estado`, estado, {
        headers: { 'Content-Type': 'text/plain' },
      });
      setAgenda(p => p.map(a => a.id === id ? { ...a, estado } : a));
    } catch (e) {
      alert('No se pudo actualizar el estado.');
    }
  };

  // ── Abrir modal editar clase ────────────────────────────────────────────────
  const abrirEditClase = (clase) => {
    setEditClase(clase);
    setEditForm({
      tipoAula:       clase.tipoAula    || '',
      hora:           clase.hora        ? clase.hora.substring(0, 5) : '',
      instructorId:   clase.instructorId != null ? String(clase.instructorId) : '',
      horaSalida:     clase.horaSalida  ? clase.horaSalida.substring(0, 5) : '',
      horas:          clase.horas       || '',
      lugar:          clase.lugar       || '',
      tarifa:         clase.tarifa      || '',
      ingresoIdSelec: clase.ingresoId   || '',
      cobrada:        clase.cobrada     || false,
      notificar:      false, // toggle para resetear a PENDIENTE y avisar al instructor
    });
  };

  // ── Guardar edición de clase ────────────────────────────────────────────────
  const guardarEditClase = async () => {
    if (guardandoEditRef.current) return;
    // La salida tiene que ser posterior a la entrada, si no las horas quedan
    // negativas y el bloque se dibuja mal en el timeline.
    if (editForm.hora && editForm.horaSalida && editForm.hora >= editForm.horaSalida) {
      alert('La hora de salida tiene que ser posterior a la de entrada.');
      return;
    }
    guardandoEditRef.current = true;
    setGuardandoEdit(true);
    try {
      const ingresoIdNum = editForm.ingresoIdSelec
        ? parseInt(editForm.ingresoIdSelec)
        : null;
      const payload = {
        tipoAula:   editForm.tipoAula   || null,
        hora:       editForm.hora       ? `${editForm.hora}:00` : null,
        horaSalida: editForm.horaSalida ? `${editForm.horaSalida}:00` : null,
        horas:      editForm.horas      ? parseFloat(editForm.horas)  : null,
        lugar:      editForm.lugar      || null,
        tarifa:     editForm.tarifa     ? parseFloat(editForm.tarifa) : null,
        // Si notificar=true, resetea a PENDIENTE para que el instructor lo vea como nuevo
        estado:     editForm.notificar ? 'PENDIENTE' : null,
      };

      // Instructor: solo si cambió, así no se dispara un push al pedo
      const instrOriginal = editClase.instructorId != null ? String(editClase.instructorId) : '';
      if (editForm.instructorId !== instrOriginal) {
        payload.instructorId = editForm.instructorId ? Number(editForm.instructorId) : null;
      }

      // El cobro solo se toca si de verdad cambió la selección. Mandar
      // `cobrada` siempre hacía que el backend pisara ingresoId y una clase
      // ya cobrada se desvinculara al guardar cualquier otro campo.
      const ingresoOriginal = editClase.ingresoId != null ? String(editClase.ingresoId) : '';
      if (String(editForm.ingresoIdSelec || '') !== ingresoOriginal) {
        payload.cobrada   = !!ingresoIdNum;
        payload.ingresoId = ingresoIdNum || null;
      }
      const res = await api.patch(`/api/agenda/${editClase.id}`, payload);
      // Si la clase ya estaba acreditada y cambió instructor u horas, el
      // backend deshace la liquidación y devuelve { clase, aviso }.
      const claseAct = res.data?.clase || res.data;
      setAgenda(p => p.map(a => a.id === editClase.id ? claseAct : a));
      setEditClase(null);
      if (res.data?.aviso) alert(res.data.aviso);
    } catch (e) {
      alert('No se pudo guardar.');
    } finally {
      guardandoEditRef.current = false;
      setGuardandoEdit(false);
    }
  };

  // ── Navegar al día anterior/siguiente desde el panel del día ───────────────
  const navDia = (dir) => {
    if (!diaSelec) return;
    const d = new Date(diaSelec);
    d.setDate(d.getDate() + dir);
    setDiaSelec(toYMD(d));
    // Si el día destino está fuera del mes actual, cambiar el mes
    const y = d.getFullYear(), m = d.getMonth();
    if (y !== mes.y || m !== mes.m) setMes({ y, m });
  };

  // ── Drag & drop de hora en el timeline ─────────────────────────────────────
  const onDragHora = async (agendaId, nuevaHora) => {
    try {
      await api.patch(`/api/agenda/${agendaId}`, { hora: nuevaHora });
      setAgenda(p => p.map(a => a.id === agendaId ? { ...a, hora: nuevaHora } : a));
    } catch (e) {
      console.error('Error al mover clase:', e);
    }
  };
  // ── Eliminar clase ──────────────────────────────────────────────────────────
  const eliminarClase = async (id) => {
    try {
      await api.delete(`/api/agenda/${id}`);
      setAgenda(p => p.filter(a => a.id !== id));
    } catch (e) { alert('No se pudo eliminar.'); }
  };

  // ── Guardar cambios de la clase desde el drawer ───────────────────────────
  // Recibe solo los campos que cambiaron: hora, horaSalida, horas, tipoAula
  // o instructorId. Lanza el error para que el drawer lo muestre en contexto
  // en vez de un alert suelto.
  const onSaveClase = async (id, payload) => {
    if (!payload || Object.keys(payload).length === 0) return;
    const res = await api.patch(`/api/agenda/${id}`, payload);
    // Si se editó una clase ya acreditada, el backend deshace la liquidación
    // y devuelve { clase, aviso } en vez de la clase sola.
    const clase = res.data?.clase || res.data;
    setAgenda(p => p.map(a => (a.id === id ? clase : a)));
    if (res.data?.aviso) alert(res.data.aviso);
    return clase;
  };

  // Solo secretaria/admin. Acumula horas en el pasivo del instructor
  // y marca la clase como FINALIZADA para que no se duplique.
  const liquidarClase = async (clase) => {
    const nombre = clase.alumno || 'esta clase';
    const instructor = clase.nombreInstructor || 'el instructor';
    const horas = clase.horas || '?';

    if (!window.confirm(
      `¿Liquidar clase de ${nombre} con ${instructor} (${horas}h)?\n\nSe acumulará el monto correspondiente en la tarjeta del instructor.`
    )) return;

    try {
      const res = await api.post(`/api/agenda/${clase.id}/liquidar`);
      const data = res.data;

      // Actualizar estado local a FINALIZADA
      setAgenda(p => p.map(a => a.id === clase.id ? { ...a, estado: 'FINALIZADA' } : a));

      if (data.aviso) {
        alert(`✓ ${data.aviso}`);
      } else {
        // Éxito silencioso — el badge "Liquidada" aparece en la clase
      }
    } catch (e) {
      const msg = e.response?.data || 'No se pudo liquidar la clase.';
      alert(`Error: ${msg}`);
    }
  };
  const abrirAgendar = (fecha, hora = '09:00') => {
    setAgendarFecha(fecha);
    setAgendarHora(hora);
    setDuplicarPrefill(null); // limpia prefill para agenda normal
    setShowAgendar(true);
  };

  // ── Duplicar clase ──────────────────────────────────────────────────────────
  const duplicarClase = (clase) => {
    setAgendarFecha(clase.fecha?.toString() || HOY);
    setAgendarHora(clase.hora ? String(clase.hora).substring(0, 5) : '09:00');
    setDuplicarPrefill({
      alumno:          clase.alumno          || '',
      instructorId:    clase.instructorId    || '',
      tipoAula:        clase.tipoAula        || '',
      horas:           clase.horas           || 1,
      tarifa:          clase.tarifa          || '',
      lugar:           clase.lugar           || '',
      hotelDerivacion: clase.hotelDerivacion || '',
    });
    setShowAgendar(true);
  };

  // ── Guardar clase agendada ──────────────────────────────────────────────────
  const guardarAgendar = async (form) => {
    if (guardandoAgendar) return;
    setGuardandoAgendar(true);
    try {
      const payload = {
        alumno:          form.alumno,
        instructorId:    form.instructorId ? Number(form.instructorId) : null,
        tipoAula:        form.tipoAula   || null,
        fecha:           form.fecha,
        hora:            form.hora,
        horaSalida:      form.horaSalida || null,
        horas:           Number(form.horas)         || 1,
        tarifa:          Number(form.tarifa)         || 0,
        horasPagadas:    Number(form.horasPagadas)   || 0,
        lugar:           form.lugar            || null,
        hotelDerivacion: form.hotelDerivacion  || null,
        notas:           form.notas            || null,
        estado:          'PENDIENTE',
      };
      await api.post('/api/agenda/crear', payload);
      setShowAgendar(false);
      await cargar(); // refetch para ver la clase nueva
    } catch (e) {
      console.error(e);
      alert('No se pudo agendar la clase. Revisá los datos.');
    } finally {
      setGuardandoAgendar(false);
    }
  };

  // ── Abrir modal nuevo ingreso ───────────────────────────────────────────────
  const abrirIngreso = (fecha, prefill = {}) => {
    setIngresoFecha(fecha);
    setClasesSelec([]);
    setIngresoForm({
      fecha,
      total:      '',
      moneda:     'R$_STONE_IGNA',
      formaPago:  'Efectivo',
      detalles:   '',
      instructor: prefill.instructor || '',
      actividad:  'Clase de Kite',
      asignadoA:  'IGNA',
    });
    setShowIngreso(true);
  };

  const toggleClaseSelec = (id) =>
    setClasesSelec(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // Autocompletar total y detalles al seleccionar clases
  useEffect(() => {
    if (clasesSelec.length === 0) return;
    const sel = clasesParaIngreso.filter(c => clasesSelec.includes(c.id));
    const totalAuto = sel.reduce((sum, c) =>
      c.tarifa && c.horas ? sum + c.tarifa * c.horas : sum, 0);
    const instAuto  = sel.length === 1 ? sel[0].nombreInstructor : '';
    const alumnos   = sel.map(c => c.alumno).filter(Boolean).join(', ');
    setIngresoForm(p => ({
      ...p,
      instructor: instAuto || p.instructor,
      total:      totalAuto > 0 ? String(totalAuto) : p.total,
      detalles:   alumnos || p.detalles,
    }));
  }, [clasesSelec]);

  // ── Guardar nuevo ingreso ───────────────────────────────────────────────────
  const guardarIngreso = async () => {
    if (enviandoRef.current) return;
    if (!ingresoForm.total || parseFloat(ingresoForm.total) <= 0) {
      return alert('Ingresá el monto.');
    }
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const descuento  = ingresoForm.formaPago === 'Tarjeta Crédito'
        ? parseFloat(ingresoForm.total) * 0.05 : 0;
      const totalFinal = parseFloat(ingresoForm.total) - descuento;

      const payload = {
        tipoTransaccion: 'INGRESO',
        fecha:      ingresoForm.fecha,
        actividad:  ingresoForm.actividad || 'Clase',
        detalles:   ingresoForm.detalles,
        instructor: ingresoForm.instructor,
        total:      String(totalFinal),
        moneda:     ingresoForm.moneda,
        formaPago:  ingresoForm.formaPago,
        comision:   String(descuento),
        asignadoA:  ingresoForm.asignadoA || null,
        agendaIds:  clasesSelec.length > 0 ? clasesSelec.join(',') : null,
      };

      const res = await api.post('/api/clases/guardar', payload);

      // Actualizar estado local inmediatamente
      if (clasesSelec.length > 0) {
        setAgenda(p => p.map(a =>
          clasesSelec.includes(a.id)
            ? { ...a, cobrada: true, ingresoId: res.data.id }
            : a
        ));
      }

      setShowIngreso(false);
      await cargar(); // refetch completo para datos frescos
    } catch (e) {
      console.error(e);
      alert('Error al guardar el ingreso.');
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

    // Loading
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:'3px solid #9FE1CB', borderTopColor:'#0F6E56', borderRadius:'50%', animation:'mspin .7s linear infinite', margin:'0 auto 12px' }}/>
        <p style={{ color:'#3a6b5e', fontSize:13 }}>Cargando monitor...</p>
        <style>{`@keyframes mspin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  // Render
  return (
    <div style={{ maxWidth:940, margin:'0 auto', padding:'0 14px 80px', fontFamily:'system-ui,sans-serif' }}>
      <style>{`@keyframes mspin{to{transform:rotate(360deg)}}`}</style>

      <MonitorCalendario
        mes={mes} navMes={navMes}
        grilla={grilla} dotsD={dotsD}
        diaSelec={diaSelec} setDiaSelec={setDiaSelec}
        filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo}
        filtroInst={filtroInst} setFiltroInst={setFiltroInst}
        instructores={instructores}
        alertas={alertas}
        cargar={cargar}
        abrirIngreso={abrirIngreso}
      />

      <MonitorDia
        diaSelec={diaSelec}
        evD={evD}
        agenda={agenda}
        ingresos={ingresos}
        tieneCobro={tieneCobro}
        ingresoDeClase={ingresoDeClase}
        cambiarEstado={cambiarEstado}
        abrirEditClase={abrirEditClase}
        abrirIngreso={abrirIngreso}
        abrirAgendar={abrirAgendar}
        liquidarClase={liquidarClase}
        duplicarClase={duplicarClase}
        navDia={navDia}
        onDragHora={onDragHora}
        eliminarClase={eliminarClase}
        onSaveClase={onSaveClase}
        instructores={instructoresSelect}
      />

      <MonitorResumen mes={mes} resumen={resumen}/>

      <ModalEditarClase
        editClase={editClase}
        editForm={editForm} setEditForm={setEditForm}
        ingresosDisponiblesEdit={ingresosDisponiblesEdit}
        instructores={instructoresSelect}
        agenda={agenda}
        guardandoEdit={guardandoEdit}
        guardarEditClase={guardarEditClase}
        onClose={() => setEditClase(null)}
      />

      {showAgendar && (
        <ModalAgendar
          fecha={agendarFecha}
          horaInicio={agendarHora}
          prefill={duplicarPrefill}
          instructores={usuarios}
          guardando={guardandoAgendar}
          onSubmit={guardarAgendar}
          onClose={() => { setShowAgendar(false); setDuplicarPrefill(null); }}
        />
      )}

      {showIngreso && (
        <ModalNuevoIngreso
          ingresoFecha={ingresoFecha}
          ingresoForm={ingresoForm} setIngresoForm={setIngresoForm}
          clasesParaIngreso={clasesParaIngreso}
          clasesSelec={clasesSelec} toggleClaseSelec={toggleClaseSelec}
          agenda={agenda}
          tieneCobro={tieneCobro}
          instructores={instructores}
          enviando={enviando}
          guardarIngreso={guardarIngreso}
          onClose={() => setShowIngreso(false)}
        />
      )}
    </div>
  );
};

export default Monitor;