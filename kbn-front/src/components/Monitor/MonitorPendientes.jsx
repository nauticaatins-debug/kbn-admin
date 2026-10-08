import React, { useEffect, useMemo, useState } from 'react';
import api from '../../axiosConfig';
import { NA, fmt, esPasado, normName } from './MonitorShared';

/* ══════════════════════════════════════════════════════════════════════════
   POR RESOLVER

   Dos tareas que antes había que hacer clase por clase, abriendo el día de
   cada una:

   1. Confirmar — las clases que ya pasaron y siguen esperando el visto.
      Agrupadas por instructor, porque es como se revisa: "¿qué dio Facu este
      mes?". Se tildan de a varias y se confirman juntas; cada una liquida
      sola en la tarjeta del instructor.

   2. Conectar — los cobros que no quedaron atados a ninguna clase y las
      clases que figuran sin cobro. Elegís un cobro, te marca las clases que
      podrían ser, y las atás de una.

   Nada se guarda hasta que apretás el botón, y cada acción dice qué hizo.
   ══════════════════════════════════════════════════════════════════════════ */

const T = {
  fondo:  'rgba(255,255,255,.05)',
  fondo2: 'rgba(255,255,255,.08)',
  borde:  'rgba(255,255,255,.12)',
  texto:  'rgba(255,255,255,.92)',
  suave:  'rgba(255,255,255,.55)',
  tenue:  'rgba(255,255,255,.34)',
  ok:     '#34D399',
  aviso:  '#FBBF24',
  error:  '#F87171',
  linka:  '#C084FC',
};

const SIN_INSTRUCTOR = 'Sin instructor asignado';
const dia = (s) => Math.floor(new Date(`${String(s).slice(0, 10)}T00:00:00`).getTime() / 86400000);

// Dos nombres "se parecen" si uno contiene al otro. Alcanza para Cynthia /
// Pack Cynthia, que es como entran los cobros de paquetes.
const parecido = (a, b) => {
  const x = normName(a), y = normName(b);
  return x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x));
};

const Chip = ({ activo, children, onClick, color = NA.primary }) => (
  <button type="button" onClick={onClick}
    style={{
      fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 99, cursor: 'pointer',
      border: `1px solid ${activo ? color : T.borde}`,
      background: activo ? 'rgba(26,191,160,.16)' : 'transparent',
      color: activo ? color : T.suave, whiteSpace: 'nowrap',
    }}>{children}</button>
);

const Boton = ({ children, onClick, disabled, tono = 'ok' }) => {
  const bg = tono === 'ok' ? '#047857' : tono === 'no' ? 'transparent' : T.fondo2;
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        border: tono === 'no' ? `1px solid ${T.borde}` : 'none',
        background: disabled ? 'rgba(255,255,255,.07)' : bg,
        color: disabled ? T.tenue : tono === 'no' ? T.suave : '#fff',
        cursor: disabled ? 'default' : 'pointer',
      }}>{children}</button>
  );
};

