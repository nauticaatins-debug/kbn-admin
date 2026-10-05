import React, { useMemo, useState } from 'react';
import { NA, sx, labelCaja} from './PasivosShared';

// Tokens del tema oscuro. Se definen acá para que este archivo no dependa
// del orden en que se suban los cambios.
const T = {
  superficie:  'rgba(255,255,255,.045)',
  superficie2: 'rgba(255,255,255,.07)',
  linea:       'rgba(255,255,255,.09)',
  texto:       'rgba(255,255,255,.92)',
  medio:       'rgba(255,255,255,.55)',
  tenue:       'rgba(255,255,255,.32)',
  deben:       '#F98A8A',
  favor:       '#2ECFC4',
  fondoModal:  '#11201E',
};


// Normaliza la fecha a string "YYYY-MM-DD" venga como venga del backend
const aClave = (f) => {
  if (!f) return 'Sin fecha';
  if (Array.isArray(f)) {
    const [y, m, d] = f;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(f).slice(0, 10);
};

const aLabel = (clave) => {
  if (clave === 'Sin fecha') return clave;
  const p = clave.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : clave;
};

const ModalHistorial = ({ selectedPasivo, eliminandoMovIds, onDeleteMovimiento, onClose }) => {
  if (!selectedPasivo) return null;

  // Agrupar por día, más reciente primero
  const grupos = useMemo(() => {
    const map = new Map();
    (selectedPasivo.historialPagos || []).forEach((m) => {
      const k = aClave(m.fecha);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(m);
    });
    // Dentro de cada día, cronológico por id (el orden de inserción real).
    map.forEach((lista) => lista.sort((a, b) => (a.id || 0) - (b.id || 0)));
    // Días de más reciente a más antiguo. "Sin fecha" siempre al final
    // (antes quedaba primero porque "S" ordena después de los dígitos).
    return [...map.entries()].sort((a, b) => {
      if (a[0] === 'Sin fecha') return 1;
      if (b[0] === 'Sin fecha') return -1;
      return b[0].localeCompare(a[0]);
    });
  }, [selectedPasivo]);

  // Días abiertos — arranca con el más reciente
  const [abiertos, setAbiertos] = useState(() => new Set(grupos.length ? [grupos[0][0]] : []));
  const toggle = (k) => setAbiertos((prev) => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  const saldos = selectedPasivo.saldosPorMoneda || {};
  const saldosEntries = Object.entries(saldos).filter(([, v]) => Math.abs(v) > 0.001);

  return (
    <div style={sx.overlay} onClick={onClose}>
      <div style={{ ...sx.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: T.texto, margin: 0 }}>{selectedPasivo.titulo}</h2>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
          </button>
        </div>

        {/* Saldos */}
        {saldosEntries.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 14px' }}>
            {saldosEntries.map(([mon, val]) => {
              const esNeg = val < -0.001;
              return (
                <span key={mon} style={{
                  fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99,
                  background: esNeg ? '#FEF2F2' : NA.light,
                  color: esNeg ? '#B91C1C' : NA.dark,
                }}>
                  {esNeg ? '-' : '+'}R$ {Math.abs(val).toFixed(2)}
                </span>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 0 10px' }}>
          <p style={{ fontSize: 12, color: T.medio, margin: 0 }}>Historial de movimientos</p>
          <p style={{ fontSize: 11, color: T.tenue, margin: 0 }}>{grupos.length} día{grupos.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Lista por día */}
        <div style={{ maxHeight: 420, overflowY: 'auto', marginBottom: 18 }}>
          {grupos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: T.tenue, fontSize: 13 }}>
              Sin movimientos registrados.
            </div>
          )}

          {grupos.map(([clave, movs]) => {
            const open = abiertos.has(clave);

            // Subtotal por moneda del día
            const acc = {};
            movs.forEach((m) => {
              const mon = m.moneda || 'BRL';
              acc[mon] = (acc[mon] || 0) + (parseFloat(m.montoPagado) || 0);
            });
            const subtotales = Object.entries(acc).filter(([, v]) => Math.abs(v) > 0.001);

            return (
              <div key={clave} style={{ marginBottom: 8, border: `1px solid ${NA.border}`, borderRadius: 12, overflow: 'hidden' }}>

                {/* Cabecera del día */}
                <div
                  onClick={() => toggle(clave)}
                  style={{
                    padding: '11px 14px', cursor: 'pointer', background: open ? 'rgba(46,207,196,.1)' : T.superficie,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: NA.darker }}>{aLabel(clave)}</span>
                    <span style={{ fontSize: 11, color: T.tenue }}>{movs.length} mov.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {subtotales.map(([mon, val]) => (
                      <span key={mon} style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', color: val < 0 ? '#B91C1C' : NA.dark }}>
                        {val < 0 ? '-' : '+'}R$ {Math.abs(val).toFixed(2)}
                      </span>
                    ))}
                    <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: 14, color: T.tenue }} />
                  </div>
                </div>

                {/* Movimientos del día */}
                {open && movs.map((mov) => {
                  const monto      = parseFloat(mov.montoPagado) || 0;
                  const esPositivo = monto > 0;
                  const eliminando = eliminandoMovIds.has(mov.id);

                  return (
                    <div key={mov.id} style={{
                      padding: '11px 14px', borderTop: `1px solid ${T.linea}`, background: 'transparent',
                      borderLeft: `3px solid ${esPositivo ? NA.dark : '#B91C1C'}`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: T.texto, margin: 0, lineHeight: 1.45, wordBreak: 'break-word' }}>
                          {mov.nota || 'Movimiento'}
                        </p>
                        {mov.moneda && (
                          <p style={{ fontSize: 10.5, color: T.tenue, margin: '4px 0 0' }}>{labelCaja(mov.moneda)}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', color: esPositivo ? NA.dark : '#B91C1C' }}>
                          {esPositivo ? `+${monto.toFixed(2)}` : `-${Math.abs(monto).toFixed(2)}`}
                        </span>
                        <button
                          onClick={() => onDeleteMovimiento(mov)}
                          disabled={eliminando}
                          title="Eliminar este movimiento"
                          style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'transparent', color: '#fca5a5', cursor: eliminando ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`ti ${eliminando ? 'ti-loader-2' : 'ti-trash'}`} aria-hidden="true"
                            style={{ fontSize: 14, ...(eliminando ? { animation: 'kbn-spin .7s linear infinite' } : {}) }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <button onClick={onClose}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: T.superficie2, color: T.texto, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default ModalHistorial;