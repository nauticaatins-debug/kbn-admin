import React from 'react';
import { NA, DIAS_S, MESES, HOY, esHoy, esPasado, fmt, Dot, Btn } from './MonitorShared';

// El Monitor va sobre fondo claro (#f0faf7) — usamos colores oscuros
const MonitorCalendario = ({
  mes, navMes, grilla, dotsD, diaSelec, setDiaSelec,
  filtroTipo, setFiltroTipo, filtroInst, setFiltroInst,
  instructores, alertas, cargar, abrirIngreso,
}) => (
  <div>
    {/* ── BANNER ALERTAS ── */}
    {alertas.length > 0 && (
      <details style={{ background:'rgba(234,88,12,.15)', border:'1px solid #FED7AA', borderRadius:14, padding:'12px 16px', marginBottom:14 }}>
        <summary style={{ fontWeight:700, color:'#9A3412', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:8, listStyle:'none' }}>
          <i className="ti ti-alert-triangle" style={{ color:'#EA580C', fontSize:17 }}/>
          {alertas.length} clase{alertas.length>1?'s':''} sin cobro registrado
        </summary>
        <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
          {alertas.map(a => {
            const f = a.fecha?.toString();
            return (
              <div key={a.id} style={{ background:'rgba(255,255,255,.07)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                <div>
                  <p style={{ margin:0, fontWeight:600, color:'rgba(255,255,255,.9)', fontSize:13 }}>{a.alumno}</p>
                  <p style={{ margin:'2px 0 0', fontSize:11, color:'rgba(255,255,255,.5)' }}>
                    {fmt(f)} · {a.nombreInstructor} · {a.horas}h {a.tipoAula && `· ${a.tipoAula}`}
                  </p>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <Btn label="Ver día" bg={NA.light} color={NA.darker} small onClick={() => setDiaSelec(f)}/>
                  <Btn label="+ Ingreso" small icon="ti-cash"
                    onClick={() => abrirIngreso(f, { instructor: a.nombreInstructor })}/>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    )}

    {/* ── FILTROS ── */}
    <div style={{ background:'rgba(255,255,255,.07)', borderRadius:14, border:`0.5px solid rgba(255,255,255,.1)`, padding:'10px 14px', marginBottom:12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
      {[
        { v:'TODO',     l:'Todo'       },
        { v:'CLASES',   l:'📅 Clases'  },
        { v:'INGRESOS', l:'💰 Ingresos' },
        { v:'EGRESOS',  l:'💸 Egresos'  },
        { v:'ALERTAS',  l:`⚠️ Sin cobro${alertas.length>0?` (${alertas.length})`:''}`},
      ].map(({ v, l }) => (
        <button key={v} onClick={() => setFiltroTipo(v)}
          style={{ padding:'5px 12px', borderRadius:99, border:'none', fontSize:12, fontWeight:500, cursor:'pointer',
            background: filtroTipo===v ? NA.dark : NA.light,
            color:      filtroTipo===v ? '#fff'  : NA.text2 }}>
          {l}
        </button>
      ))}
      <select value={filtroInst} onChange={e => setFiltroInst(e.target.value)}
        style={{ padding:'6px 10px', borderRadius:8, border:`0.5px solid rgba(255,255,255,.1)`, fontSize:12, color:'rgba(255,255,255,.9)', background:'rgba(255,255,255,.04)', marginLeft:'auto' }}>
        <option value="">Todos los instructores</option>
        {instructores.map(i => <option key={i} value={i}>{i}</option>)}
      </select>
      <button onClick={cargar}
        style={{ padding:'6px 12px', borderRadius:8, border:`0.5px solid rgba(255,255,255,.1)`, background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.5)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
        <i className="ti ti-refresh" style={{ fontSize:14 }}/> Actualizar
      </button>
    </div>

    {/* ── CALENDARIO ── */}
    <div style={{ background:'rgba(255,255,255,.07)', borderRadius:16, border:`0.5px solid rgba(255,255,255,.1)`, overflow:'hidden', marginBottom:14 }}>
      {/* Header mes */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderBottom:`0.5px solid ${NA.border}` }}>
        <button onClick={() => navMes(-1)} style={{ width:32, height:32, borderRadius:8, border:`0.5px solid rgba(255,255,255,.1)`, background:'rgba(255,255,255,.07)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-chevron-left" style={{ fontSize:15, color:'rgba(255,255,255,.5)' }}/>
        </button>
        <span style={{ fontWeight:700, fontSize:16, color:'rgba(255,255,255,.9)' }}>{MESES[mes.m]} {mes.y}</span>
        <button onClick={() => navMes(1)} style={{ width:32, height:32, borderRadius:8, border:`0.5px solid rgba(255,255,255,.1)`, background:'rgba(255,255,255,.07)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-chevron-right" style={{ fontSize:15, color:'rgba(255,255,255,.5)' }}/>
        </button>
      </div>

      {/* Días semana */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:`0.5px solid ${NA.border}` }}>
        {DIAS_S.map(d => (
          <div key={d} style={{ textAlign:'center', padding:'7px 0', fontSize:11, fontWeight:600, color:'rgba(255,255,255,.5)' }}>{d}</div>
        ))}
      </div>

      {/* Celdas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
        {grilla.map((dia, idx) => {
          if (!dia) return (
            <div key={`e${idx}`} style={{ minHeight:56, borderRight:`0.5px solid rgba(255,255,255,.08)`, borderBottom:`0.5px solid rgba(255,255,255,.08)`, background:'rgba(0,0,0,.2)' }}/>
          );
          const ev    = dotsD[dia] || {};
          const selec = diaSelec === dia;
          const hoy   = esHoy(dia);
          return (
            <div key={dia} onClick={() => setDiaSelec(selec ? null : dia)}
              style={{ minHeight:56, padding:'5px', cursor:'pointer', boxSizing:'border-box',
                borderRight:`0.5px solid rgba(255,255,255,.08)`, borderBottom:`0.5px solid rgba(255,255,255,.08)`,
                background: selec ? 'rgba(46,207,196,.25)' : hoy ? 'rgba(46,207,196,.1)' : 'transparent', transition:'background .1s' }}>
              <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:3,
                background: hoy ? NA.dark : 'transparent',
                color:      hoy ? '#0a0e0d' : 'rgba(255,255,255,.85)',
                fontSize:12, fontWeight: hoy ? 700 : 400 }}>
                {parseInt(dia.split('-')[2])}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:2 }}>
                {ev.alerta  > 0 && <Dot color="#EA580C" n={ev.alerta}  />}
                {ev.clase   > 0 && <Dot color={NA.dark} n={ev.clase}   />}
                {ev.ingreso > 0 && <Dot color="#059669" n={ev.ingreso} />}
                {ev.egreso  > 0 && <Dot color="#DC2626" n={ev.egreso}  />}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* ── LEYENDA ── */}
    {/* marginTop: en mobile el header es fijo y la leyenda le quedaba debajo */}
    <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginTop:10, marginBottom:14 }}>
      {[['#EA580C','Sin cobro'],['#0F6E56','Clase'],['#059669','Ingreso'],['#DC2626','Egreso']].map(([c,l]) => (
        <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,.5)' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/>{l}
        </span>
      ))}
    </div>
  </div>
);

export default MonitorCalendario;