// ── Fila de clase, con casilla ──────────────────────────────────────────────
const Fila = ({ clase, marcada, onToggle, sugerida, derecha }) => (
  <div onClick={onToggle}
    style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', cursor: 'pointer',
      borderRadius: 9, background: marcada ? 'rgba(52,211,153,.12)' : sugerida ? 'rgba(192,132,252,.1)' : 'transparent',
      border: `1px solid ${marcada ? 'rgba(52,211,153,.35)' : sugerida ? 'rgba(192,132,252,.3)' : 'transparent'}`,
    }}>
    <span style={{
      width: 16, height: 16, borderRadius: 5, flexShrink: 0, fontSize: 11, lineHeight: '15px',
      textAlign: 'center', color: '#06302E', fontWeight: 700,
      border: `1.5px solid ${marcada ? T.ok : T.borde}`, background: marcada ? T.ok : 'transparent',
    }}>{marcada ? '✓' : ''}</span>
    <span style={{ fontSize: 11.5, color: T.tenue, minWidth: 44 }}>{fmt(String(clase.fecha).slice(0, 10))}</span>
    <span style={{ fontSize: 13, color: T.texto, flex: 1, minWidth: 0, overflow: 'hidden',
      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clase.alumno || 'Sin nombre'}</span>
    {derecha}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════
export default function MonitorPendientes({
  agenda, ingresos, tieneCobro, instructores, cargar, setDiaSelec,
}) {
  const [abierto, setAbierto]   = useState(false);
  const [tab, setTab]           = useState('confirmar');
  const [marcadas, setMarcadas] = useState(() => new Set());
  const [grupoAbierto, setGrupoAbierto] = useState(null);
  const [cobroSel, setCobroSel] = useState(null);
  const [buscar, setBuscar]     = useState('');
  const [soloSug, setSoloSug]   = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [resultado, setResultado]   = useState(null);
  const [liquidaciones, setLiquidaciones] = useState([]);

  // Movimientos ya acreditados en las tarjetas. Sin esto, confirmar en lote
  // volvería a liquidar clases que ya se pagaron: hay bastantes de julio y
  // agosto que se acreditaron a mano, cuando el movimiento todavía no
  // guardaba de qué clase venía.
  useEffect(() => {
    api.get('/api/pasivos')
      .then((r) => setLiquidaciones((r.data || []).flatMap((p) =>
        (p.historialPagos || [])
          .filter((m) => /×/.test(m.nota || ''))
          .map((m) => ({
            origenAgendaId: m.origenAgendaId,
            fecha: String(m.fecha || '').slice(0, 10),
            tarjeta: p.titulo,
            horas: (() => {
              const g = /(\d+(?:[.,]\d+)?)\s*h\s*×/.exec(m.nota || '');
              return g ? parseFloat(g[1].replace(',', '.')) : null;
            })(),
            monto: m.montoPagado,
          })))))
      .catch((e) => { console.error('[Pendientes] no se pudieron traer las tarjetas:', e); setLiquidaciones([]); });
  }, []);

  // Una clase ya está acreditada si hay un movimiento que la señala, o —para
  // las viejas, que no guardaban el origen— si ese día, en la tarjeta de ese
  // instructor, hay una liquidación por esa misma cantidad de horas.
  const acreditada = useMemo(() => {
    const porOrigen = new Set(liquidaciones.filter((m) => m.origenAgendaId).map((m) => m.origenAgendaId));
    return (a) => {
      if (porOrigen.has(a.id)) return true;
      const f = String(a.fecha || '').slice(0, 10);
      const h = parseFloat(a.horas) || 0;
      if (!a.nombreInstructor || !h) return false;
      return liquidaciones.some((m) => !m.origenAgendaId && m.fecha === f
        && normName(m.tarjeta) === normName(a.nombreInstructor)
        && m.horas != null && Math.abs(m.horas - h) < 0.01);
    };
  }, [liquidaciones]);

  const toggle = (id) => setMarcadas((p) => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  // ── 1. Por confirmar ──────────────────────────────────────────────────────
  const porConfirmar = useMemo(() => (agenda || []).filter((a) => {
    const f = String(a.fecha || '').slice(0, 10);
    return f && esPasado(f) && a.estado !== 'FINALIZADA' && a.estado !== 'RECHAZADA';
  }), [agenda]);

  const grupos = useMemo(() => {
    const m = new Map();
    porConfirmar.forEach((a) => {
      const k = a.nombreInstructor || SIN_INSTRUCTOR;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(a);
    });
    m.forEach((l) => l.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))));
    // El que más debe primero; "sin instructor" al final, no se puede liquidar
    return [...m.entries()].sort((a, b) => {
      if (a[0] === SIN_INSTRUCTOR) return 1;
      if (b[0] === SIN_INSTRUCTOR) return -1;
      return b[1].length - a[1].length;
    });
  }, [porConfirmar]);

  // ── 2. Por conectar ───────────────────────────────────────────────────────
  const sinCobro = useMemo(() => (agenda || []).filter((a) => {
    const f = String(a.fecha || '').slice(0, 10);
    return f && esPasado(f) && a.estado !== 'RECHAZADA' && !tieneCobro(a);
  }).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))), [agenda, tieneCobro]);

  const cobrosSinClase = useMemo(() => {
    const atadas = new Set();
    (agenda || []).forEach((a) => {
      if (a.ingresoId) atadas.add(String(a.ingresoId));
    });
    return (ingresos || []).filter((i) => {
      if (atadas.has(String(i.id))) return false;
      return !i.agendaIds || !String(i.agendaIds).trim();
    }).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [agenda, ingresos]);

  // Clases que podrían corresponder al cobro elegido: mismo nombre y fecha
  // cercana. Pagan el paquete al final, así que la ventana mira para atrás.
  const sugeridas = useMemo(() => {
    if (!cobroSel) return new Set();
    const ref = `${cobroSel.detalles || ''} ${cobroSel.actividad || ''}`;
    const d0 = dia(cobroSel.fecha);
    return new Set(sinCobro.filter((a) => {
      const d = dia(a.fecha) - d0;
      return d >= -60 && d <= 15 && parecido(ref, a.alumno);
    }).map((a) => a.id));
  }, [cobroSel, sinCobro]);

  const totalMarcadas = marcadas.size;
  const yaAcreditadas = useMemo(() => porConfirmar.filter(acreditada).length, [porConfirmar, acreditada]);

  // Cuántas clases podría cubrir cada cobro. Sirve para esconder los cobros
  // que no tienen ninguna candidata: de 200 y pico, suelen quedar un puñado.
  const sugeridasDe = useMemo(() => {
    const m = new Map();
    cobrosSinClase.forEach((i) => {
      const ref = `${i.detalles || ''} ${i.actividad || ''}`;
      const d0 = dia(i.fecha);
      m.set(i.id, sinCobro.filter((a) => {
        const d = dia(a.fecha) - d0;
        return d >= -60 && d <= 15 && parecido(ref, a.alumno);
      }).length);
    });
    return m;
  }, [cobrosSinClase, sinCobro]);

  const cobrosVisibles = soloSug
    ? cobrosSinClase.filter((i) => (sugeridasDe.get(i.id) || 0) > 0)
    : cobrosSinClase;

  const clasesVisibles = useMemo(() => {
    const q = normName(buscar);
    const base = q ? sinCobro.filter((a) => normName(a.alumno).includes(q)) : sinCobro;
    return [...base].sort((a, b) => {
      const sa = sugeridas.has(a.id) ? 0 : 1, sb = sugeridas.has(b.id) ? 0 : 1;
      return sa - sb || String(b.fecha).localeCompare(String(a.fecha));
    });
  }, [sinCobro, buscar, sugeridas]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const confirmarMarcadas = async () => {
    const elegidas = porConfirmar.filter((a) => marcadas.has(a.id));
    if (!elegidas.length) return;
    const sinInstr = elegidas.filter((a) => !a.nombreInstructor);
    if (sinInstr.length && !window.confirm(
      `${sinInstr.length} de las ${elegidas.length} no tienen instructor y no se van a poder liquidar. ¿Sigo igual?`
    )) return;

    setTrabajando(true);
    let ok = 0, liquidadas = 0, cerradas = 0; const fallos = [];
    for (const a of elegidas) {
      const yaEsta = acreditada(a);
      try {
        if (yaEsta) {
          // Ya cobró estas horas: solo se cierra el estado. Llamar a liquidar
          // acá le pagaría la misma clase dos veces.
          await api.put(`/api/agenda/${a.id}/estado`, 'FINALIZADA', {
            headers: { 'Content-Type': 'text/plain' },
          });
          cerradas++;
        } else {
          await api.put(`/api/agenda/${a.id}/estado`, 'CONFIRMADA', {
            headers: { 'Content-Type': 'text/plain' },
          });
          if (a.nombreInstructor) {
            try { await api.post(`/api/agenda/${a.id}/liquidar`); liquidadas++; }
            catch (e) { fallos.push(`${a.alumno}: ${e.response?.data || 'no se pudo liquidar'}`); }
          }
        }
        ok++;
      } catch (e) {
        fallos.push(`${a.alumno}: ${e.response?.data || 'no se pudo confirmar'}`);
      }
    }
    setMarcadas(new Set());
    setResultado({
      titulo: `${ok} confirmada${ok === 1 ? '' : 's'}`
        + (liquidadas ? ` · ${liquidadas} liquidada${liquidadas === 1 ? '' : 's'}` : '')
        + (cerradas ? ` · ${cerradas} ya estaba${cerradas === 1 ? '' : 'n'} acreditada${cerradas === 1 ? '' : 's'}, solo se cerró el estado` : ''),
      fallos,
    });
    setTrabajando(false);
    cargar();
  };

  const rechazarMarcadas = async () => {
    const elegidas = porConfirmar.filter((a) => marcadas.has(a.id));
    if (!elegidas.length) return;
    if (!window.confirm(`¿Rechazar ${elegidas.length} clase${elegidas.length === 1 ? '' : 's'}? No se le paga a nadie por ellas.`)) return;
    setTrabajando(true);
    let ok = 0; const fallos = [];
    for (const a of elegidas) {
      try {
        await api.put(`/api/agenda/${a.id}/estado`, 'RECHAZADA', {
          headers: { 'Content-Type': 'text/plain' },
        });
        ok++;
      } catch (e) { fallos.push(`${a.alumno}: ${e.response?.data || 'no se pudo rechazar'}`); }
    }
    setMarcadas(new Set());
    setResultado({ titulo: `${ok} rechazada${ok === 1 ? '' : 's'}`, fallos });
    setTrabajando(false);
    cargar();
  };

  const asignarInstructor = async (claseId, instructorId) => {
    setTrabajando(true);
    try {
      await api.patch(`/api/agenda/${claseId}`, { instructorId: Number(instructorId) });
      setResultado({ titulo: 'Instructor asignado', fallos: [] });
      cargar();
    } catch (e) {
      setResultado({ titulo: 'No se pudo asignar', fallos: [String(e.response?.data || e.message)] });
    } finally { setTrabajando(false); }
  };

  const conectar = async () => {
    const ids = [...marcadas];
    if (!cobroSel || !ids.length) return;
    setTrabajando(true);
    try {
      await api.post('/api/agenda/cobrar', { ingresoId: cobroSel.id, agendaIds: ids });
      setResultado({ titulo: `${ids.length} clase${ids.length === 1 ? '' : 's'} conectada${ids.length === 1 ? '' : 's'} al cobro`, fallos: [] });
      setMarcadas(new Set());
      setCobroSel(null);
      cargar();
    } catch (e) {
      setResultado({ titulo: 'No se pudo conectar', fallos: [String(e.response?.data || e.message)] });
    } finally { setTrabajando(false); }
  };

  const cambiarTab = (t) => { setTab(t); setMarcadas(new Set()); setCobroSel(null); setResultado(null); };

  if (!porConfirmar.length && !sinCobro.length) return null;

  // ── Barra cerrada ─────────────────────────────────────────────────────────
  if (!abierto) return (
    <div onClick={() => setAbierto(true)}
      style={{ background: 'rgba(251,191,36,.12)', border: '1px solid rgba(251,191,36,.3)',
        borderRadius: 14, padding: '13px 16px', marginBottom: 14, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <i className="ti ti-list-check" style={{ color: T.aviso, fontSize: 18 }} />
      <div style={{ flex: 1, minWidth: 180 }}>
        <p style={{ margin: 0, fontWeight: 600, color: T.texto, fontSize: 14 }}>Por resolver</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: T.suave }}>
          {porConfirmar.length} sin confirmar · {sinCobro.length} sin cobro
        </p>
      </div>
      <span style={{ fontSize: 12.5, color: T.aviso, fontWeight: 600 }}>Abrir ▾</span>
    </div>
  );

  // ── Panel abierto ─────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'rgba(0,0,0,.2)', border: `1px solid ${T.borde}`,
      borderRadius: 16, padding: 16, marginBottom: 14 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.texto, flex: 1 }}>Por resolver</h3>
        <Chip activo={tab === 'confirmar'} onClick={() => cambiarTab('confirmar')}>
          Confirmar {porConfirmar.length}
        </Chip>
        <Chip activo={tab === 'conectar'} onClick={() => cambiarTab('conectar')} color={T.linka}>
          Conectar cobros {sinCobro.length}
        </Chip>
        <button onClick={() => setAbierto(false)}
          style={{ background: 'transparent', border: 'none', color: T.tenue, fontSize: 18, cursor: 'pointer' }}>×</button>
      </div>

      {resultado && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, fontSize: 12.5,
          background: resultado.fallos.length ? 'rgba(251,191,36,.12)' : 'rgba(52,211,153,.12)',
          color: resultado.fallos.length ? T.aviso : T.ok, lineHeight: 1.5 }}>
          <strong>{resultado.titulo}</strong>
          {resultado.fallos.map((f, i) => <div key={i} style={{ color: T.error, marginTop: 3 }}>{f}</div>)}
        </div>
      )}

      {/* ══ TAB CONFIRMAR ══ */}
      {tab === 'confirmar' && (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: T.tenue, lineHeight: 1.5 }}>
            Clases que ya pasaron y siguen esperando el visto. Al confirmarlas se le acreditan
            las horas al instructor en su cuenta corriente.
          </p>

          {yaAcreditadas > 0 && (
            <p style={{ margin: '0 0 12px', padding: '9px 11px', borderRadius: 9, fontSize: 12,
              background: 'rgba(52,211,153,.1)', color: T.ok, lineHeight: 1.5 }}>
              {yaAcreditadas} de estas ya tienen el movimiento cargado en la tarjeta del instructor
              —son las viejas, que se acreditaron a mano—. Van marcadas <strong>ya acreditada</strong>:
              al confirmarlas solo se cierra el estado, no se les paga de nuevo.
            </p>
          )}

          <div style={{ maxHeight: 420, overflowY: 'auto', marginBottom: 14 }}>
            {grupos.map(([nombre, clases]) => {
              const abre = grupoAbierto === nombre;
              const horas = clases.reduce((s, a) => s + (parseFloat(a.horas) || 0), 0);
              const todasMarcadas = clases.every((a) => marcadas.has(a.id));
              const esSinInstructor = nombre === SIN_INSTRUCTOR;

              return (
                <div key={nombre} style={{ marginBottom: 8, border: `1px solid ${T.borde}`,
                  borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 12px', background: abre ? T.fondo2 : T.fondo,
                    display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span onClick={() => setGrupoAbierto(abre ? null : nombre)}
                      style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600,
                        color: esSinInstructor ? T.aviso : T.texto }}>{nombre}</span>
                      <span style={{ fontSize: 11.5, color: T.tenue, marginLeft: 8 }}>
                        {clases.length} clase{clases.length === 1 ? '' : 's'}
                        {!esSinInstructor && horas > 0 && ` · ${horas}h`}
                      </span>
                    </span>
                    {!esSinInstructor && (
                      <button onClick={() => setMarcadas((p) => {
                        const n = new Set(p);
                        clases.forEach((a) => todasMarcadas ? n.delete(a.id) : n.add(a.id));
                        return n;
                      })}
                        style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
                          border: `1px solid ${T.borde}`, background: 'transparent', color: T.suave }}>
                        {todasMarcadas ? 'Ninguna' : 'Todas'}
                      </button>
                    )}
                    <span onClick={() => setGrupoAbierto(abre ? null : nombre)}
                      style={{ color: T.tenue, cursor: 'pointer', fontSize: 13 }}>{abre ? '▴' : '▾'}</span>
                  </div>

                  {abre && (
                    <div style={{ padding: 6 }}>
                      {esSinInstructor && (
                        <p style={{ margin: '4px 8px 10px', fontSize: 11.5, color: T.aviso, lineHeight: 1.5 }}>
                          Sin instructor no se puede liquidar. Asignale uno acá, o si es un rental
                          sin profe, confirmala igual: se cierra sin acreditarle horas a nadie.
                        </p>
                      )}
                      {clases.map((a) => (
                        <Fila key={a.id} clase={a} marcada={marcadas.has(a.id)}
                          onToggle={() => toggle(a.id)}
                          derecha={
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                              onClick={(e) => e.stopPropagation()}>
                              {acreditada(a) && (
                                <span title="Ya tiene el movimiento en la tarjeta. Al confirmarla solo se cierra el estado, no se paga de nuevo."
                                  style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                                    background: 'rgba(52,211,153,.15)', color: T.ok, whiteSpace: 'nowrap' }}>
                                  ya acreditada
                                </span>
                              )}
                              {a.tipoAula && <span style={{ fontSize: 10.5, color: T.tenue }}>{a.tipoAula}</span>}
                              <span style={{ fontSize: 11.5, color: a.horas ? T.suave : T.error, minWidth: 30 }}>
                                {a.horas ? `${a.horas}h` : 'sin h'}
                              </span>
                              {esSinInstructor && (
                                <select defaultValue="" disabled={trabajando}
                                  onChange={(e) => e.target.value && asignarInstructor(a.id, e.target.value)}
                                  style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6,
                                    border: `1px solid ${T.borde}`, background: 'rgba(255,255,255,.07)', color: T.texto }}>
                                  <option value="" style={{ color: '#111' }}>asignar…</option>
                                  {(instructores || []).map((u) => (
                                    <option key={u.id} value={u.id} style={{ color: '#111' }}>{u.nombre}</option>
                                  ))}
                                </select>
                              )}
                              <button onClick={() => setDiaSelec(String(a.fecha).slice(0, 10))}
                                title="Ver el día"
                                style={{ background: 'transparent', border: 'none', color: T.tenue,
                                  cursor: 'pointer', fontSize: 13, padding: 0 }}>↗</button>
                            </span>
                          } />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Boton onClick={confirmarMarcadas} disabled={!totalMarcadas || trabajando}>
              {trabajando ? 'Guardando…' : `Confirmar ${totalMarcadas || ''}`}
            </Boton>
            <Boton tono="no" onClick={rechazarMarcadas} disabled={!totalMarcadas || trabajando}>
              Rechazar
            </Boton>
            {totalMarcadas > 0 && (
              <span style={{ fontSize: 12, color: T.tenue }}>
                {totalMarcadas} seleccionada{totalMarcadas === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </>
      )}

      {/* ══ TAB CONECTAR ══ */}
      {tab === 'conectar' && (
        <>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: T.tenue, lineHeight: 1.5 }}>
            Elegí un cobro de la izquierda: a la derecha se marcan en violeta las clases que
            podrían ser suyas, por nombre y fecha. Tildá las que correspondan y conectalas.
          </p>

          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Cobros sueltos */}
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: T.suave, flex: 1 }}>
                  Cobros sin clase · {cobrosVisibles.length}
                  {soloSug && cobrosSinClase.length > cobrosVisibles.length && (
                    <span style={{ color: T.tenue, fontWeight: 400 }}> de {cobrosSinClase.length}</span>
                  )}
                </p>
                <button onClick={() => setSoloSug((v) => !v)}
                  style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 7, cursor: 'pointer',
                    border: `1px solid ${soloSug ? T.linka : T.borde}`, background: 'transparent',
                    color: soloSug ? T.linka : T.tenue, whiteSpace: 'nowrap' }}>
                  {soloSug ? 'con candidata' : 'todos'}
                </button>
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto', border: `1px solid ${T.borde}`,
                borderRadius: 11, padding: 6 }}>
                {!cobrosVisibles.length && (
                  <p style={{ fontSize: 12, color: T.tenue, textAlign: 'center', padding: '20px 0', margin: 0, lineHeight: 1.5 }}>
                    {soloSug && cobrosSinClase.length
                      ? 'Ninguno de los cobros sueltos coincide con una clase sin cobrar. Tocá “todos” para verlos igual.'
                      : 'Todos los cobros están atados a su clase.'}
                  </p>
                )}
                {cobrosVisibles.map((i) => {
                  const sel = cobroSel?.id === i.id;
                  const n = sugeridasDe.get(i.id) || 0;
                  return (
                    <div key={i.id}
                      onClick={() => { setCobroSel(sel ? null : i); setMarcadas(new Set()); }}
                      style={{ padding: '8px 10px', borderRadius: 9, cursor: 'pointer', marginBottom: 3,
                        background: sel ? 'rgba(192,132,252,.16)' : 'transparent',
                        border: `1px solid ${sel ? 'rgba(192,132,252,.45)' : 'transparent'}` }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                        <span style={{ fontSize: 11.5, color: T.tenue }}>{fmt(String(i.fecha).slice(0, 10))}</span>
                        <span style={{ fontSize: 13, color: T.texto, fontWeight: 600, flex: 1 }}>
                          R$ {(parseFloat(i.total) || 0).toFixed(2)}
                        </span>
                        {n > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                            background: 'rgba(192,132,252,.16)', color: T.linka, whiteSpace: 'nowrap' }}>
                            {n}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.suave, marginTop: 2, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {i.detalles || i.actividad || 'Sin detalle'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clases sin cobro */}
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: T.suave, flex: 1 }}>
                  Clases sin cobro · {sinCobro.length}
                  {cobroSel && sugeridas.size > 0 && (
                    <span style={{ color: T.linka, marginLeft: 6 }}>{sugeridas.size} sugerida{sugeridas.size === 1 ? '' : 's'}</span>
                  )}
                </p>
                <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="buscar alumno"
                  style={{ width: 110, fontSize: 11, padding: '4px 8px', borderRadius: 7, fontFamily: 'inherit',
                    border: `1px solid ${T.borde}`, background: 'rgba(255,255,255,.06)', color: T.texto }} />
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto', border: `1px solid ${T.borde}`,
                borderRadius: 11, padding: 6 }}>
                {!cobroSel && (
                  <p style={{ fontSize: 12, color: T.tenue, textAlign: 'center', padding: '20px 0', margin: 0 }}>
                    Elegí un cobro para ver cuáles podrían ser.
                  </p>
                )}
                {cobroSel && !clasesVisibles.length && (
                  <p style={{ fontSize: 12, color: T.tenue, textAlign: 'center', padding: '20px 0', margin: 0 }}>
                    Ninguna clase sin cobro coincide con “{buscar}”.
                  </p>
                )}
                {cobroSel && clasesVisibles.map((a) => (
                  <Fila key={a.id} clase={a} marcada={marcadas.has(a.id)}
                    sugerida={sugeridas.has(a.id)} onToggle={() => toggle(a.id)}
                    derecha={<span style={{ fontSize: 11, color: T.tenue, whiteSpace: 'nowrap' }}>
                      {a.nombreInstructor ? String(a.nombreInstructor).split(' ')[0] : '—'}
                      {a.horas ? ` · ${a.horas}h` : ''}
                    </span>} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <Boton onClick={conectar} disabled={!cobroSel || !totalMarcadas || trabajando}>
              {trabajando ? 'Guardando…' : `Conectar ${totalMarcadas || ''}`}
            </Boton>
            {cobroSel && (
              <span style={{ fontSize: 12, color: T.tenue }}>
                al cobro de R$ {(parseFloat(cobroSel.total) || 0).toFixed(2)} del {fmt(String(cobroSel.fecha).slice(0, 10))}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
