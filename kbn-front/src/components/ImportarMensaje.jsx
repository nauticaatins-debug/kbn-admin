import React, { useState, useEffect } from 'react';
import api from '../axiosConfig';
import { usePresencia } from '../hooks/usePresencia';
import { CATEGORIAS_EGRESO } from './Egreso';

/* ══════════════════════════════════════════════════════════════════════════
   IMPORTAR DEL GRUPO

   Pegás el resumen que mandan por WhatsApp y salen las tarjetas listas para
   revisar. Nada toca la base hasta que confirmás.

   Formatos que entiende, todos sacados de mensajes reales:
     Thalissa 11:20-12:20 Facu          · sin código de tipo
     APKFrancesca 09:00-11:00 - Facu    · tipo pegado al nombre
     Apwf Augusto 10:00:-11:00 José     · con typo en el rango
     Rental wind Renata 10:00-11:00hs   · tipo de dos palabras
     10hs APK Hana 10:00-12:00 Hans     · hora suelta más rango
     Breno 12:30-  Igna                 · sin hora de salida
     [28/8/26, 3:22 p.m.] Jose: ...     · encabezado de WhatsApp
   ══════════════════════════════════════════════════════════════════════════ */

const C = {
  fondo:  'rgba(255,255,255,.05)',
  borde:  'rgba(255,255,255,.12)',
  texto:  'rgba(255,255,255,.92)',
  suave:  'rgba(255,255,255,.55)',
  tenue:  'rgba(255,255,255,.35)',
  clase:  '#2ECFC4',
  pago:   '#FBBF24',
  gasto:  '#FB7185',
  // El aviso de "esto ya está cargado" tiene color propio: antes usaba el
  // amarillo de Pagos y no se distinguía del color normal de esas tarjetas.
  dup:    '#C084FC',
  ok:     '#34D399',
  error:  '#F87171',
};

// ── Vocabulario ───────────────────────────────────────────────────────────
const TIPOS = {
  ASPWF:{code:'ASPWF',act:'Clase de Wing'},     ASPWD:{code:'ASPWS',act:'Clase de Windsurf'},
  ASPWS:{code:'ASPWS',act:'Clase de Windsurf'}, ASPK: {code:'ASPK', act:'Clase de Kite'},
  APWF: {code:'APWF', act:'Clase de Wing'},     APWG: {code:'APWF', act:'Clase de Wing'},
  APWD: {code:'APWS', act:'Clase de Windsurf'}, APWS: {code:'APWS', act:'Clase de Windsurf'},
  APK:  {code:'APK',  act:'Clase de Kite'},     PAK:  {code:'APK',  act:'Clase de Kite'},
};
// Códigos largos primero: si no, APK se comería mal "APKFrancesca"
const CODIGOS = Object.keys(TIPOS).sort((a, b) => b.length - a.length);
const RE_CODIGO = new RegExp('(' + CODIGOS.join('|') + ')', 'i');
const RE_RENTAL = /\b(rental|aluguel|alquil\w*)\s*(wind\w*|wing\w*|kite|foil)?/i;

const CANALES = [
  [/cr[eé]dito\s+stone\s+jos[eé]|carta\s+stone\s+jos[eé]/i, 'R$_STONE_JOSE', 'Tarjeta Crédito'],
  [/cr[eé]dito\s+stone\s+igna|carta\s+stone\s+igna/i,       'R$_STONE_IGNA', 'Tarjeta Crédito'],
  [/d[eé]bito\s+stone\s+jos[eé]/i, 'R$_STONE_JOSE', 'Tarjeta Débito'],
  [/d[eé]bito\s+stone\s+igna/i,    'R$_STONE_IGNA', 'Tarjeta Débito'],
  [/pix\s+stone\s+igna/i,          'R$_STONE_IGNA', 'Transferencia'],
  [/pix\s+stone\s+jos[eé]/i,       'R$_STONE_JOSE', 'Transferencia'],
  [/stone\s+jos[eé]/i,             'R$_STONE_JOSE', 'Transferencia'],
  [/stone\s+igna/i,                'R$_STONE_IGNA', 'Transferencia'],
  [/wi[sz]e\s+igna/i,              'EUR_WIZE_IGNA', 'Transferencia'],
  [/\befectivo\b|\bdinheiro\b|\bcash\b/i, 'R$_EFECTIVO', 'Efectivo'],
  [/\bpix\b/i,                     'R$_STONE_IGNA', 'Transferencia'],
  [/\bd[oó]lar\w*\b|\busd\b/i,     'USD_EFECTIVO',  'Efectivo'],
];

// Acepta "9hs a 10hs", "11:20-12:20", "10:00:-11:00", "12:30-"
const RE_RANGO       = /(\d{1,2})\s*[:.]?\s*(\d{2})?\s*(?:hs?|hrs?)?\s*:?\s*(?:-|–|—|\ba\b|hasta)\s*(?:(\d{1,2})\s*[:.]?\s*(\d{2})?)?/i;
const RE_HORA_SUELTA = /(?:^|\s)(\d{1,2})\s*[:.]?(\d{2})?\s*hs?\b/i;
// "09:00" suelto, sin "hs" ni rango — típico de "APK Giuseppe 09:00 Hans 2hs"
const RE_HORA_RELOJ  = /(?:^|\s)(\d{1,2})[:.](\d{2})\b/;
const RE_HORAS_DUR   = /(\d+(?:[.,]\d+)?)\s*h(?:s|rs)?\b/i;
const RE_FECHA       = /\[?(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?/;
const RE_MONTO       = /(?:R\$\s*)(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:[.,]\d{1,2})?)\b|(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:[.,]\d{1,2})?)\s*R\$/gi;

const pad = (n) => String(n).padStart(2, '0');
const num = (s) => {
  if (s == null) return null;
  let t = String(s).trim();
  if (t.includes('.') && t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) t = t.replace(',', '.');
  else if ((t.match(/\./g) || []).length === 1 && t.split('.')[1].length === 3) t = t.replace('.', '');
  const v = parseFloat(t);
  return isNaN(v) ? null : v;
};

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── Gastos ────────────────────────────────────────────────────────────────
// "PAGO A Facundo r$500 stone Igna"  → le pagamos al instructor
// "ADELANTO Hans r$300 efectivo"     → adelanto, mismo efecto en caja
// El "a" es obligatorio después de pago/pagamento: así "Pagamento Reginaldo"
// sigue siendo un gasto común y no se engancha a ninguna tarjeta.
const RE_PAGO_PASIVO = /\b(pag(?:o|amento|ar|uei)|liquidaci[oó]n)\s+a\b/i;
const RE_ADELANTO    = /\b(adelantos?|adiantamentos?|anticipos?)\b/i;
// "directo" / "direto" en una línea de pagos = el alumno le pagó al instructor
const RE_DIRECTO     = /\bdirec?to\b/i;

// El PRIMER importe con R$. En "R$422 ... En total foi R$740" vale 422.
function montoDeLinea(linea) {
  let monto = null, mm;
  RE_MONTO.lastIndex = 0;
  while ((mm = RE_MONTO.exec(linea)) !== null) {
    const v = num(mm[1] != null ? mm[1] : mm[2]);
    if (v != null && v > 0) { monto = v; break; }
  }
  if (monto == null) {
    const cand = []; const reN = /(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)/g; let n;
    while ((n = reN.exec(linea)) !== null) {
      const sig = linea.slice(n.index + n[0].length, n.index + n[0].length + 3).toLowerCase();
      if (/^\s*h/.test(sig)) continue;              // no confundir horas con plata
      const v = num(n[1]); if (v != null) cand.push(v);
    }
    if (cand.length) monto = Math.max(...cand);
  }
  return monto;
}

function canalDeLinea(linea) {
  for (const [re, c, f] of CANALES) if (re.test(linea)) return { moneda: c, formaPago: f };
  return { moneda: null, formaPago: null };
}

// Busca la tarjeta de cuenta corriente que mejor pega con el texto.
// Alcanza con el apodo: "Facu" pega con "Facundo Moreno" porque se acepta
// cualquier palabra de 4+ letras que sea el comienzo de una del título.
// Gana la coincidencia más larga, y devuelve también el texto que pegó para
// poder sacarlo del detalle.
function buscarPasivo(texto, pasivos) {
  const tokens = sinTildes(texto).split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  let mejor = null, token = null, largo = 0;
  for (const p of (pasivos || [])) {
    for (const w of sinTildes(p.titulo).split(/[^a-z0-9]+/)) {
      if (w.length < 4) continue;
      for (const t of tokens) {
        if (w.startsWith(t) && t.length > largo) { mejor = p; token = t; largo = t.length; }
      }
    }
  }
  return mejor ? { pasivo: mejor, token } : null;
}

function detectarCategoria(linea) {
  const t = sinTildes(linea);
  let mejor = null, largo = 0;
  for (const c of CATEGORIAS_EGRESO) {
    if (c === 'Otros') continue;                     // demasiado genérico
    for (const w of sinTildes(c).split(/[\s&]+/)) {
      if (w.length >= 5 && w.length > largo && t.includes(w)) { mejor = c; largo = w.length; }
    }
  }
  return mejor;
}

function parseGasto(lineaOriginal, fecha, pasivos) {
  const linea = lineaOriginal.replace(/^[\s\-–—•*·]+/, '');
  const monto = montoDeLinea(linea);
  if (monto == null || monto <= 0) return null;

  const { moneda, formaPago } = canalDeLinea(linea);
  const esAdelanto = RE_ADELANTO.test(linea);
  const hit = (esAdelanto || RE_PAGO_PASIVO.test(linea)) ? buscarPasivo(linea, pasivos) : null;
  const pasivo = hit ? hit.pasivo : null;

  let det = linea.replace(RE_MONTO, ' ')
    .replace(/\bpag(?:o|os|amento|amentos|uei|ar)\b|\badelantos?\b|\badiantamentos?\b|\banticipos?\b|\bgastos?\b|\bdespesas?\b/ig, ' ');
  for (const [re] of CANALES) det = det.replace(re, ' ');
  det = det.replace(/R\$|\breais?\b|\bcarta\b/ig, ' ')
    .replace(/\d+/g, ' ')
    .replace(/(^|\s)a(\s|$)/ig, ' ')
    .replace(/[-–—:]+/g, ' ')
    .replace(/\s{2,}/g, ' ').trim().replace(/^[\s\-–:,.]+|[\s\-–:,.]+$/g, '');

  return {
    kind: 'EGRESO',
    fecha,
    monto,
    moneda:    moneda || 'R$_EFECTIVO',
    formaPago: formaPago || 'Efectivo',
    actividad: pasivo ? 'Honorarios Instructores' : (detectarCategoria(linea) || 'Otros'),
    alumno:    det || (pasivo ? pasivo.titulo : null),
    pasivoId:  pasivo ? pasivo.id : null,
    tipoMovimientoPasivo: pasivo ? (esAdelanto ? 'ADELANTO' : 'PAGO_DEUDA') : null,
    linea: lineaOriginal.trim(),
  };
}

// Apodos que usan en el grupo. Sirven de respaldo si la lista de usuarios
// no cargó, y se cruzan con los nombres reales para asignar el id.
const APODOS = {
  igna:  ['igna', 'ignacio'],
  facu:  ['facu', 'facundo', 'facu.'],
  jose:  ['jose', 'josé', 'jose.'],
  hans:  ['hans'],
  ale:   ['ale', 'alejo'],
};

function detectarInstructor(txt, instructores) {
  const pega = (a) => new RegExp('(^|[\\s\\-–])' + a.replace(/\./g, '\\.') + '([\\s\\-–.,!]|$)', 'i').test(txt);

  // 1) por los nombres reales de los usuarios
  for (const ins of instructores) {
    for (const a of (ins.aliases || [])) if (pega(a)) return { ins, alias: a };
  }
  // 2) por los apodos del grupo, buscando a quién corresponden
  for (const [clave, lista] of Object.entries(APODOS)) {
    const hit = lista.find(pega);
    if (!hit) continue;
    const ins = instructores.find((u) =>
      u.nombre.toLowerCase().replace(/[áéíóú]/g, (m) => 'aeiou'['áéíóú'.indexOf(m)])
        .startsWith(clave.slice(0, 3)));
    return { ins: ins || null, alias: hit };
  }
  return { ins: null, alias: null };
}

function detectarTipo(linea) {
  const r = RE_RENTAL.exec(linea);
  if (r) {
    const d = (r[2] || '').toLowerCase();
    const act = d.startsWith('wind') ? 'Rental Windsurf'
              : d.startsWith('wing') ? 'Rental Wingfoil'
              : d.startsWith('kite') ? 'Rental Kite' : 'Rental';
    return { code: 'RENTAL', act, match: r[0] };
  }
  const m = RE_CODIGO.exec(linea);
  if (m) { const t = TIPOS[m[1].toUpperCase()]; return { code: t.code, act: t.act, match: m[1] }; }
  return null;
}

function parseClase(lineaOriginal, fecha, instructores) {
  // Sacar viñetas del principio: "-9hs APK…" hacía que el guion se leyera
  // como separador de rango y la hora saliera mal.
  const linea = lineaOriginal.replace(/^[\s\-–—•*·]+/, '');
  const tipo = detectarTipo(linea);

  let hIni = null, hFin = null, usoRango = false;
  // Solo es rango si hay guion o "a" entre dos horas. "09:00 Hans 2hs" no lo es.
  // Un rango real lleva guion o " a " entre las dos horas. Un espacio no
  // alcanza: en "09:00 2hs" el 2 es la duración, no la hora de salida.
  const tieneSeparador = /\d\s*[:.]?\s*\d*\s*(?:hs?|hrs?)?\s*(?:-|–|—|hasta|\sa\s)\s*\d/i.test(linea)
                      || /\d\s*[:.]?\s*\d*\s*(?:hs?)?\s*[-–—]\s*$/.test(linea.trim());
  const r = tieneSeparador ? RE_RANGO.exec(linea) : null;
  if (r && r[1] != null) {
    usoRango = true;
    hIni = `${pad(Math.min(23, +r[1]))}:${pad(r[2] ? +r[2] : 0)}`;
    if (r[3] != null) hFin = `${pad(Math.min(23, +r[3]))}:${pad(r[4] ? +r[4] : 0)}`;
  } else {
    const reloj = RE_HORA_RELOJ.exec(linea);
    if (reloj) hIni = `${pad(Math.min(23, +reloj[1]))}:${pad(+reloj[2])}`;
    else {
      const s = RE_HORA_SUELTA.exec(linea);
      if (s) hIni = `${pad(Math.min(23, +s[1]))}:${pad(s[2] ? +s[2] : 0)}`;
    }
  }
  const { ins, alias } = detectarInstructor(linea, instructores);
  if (!hIni && !tipo) return null;

  let horas = null;
  if (hIni && hFin) {
    const a = +hIni.split(':')[0] * 60 + +hIni.split(':')[1];
    const b = +hFin.split(':')[0] * 60 + +hFin.split(':')[1];
    if (b > a) horas = Math.round(((b - a) / 60) * 100) / 100;
  }
  if (horas == null) {
    let base = usoRango ? linea.replace(RE_RANGO, ' ') : linea;
    // No confundir la hora de inicio con la duración: en "9hs Hans 2hs"
    // el 9 es la hora y el 2 son las horas de clase.
    if (hIni) {
      const hh = +hIni.split(':')[0];
      base = base.replace(new RegExp('(^|\\s)' + hh + '\\s*[:.]?(00)?\\s*hs?\\b', 'i'), ' ');
    }
    const d = RE_HORAS_DUR.exec(base);
    if (d) { const v = num(d[1]); if (v != null && v > 0 && v <= 8) horas = v; }
  }
  // Con entrada y duración se deduce la salida
  if (hIni && !hFin && horas) {
    const t = +hIni.split(':')[0] * 60 + +hIni.split(':')[1] + horas * 60;
    if (t < 24 * 60) hFin = `${pad(Math.floor(t / 60))}:${pad(Math.round(t % 60))}`;
  }

  let al = linea;
  if (tipo) al = al.replace(tipo.match, ' ');
  if (usoRango) al = al.replace(RE_RANGO, ' ');
  al = al.replace(RE_HORA_RELOJ, ' ').replace(RE_HORA_SUELTA, ' ').replace(RE_HORAS_DUR, ' ');
  if (alias) al = al.replace(new RegExp('(^|[\\s\\-–])' + alias + '([\\s\\-–.,!]|$)', 'ig'), ' ');
  al = al.replace(/\d+\s*hs?\b/ig, ' ')          // "1HS", "2hs" residuales
         .replace(/\b(hs|h)\b/ig, ' ')
         .replace(/^\s*a\s+/i, ' ')                // la "a" de "9hs a 10hs"
         .replace(/\s+a\s+(?=$)/i, ' ')
         .replace(/[-–—:]+/g, ' ')
         .replace(/\s{2,}/g, ' ').trim().replace(/^[\s\-–:,.]+|[\s\-–:,.]+$/g, '');

  // Texto libre del tipo "No pago porq mañana alquila!" va a nota, no al nombre
  let nota = null;
  const mN = al.match(/\b(no pago|n[aã]o pago|falta pagar|pendiente)\b.*/i);
  if (mN) { nota = mN[0].trim(); al = al.slice(0, mN.index).trim(); }
  if (al && al.split(/\s+/).length > 4) { nota = nota ? `${al} · ${nota}` : al; al = null; }
  if (al) al = al.replace(/R\$\s*\d[\d.,]*/g, '').replace(/\s{2,}/g, ' ').trim();

  return {
    kind: 'CLASE', code: tipo ? tipo.code : null, actividad: tipo ? tipo.act : null,
    fecha, hora: hIni, horaSalida: hFin, horas, alumno: al || null, nota,
    instructorId: ins ? ins.id : null, linea: lineaOriginal.trim(),
  };
}

function parsePago(linea, fecha, pasivos) {
  let { moneda, formaPago } = canalDeLinea(linea);
  const tipo = detectarTipo(linea);
  const monto = montoDeLinea(linea);

  // El alumno le pagó en mano al instructor: la plata no entró a ninguna
  // caja nuestra, así que va como BRL genérico, y se le descuenta de lo que
  // le debemos en su tarjeta de pasivos.
  const hitD = RE_DIRECTO.test(linea) ? buscarPasivo(linea, pasivos) : null;
  const directo = hitD ? hitD.pasivo : null;
  if (directo) { moneda = 'BRL'; formaPago = 'Efectivo'; }

  let horas = null;
  const d = RE_HORAS_DUR.exec(linea);
  if (d) { const v = num(d[1]); if (v != null && v > 0 && v <= 12) horas = v; }

  let al = linea.replace(/\bpagamentos?\b|\bpagos?\b|\bse[nñ]a\b|\bdirec?to\b/ig, ' ');
  if (tipo) al = al.replace(tipo.match, ' ');
  al = al.replace(RE_MONTO, ' ').replace(RE_HORAS_DUR, ' ');
  for (const [re] of CANALES) al = al.replace(re, ' ');
  al = al.replace(/R\$|\breais?\b|\bcarta\b|\bde\b/ig, ' ')
         .replace(/\b(en total foi|menos reserva ontem|total)\b.*/i, '')
         .replace(/\d+/g, ' ').replace(/[-–—:]+/g, ' ').replace(/\s{2,}/g, ' ')
         .trim().replace(/^[\s\-–:,.]+|[\s\-–:,.]+$/g, '');

  // En "Thalissa R$500 directo a Facu" el alumno es Thalissa: saco el nombre
  // del instructor para que no quede pegado al detalle.
  if (directo) {
    al = al.replace(new RegExp('(^|\\s)' + hitD.token + '\\w*(\\s|$)', 'ig'), ' ')
           .replace(/(^|\s)a(\s|$)/ig, ' ').replace(/\s{2,}/g, ' ').trim();
  }

  return {
    kind: 'INGRESO', code: tipo ? tipo.code : null, actividad: tipo ? tipo.act : 'Ingreso',
    fecha, horas, monto, moneda, formaPago, alumno: al || null, linea: linea.trim(),
    pasivoDirectoId: directo ? directo.id : null,
  };
}

function parseMensaje(texto, anioDef, instructores, fechaFallback, asignadoDefault, pasivos) {
  const out = []; let fecha = null, modo = 'clase';

  for (const raw of texto.split('\n')) {
    const linea = raw.trim(); if (!linea) continue;

    // Encabezado de WhatsApp: "[26/9/26, 11:14 p. m.] Igna: 18/9"
    // La fecha del encabezado es cuándo se MANDÓ el mensaje, que casi nunca es
    // el día de las clases: suelen mandar el resumen de varios días atrasados.
    // Por eso lo que viene después de los dos puntos se trata como una línea
    // normal, y si es una fecha o un título de sección, manda esa.
    let l = linea;
    const wa = l.match(/^\[(\d{1,2})[/.](\d{1,2})[/.](\d{2,4}),[^\]]*\]\s*[^:]*:\s*(.*)$/);
    if (wa) {
      const y = wa[3].length === 2 ? 2000 + +wa[3] : +wa[3];
      fecha = `${y}-${pad(+wa[2])}-${pad(+wa[1])}`;
      l = wa[4].trim();
      if (!l) continue;
    }

    const f = RE_FECHA.exec(l);
    if (f && l.replace(RE_FECHA, '').replace(/[\s\-–]/g, '').length === 0) {
      const y = f[3] ? (f[3].length === 2 ? 2000 + +f[3] : +f[3]) : anioDef;
      fecha = `${y}-${pad(+f[2])}-${pad(+f[1])}`;
      continue;
    }
    if (/^\s*(aulas?|resumo|clases?)\b/i.test(l) && !RE_CODIGO.test(l)) {
      modo = 'clase';
      if (f) {
        const y = f[3] ? (f[3].length === 2 ? 2000 + +f[3] : +f[3]) : anioDef;
        fecha = `${y}-${pad(+f[2])}-${pad(+f[1])}`;
      }
      continue;
    }
    if (/^\s*pagamentos?\s*$|^\s*pagos?\s*$/i.test(l)) { modo = 'pago'; continue; }
    if (/^\s*(gastos?|despesas?|egresos?|sa[ií]das?)\s*$/i.test(l)) { modo = 'gasto'; continue; }
    if (/^\s*(amanha|amanhã|manhã)\b/i.test(l)) { modo = 'clase'; continue; }

    // "Pagamento Fulano 500" suelto arriba del todo se lee como pago. Dentro
    // de Gastos no: ahí "Pagamento X" es una salida de plata.
    // "Pago NZ Stone Jose r$1050" suelto, sin el título Pagamentos arriba.
    const inline = modo !== 'gasto' && /^\s*pag(?:os?|amentos?)\b/i.test(l);
    const item = modo === 'gasto'
      ? parseGasto(l, fecha || fechaFallback, pasivos)
      : (modo === 'pago' || inline)
        ? parsePago(l, fecha || fechaFallback, pasivos)
        : parseClase(l, fecha || fechaFallback, instructores);
    if (item) out.push(item);
  }

  return out.map((i) => ({
    ...i,
    _id: Math.random().toString(36).slice(2),
    estado: 'pendiente',
    sinFecha: !i.fecha,
    fecha: i.fecha || fechaFallback,
    ...(i.kind === 'INGRESO' ? { asignadoA: asignadoDefault } : {}),
  }));
}

// ══════════════════════════════════════════════════════════════════════════

const Campo = ({ label, ancho, children }) => (
  <div style={ancho ? { gridColumn: 'span 2' } : undefined}>
    <label style={{ fontSize: 10, color: C.tenue, display: 'block', marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

const Seccion = ({ titulo, cantidad, color, pie, children }) => (
  <section style={{ marginTop: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.texto }}>{titulo}</h3>
      <span style={{ fontSize: 12, color: C.tenue }}>{cantidad}</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{children}</div>
    {pie && <p style={{ fontSize: 11, color: C.tenue, margin: '9px 0 0', lineHeight: 1.5 }}>{pie}</p>}
  </section>
);

const Tarjeta = ({ it, color, inp, dup, onCambiar, onDescartar, onConfirmar, guardando, children }) => {
  const ok = it.estado === 'ok';
  const err = it.estado === 'error';
  return (
    <article style={{
      background: ok ? 'rgba(52,211,153,.08)' : err ? 'rgba(248,113,113,.08)' : C.fondo,
      border: `1px solid ${ok ? 'rgba(52,211,153,.3)' : err ? 'rgba(248,113,113,.35)'
             : dup ? 'rgba(192,132,252,.55)' : C.borde}`,
      borderLeft: `3px solid ${ok ? C.ok : err ? C.error : dup ? C.dup : color}`,
      borderRadius: 13, padding: 13, opacity: ok ? .7 : 1,
    }}>
      {dup && !ok && (
        <div style={{ margin: '0 0 10px', fontSize: 11.5, color: C.dup, lineHeight: 1.5,
          background: 'rgba(192,132,252,.12)', padding: '8px 10px', borderRadius: 8,
          border: '1px solid rgba(192,132,252,.3)' }}>
          <strong style={{ display: 'block', marginBottom: 2 }}>Esto ya parece estar cargado</strong>
          {dup.texto} — si es lo mismo, descartalo.
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: ok ? 0 : 11 }}>
        <strong style={{ fontSize: 15, color: C.texto, fontWeight: 600 }}>
          {it.alumno || <span style={{ color: C.tenue, fontWeight: 400 }}>sin nombre</span>}
        </strong>
        <span style={{ fontSize: 11, color: C.tenue, flex: 1, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.linea}</span>
        {ok && <span style={{ fontSize: 12, color: C.ok }}>guardado</span>}
        {err && <span style={{ fontSize: 12, color: C.error }}>no se pudo guardar</span>}
      </div>

      {it.nota && !ok && (
        <p style={{ margin: '0 0 9px', fontSize: 11, color: C.pago,
          background: 'rgba(251,191,36,.1)', padding: '6px 9px', borderRadius: 7 }}>{it.nota}</p>
      )}

      {!ok && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 11 }}>
            <Campo label={it.sinFecha ? 'Fecha — poner a mano' : 'Fecha'} ancho>
              <input type="date" value={it.fecha || ''}
                style={{ ...inp, borderColor: it.sinFecha ? 'rgba(251,191,36,.5)' : C.borde }}
                onChange={(e) => onCambiar(it._id, 'fecha', e.target.value)} />
            </Campo>
            <Campo label={it.kind === 'CLASE' ? 'Alumno' : 'Detalle'} ancho>
              <input type="text" value={it.alumno || ''} style={inp}
                onChange={(e) => onCambiar(it._id, 'alumno', e.target.value)} />
            </Campo>
            {children}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onConfirmar(it)} disabled={guardando}
              style={{ background: '#047857', color: '#fff', border: 'none', borderRadius: 9,
                padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {err ? 'Reintentar' : 'Confirmar'}
            </button>
            <button onClick={() => onDescartar(it._id)}
              style={{ background: 'transparent', color: C.suave, border: `1px solid ${C.borde}`,
                borderRadius: 9, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}>
              Descartar
            </button>
          </div>
        </>
      )}
    </article>
  );
};

export default function ImportarMensaje({ onClose, onImportado }) {
  const [texto, setTexto] = useState('');
  const [items, setItems] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pasivos, setPasivos] = useState([]);
  // Clases ya existentes + las que se van creando en esta misma importación.
  // Sirve para enganchar cada pago a las clases que cubre.
  const [agendaPool, setAgendaPool] = useState([]);
  // Ingresos y egresos ya registrados, para avisar si un pago o gasto se repite
  const [movPool, setMovPool] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [verMonitor, setVerMonitor] = useState(true);
  const { asignadoAuto, opcionActual } = usePresencia();

  const hoy = new Date().toISOString().slice(0, 10);
  const anio = new Date().getFullYear();
  // Igual que en Ingreso: arranca con quien está presente hoy
  const asignadoDefault = asignadoAuto === 'AUSENTES' ? 'ALE' : asignadoAuto;

  useEffect(() => {
    // /usuario es el listado que ya usa el Monitor. El de admin no existe.
    api.get('/usuario')
      .then((r) => setUsuarios((r.data || [])
        // Todos los usuarios: cualquiera puede quedar a cargo de una clase.
        // Solo se saca la cuenta de sistema.
        .filter((u) => `${u.nombre || ''}`.trim().toLowerCase() !== 'admin')
        .map((u) => {
        const nombre = `${u.nombre || ''} ${u.apellido || ''}`.replace(/\s+/g, ' ').trim();
        const pila   = (u.nombre || '').trim();
        // Apodos: el nombre entero y los primeros 4 y 3 caracteres, para que
        // "Facu"/"Facu." peguen con Facundo e "Igna" con Ignacio.
        const aliases = [...new Set([
          pila, pila.slice(0, 4), pila.slice(0, 3),
        ].filter((x) => x && x.length >= 3))]
          .sort((a, b) => b.length - a.length);   // el más largo primero
        return { id: u.id, nombre, aliases };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))))
      .catch((e) => { console.error('[Importar] no se pudo traer usuarios:', e); setUsuarios([]); });

    // Tarjetas de cuenta corriente: para enganchar pagos/adelantos y los
    // cobros que el alumno le hace directo al instructor.
    api.get('/api/pasivos')
      .then((r) => setPasivos((r.data || [])
        .filter((p) => p && p.titulo)
        .map((p) => ({ id: p.id, titulo: p.titulo }))
        .sort((a, b) => a.titulo.localeCompare(b.titulo))))
      .catch((e) => { console.error('[Importar] no se pudo traer pasivos:', e); setPasivos([]); });

    cargarAgenda();
  }, []);

  const cargarAgenda = () =>
    api.get('/api/agenda/listar')
      .then((r) => setAgendaPool((r.data || []).map((a) => ({
        id: a.id,
        alumno: a.alumno,
        fecha: String(a.fecha || '').slice(0, 10),
        hora: a.hora ? String(a.hora).slice(0, 5) : null,
        instructor: a.nombreInstructor || null,
        cobrada: !!a.cobrada,
        estado: a.estado,
      }))))
      .catch((e) => { console.error('[Importar] no se pudo traer agenda:', e); setAgendaPool([]); })
      .then(() => api.get('/api/clases/listar'))
      .then((r) => setMovPool((r?.data || []).map((c) => ({
        tipo: c.tipoTransaccion,
        fecha: String(c.fecha || '').slice(0, 10),
        total: c.total,
        detalles: c.detalles,
        actividad: c.actividad,
      }))))
      .catch((e) => { console.error('[Importar] no se pudo traer movimientos:', e); setMovPool([]); });

  // Clases candidatas a quedar cubiertas por un pago: mismo alumno, sin cobro
  // todavía, y dentro de una ventana razonable alrededor de la fecha del pago
  // (suelen pagar el paquete entero al final, días después de la primera clase).
  const clasesDelPago = (it) => {
    const n = sinTildes(it.alumno || '');
    if (n.length < 3 || !it.fecha) return [];
    const dia = (s) => Math.floor(new Date(`${s}T00:00:00`).getTime() / 86400000);
    const dPago = dia(it.fecha);
    return agendaPool.filter((a) => {
      if (a.cobrada || a.estado === 'RECHAZADA' || !a.alumno || !a.fecha) return false;
      const an = sinTildes(a.alumno);
      if (!(an.includes(n) || n.includes(an))) return false;
      const d = dia(a.fecha) - dPago;
      return d >= -60 && d <= 15;
    });
  };

  // Las que el usuario dejó marcadas. Si todavía no tocó nada, van todas.
  const clasesElegidas = (it) => {
    const cand = clasesDelPago(it);
    if (!Array.isArray(it.agendaIds)) return cand;
    return cand.filter((a) => it.agendaIds.includes(a.id));
  };

  const toggleClase = (it, id) => {
    const actuales = clasesElegidas(it).map((a) => a.id);
    const nuevas = actuales.includes(id)
      ? actuales.filter((x) => x !== id)
      : [...actuales, id];
    cambiar(it._id, 'agendaIds', nuevas);
  };

  const esPasada = (f) => !!f && f <= hoy;

  // ── Verificación contra el monitor ────────────────────────────────────────
  // Suben de a poco, así que la misma clase puede venir en dos mensajes. Antes
  // de confirmar nada, cada tarjeta se compara con lo que ya está cargado ese
  // día: mismo alumno = repetida; misma hora y mismo instructor sin alumno
  // reconocido = sospechosa.
  const duplicadoDe = (it) => {
    if (!it.fecha) return null;
    const n = sinTildes(it.alumno || '');
    const parecido = (otro) => {
      const o = sinTildes(otro || '');
      return n.length >= 3 && o.length >= 3 && (o.includes(n) || n.includes(o));
    };

    if (it.kind === 'CLASE') {
      const delDia = agendaPool.filter((a) => a.fecha === it.fecha && a.estado !== 'RECHAZADA');
      const porNombre = delDia.find((a) => parecido(a.alumno));
      const m = porNombre || (it.hora ? delDia.find((a) => a.hora === it.hora) : null);
      if (!m) return null;
      return { texto: `${m.alumno || 'Sin nombre'}${m.hora ? ` a las ${m.hora}` : ''}`
        + `${m.instructor ? ` con ${m.instructor}` : ''} (${String(m.estado || '').toLowerCase()})` };
    }

    // Pagos y gastos: mismo día, monto casi igual y detalle parecido. El monto
    // guardado es el NETO, así que con tarjeta hay que comparar contra el neto.
    const tipo = it.kind === 'INGRESO' ? 'INGRESO' : 'EGRESO';
    const bruto = Number(it.monto) || 0;
    const neto = it.formaPago === 'Tarjeta Crédito'
      ? Math.round(bruto * 0.95 * 100) / 100 : bruto;
    if (!neto) return null;

    const m = movPool.find((c) => {
      if (c.tipo !== tipo || c.fecha !== it.fecha) return false;
      const v = Number(c.total) || 0;
      if (Math.abs(v - neto) > 0.5 && Math.abs(v - bruto) > 0.5) return false;
      // Mismo día y mismo monto ya es sospechoso; si además el detalle pega, seguro.
      return n.length < 3 || parecido(c.detalles) || parecido(c.actividad);
    });
    if (!m) return null;
    return { texto: `${tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'} de R$ ${(Number(m.total) || 0).toFixed(2)}`
      + `${m.detalles ? ` — ${m.detalles}` : ''} el ${it.fecha.slice(8, 10)}/${it.fecha.slice(5, 7)}` };
  };

  // Los días que toca este mensaje, para mostrar al lado lo que ya hay cargado
  const diasDelMensaje = [...new Set(items.map((i) => i.fecha).filter(Boolean))].sort();
  const yaCargado = diasDelMensaje.map((d) => ({
    fecha: d,
    clases: agendaPool
      .filter((a) => a.fecha === d && a.estado !== 'RECHAZADA')
      .sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || ''))),
  }));
  const repetidas = items.filter((i) => i.estado === 'pendiente' && duplicadoDe(i)).length;

  const analizar = () => {
    cargarAgenda();   // por si cargaron clases desde otra pantalla mientras tanto
    const r = parseMensaje(texto, anio, usuarios, hoy, asignadoDefault, pasivos);
    if (!r.length) {
      alert('No se reconoció ninguna clase, pago ni gasto. Revisá que las líneas tengan horario o monto.');
      return;
    }
    setItems(r);
  };

  const cambiar = (id, campo, valor) =>
    setItems((p) => p.map((it) => (it._id === id ? { ...it, [campo]: valor } : it)));
  const descartar = (id) => setItems((p) => p.filter((it) => it._id !== id));

  const confirmarUno = async (it) => {
    setGuardando(true);
    try {
      if (it.kind === 'CLASE') {
        const res = await api.post('/api/agenda/crear', {
          alumno: it.alumno || 'Sin nombre',
          fecha: it.fecha,
          hora: it.hora ? `${it.hora}:00` : null,
          horaSalida: it.horaSalida ? `${it.horaSalida}:00` : null,
          horas: it.horas,
          tipoAula: it.code || 'OTRO',
          instructorId: it.instructorId || null,
          lugar: it.nota || null,
          tarifa: 120,
          estado: 'PENDIENTE',
        });

        const creada = res.data || {};
        if (creada.id) {
          // Queda disponible para que un pago de este mismo mensaje la enganche
          setAgendaPool((p) => [...p, {
            id: creada.id, alumno: it.alumno || '', fecha: it.fecha,
            hora: it.hora || null,
            instructor: creada.nombreInstructor || null,
            cobrada: false, estado: 'PENDIENTE',
          }]);

          // Una clase que ya pasó y tiene instructor no tiene nada que esperar:
          // se confirma y se liquida sola. Solo las futuras quedan pendientes,
          // para que nadie cobre algo que todavía no dio.
          if (esPasada(it.fecha) && it.instructorId) {
            await api.put(`/api/agenda/${creada.id}/estado`, 'CONFIRMADA',
              { headers: { 'Content-Type': 'text/plain' } });
            try {
              await api.post(`/api/agenda/${creada.id}/liquidar`);
            } catch (e) {
              // Sin tarjeta de pasivo la liquidación falla; la clase igual
              // queda confirmada, que es lo que importa acá.
              console.warn('[Importar] no se pudo liquidar:', e.response?.data || e.message);
            }
          }
        }
      } else if (it.kind === 'EGRESO') {
        // Sale plata de una caja. Si además está enganchado a una tarjeta de
        // cuenta corriente, el mismo endpoint registra el movimiento del
        // pasivo (ver FinanzasService): un solo POST hace las dos cosas.
        await api.post('/api/clases/guardar', {
          tipoTransaccion: 'EGRESO',
          fecha: it.fecha,
          actividad: it.actividad || 'Otros',
          instructor: opcionActual?.label || 'Importado del grupo',
          total: String(Number(it.monto) || 0),
          moneda: it.moneda || 'R$_EFECTIVO',
          formaPago: it.formaPago || 'Efectivo',
          detalles: it.alumno || '',
          pasivoId: it.pasivoId ? Number(it.pasivoId) : null,
          tipoMovimientoPasivo: it.pasivoId ? (it.tipoMovimientoPasivo || 'PAGO_DEUDA') : null,
        });
      } else {
        // Con tarjeta de crédito el banco se queda el 5%: se guarda el NETO,
        // igual que en la pantalla de Ingreso. Si no, entra el monto entero.
        const bruto    = Number(it.monto) || 0;
        const descuento = it.formaPago === 'Tarjeta Crédito' ? bruto * 0.05 : 0;
        const neto     = Math.round((bruto - descuento) * 100) / 100;

        // Clases que cubre este pago. Sin esto quedaban para siempre en
        // "clases sin registro de cobro": el Monitor solo las da por cobradas
        // si hay vínculo explícito o si el ingreso cae el mismo día, y casi
        // nunca cae el mismo día porque pagan el paquete al final.
        const cubre = clasesElegidas(it).map((a) => a.id);

        await api.post('/api/clases/guardar', {
          tipoTransaccion: 'INGRESO',
          fecha: it.fecha,
          actividad: it.actividad || 'Ingreso',
          // instructor es obligatorio en la base: sin esto el guardado da 500
          instructor: opcionActual?.label || 'Importado del grupo',
          total: String(neto),
          moneda: it.moneda || 'BRL',
          formaPago: it.formaPago || 'Efectivo',
          detalles: it.alumno || '',
          asignadoA: it.asignadoA || null,
          comision: String(Math.round(descuento * 100) / 100),
          agendaIds: cubre.length ? cubre.join(',') : null,
        });

        // El backend ya las marcó cobradas; que no las vuelva a ofrecer
        if (cubre.length) {
          setAgendaPool((p) => p.map((a) =>
            cubre.includes(a.id) ? { ...a, cobrada: true } : a));
        }

        // Cobro directo: el alumno le pagó en mano al instructor. La plata
        // entró (el ingreso de arriba) pero nunca llegó a ninguna caja
        // nuestra: se la quedó él a cuenta de lo que le debemos. Por eso va
        // también el egreso espejo, que deja la caja en cero y, al llevar
        // pasivoId, descuenta el monto de su tarjeta en el mismo movimiento.
        //
        // Antes esto se hacía con /acumular, que toca la tarjeta pero NO la
        // caja: el saldo del instructor quedaba bien y la caja se inflaba
        // con plata que nunca estuvo.
        if (it.pasivoDirectoId) {
          await api.post('/api/clases/guardar', {
            tipoTransaccion: 'EGRESO',
            tipoMovimientoPasivo: 'PAGO_DEUDA',
            pasivoId: Number(it.pasivoDirectoId),
            fecha: it.fecha,
            actividad: 'Honorarios Instructores',
            instructor: opcionActual?.label || 'Importado del grupo',
            total: String(neto),
            moneda: 'BRL',
            formaPago: 'Efectivo',
            detalles: `Cobró directo del alumno${it.alumno ? ` — ${it.alumno}` : ''}`,
          });
        }
      }
      setItems((p) => p.map((x) => (x._id === it._id ? { ...x, estado: 'ok' } : x)));
      if (onImportado) onImportado();
    } catch (e) {
      console.error('[Importar] no se pudo guardar:', e);
      setItems((p) => p.map((x) => (x._id === it._id ? { ...x, estado: 'error' } : x)));
    } finally { setGuardando(false); }
  };

  const confirmarTodos = async () => {
    // Las clases primero: así cuando toca el pago las clases ya existen y se
    // pueden enganchar. Si fuera al revés, el pago no tendría qué cubrir.
    const orden = { CLASE: 0, INGRESO: 1, EGRESO: 2 };
    const cola = items.filter((x) => x.estado === 'pendiente')
      .sort((a, b) => orden[a.kind] - orden[b.kind]);
    for (const it of cola) {
      // eslint-disable-next-line no-await-in-loop
      await confirmarUno(it);
    }
  };

  const clases = items.filter((i) => i.kind === 'CLASE');
  const pagos  = items.filter((i) => i.kind === 'INGRESO');
  const gastos = items.filter((i) => i.kind === 'EGRESO');
  const pend   = items.filter((i) => i.estado === 'pendiente').length;
  const listos = items.filter((i) => i.estado === 'ok').length;

  const inp = {
    width: '100%', padding: '9px 11px', borderRadius: 9, fontSize: 14,
    border: `1px solid ${C.borde}`, background: 'rgba(255,255,255,.06)',
    color: C.texto, fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '16px 16px 60px', color: C.texto, margin: '0 auto',
      maxWidth: verMonitor && items.length > 0 ? 1240 : 900 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        {onClose && (
          <button onClick={onClose} aria-label="Volver"
            style={{ background: C.fondo, border: `1px solid ${C.borde}`, borderRadius: 11,
              width: 36, height: 36, cursor: 'pointer', color: C.texto, fontSize: 17 }}>←</button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600, color: C.texto }}>Importar del grupo</h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: C.suave }}>
            Pegá el mensaje de WhatsApp y revisá antes de confirmar
          </p>
        </div>
        {opcionActual && (
          <span style={{ fontSize: 11, padding: '5px 11px', borderRadius: 99, whiteSpace: 'nowrap',
            background: 'rgba(255,255,255,.08)', color: C.suave }}>
            {opcionActual.label}
          </span>
        )}
      </div>

      <textarea
        value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} spellCheck={false}
        placeholder={'27/08\n\nAulas\nAPK Giuseppe 09:00-11:00 - Hans\nRental wind Renata 10:00-11:00hs\n\nPagamentos\nGiuseppe 8h Apk 2.800 R$ stone Igna\nThalissa R$500 directo a Facu\n\nGastos\nPagamento Reginaldo R$500 stone Igna\nPAGO A Facundo Moreno R$500 stone Igna'}
        style={{ width: '100%', padding: 14, borderRadius: 14, fontSize: 14, lineHeight: 1.6,
          border: `1px solid ${C.borde}`, background: 'rgba(0,0,0,.25)', color: C.texto,
          fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button onClick={analizar} disabled={!texto.trim()}
          style={{ background: texto.trim() ? C.clase : 'rgba(255,255,255,.1)',
            color: texto.trim() ? '#06302E' : C.tenue, border: 'none', borderRadius: 11,
            padding: '11px 20px', fontSize: 14, fontWeight: 600,
            cursor: texto.trim() ? 'pointer' : 'default' }}>
          Analizar mensaje
        </button>
        {items.length > 0 && (
          <>
            <button onClick={confirmarTodos} disabled={guardando || !pend}
              style={{ background: pend ? '#047857' : 'rgba(255,255,255,.08)',
                color: pend ? '#fff' : C.tenue, border: 'none', borderRadius: 11,
                padding: '11px 20px', fontSize: 14, fontWeight: 600,
                cursor: pend ? 'pointer' : 'default' }}>
              {guardando ? 'Guardando…' : `Confirmar ${pend}`}
            </button>
            <button onClick={() => { setItems([]); setTexto(''); }}
              style={{ background: 'transparent', color: C.suave, border: `1px solid ${C.borde}`,
                borderRadius: 11, padding: '11px 20px', fontSize: 14, cursor: 'pointer' }}>
              Limpiar
            </button>
            <button onClick={() => { setVerMonitor((v) => !v); if (!verMonitor) cargarAgenda(); }}
              style={{ background: verMonitor ? 'rgba(46,207,196,.14)' : 'transparent',
                color: verMonitor ? C.clase : C.suave,
                border: `1px solid ${verMonitor ? 'rgba(46,207,196,.4)' : C.borde}`,
                borderRadius: 11, padding: '11px 20px', fontSize: 14, cursor: 'pointer' }}>
              Verificar con el monitor
            </button>
          </>
        )}
      </div>

      {listos > 0 && (
        <p style={{ fontSize: 12, color: C.ok, margin: '12px 0 0' }}>
          {listos} {listos === 1 ? 'guardado' : 'guardados'}{pend > 0 && ` · quedan ${pend}`}
        </p>
      )}

      {repetidas > 0 && (
        <p style={{ fontSize: 12.5, color: C.dup, margin: '12px 0 0', lineHeight: 1.5,
          background: 'rgba(192,132,252,.12)', border: '1px solid rgba(192,132,252,.3)',
          padding: '10px 12px', borderRadius: 10 }}>
          Ojo: {repetidas} {repetidas === 1 ? 'tarjeta ya parece' : 'tarjetas ya parecen'} estar
          cargada{repetidas === 1 ? '' : 's'}. {repetidas === 1 ? 'Está marcada' : 'Están marcadas'} en
          violeta, con el borde del mismo color. El resto, confirmalas tranquilo.
        </p>
      )}

      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 520px', minWidth: 0 }}>

      {clases.length > 0 && (
        <Seccion titulo="Clases" cantidad={clases.length} color={C.clase}
          pie="Se crean en el Monitor como pendientes, listas para liquidar al instructor.">
          {clases.map((it) => (
            <Tarjeta key={it._id} it={it} color={C.clase} inp={inp} dup={duplicadoDe(it)}
              onCambiar={cambiar} onDescartar={descartar} onConfirmar={confirmarUno} guardando={guardando}>
              <Campo label="Hora">
                <input type="time" value={it.hora || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'hora', e.target.value)} />
              </Campo>
              <Campo label="Salida">
                <input type="time" value={it.horaSalida || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'horaSalida', e.target.value)} />
              </Campo>
              <Campo label="Horas">
                <input type="number" step="0.5" value={it.horas ?? ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'horas', e.target.value === '' ? null : parseFloat(e.target.value))} />
              </Campo>
              <Campo label="Tipo">
                <select value={it.code || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'code', e.target.value)}>
                  <option value="" style={{ color: '#111' }}>— elegir —</option>
                  {['APK','ASPK','APWF','ASPWF','APWS','ASPWS','RENTAL','OTRO'].map((c) =>
                    <option key={c} value={c} style={{ color: '#111' }}>{c}</option>)}
                </select>
              </Campo>
              <Campo label="Instructor" ancho>
                <select value={it.instructorId || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'instructorId', e.target.value ? Number(e.target.value) : null)}>
                  <option value="" style={{ color: '#111' }}>— sin asignar —</option>
                  {usuarios.map((u) =>
                    <option key={u.id} value={u.id} style={{ color: '#111' }}>{u.nombre}</option>)}
                </select>
              </Campo>
            </Tarjeta>
          ))}
        </Seccion>
      )}

      {pagos.length > 0 && (
        <Seccion titulo="Pagos" cantidad={pagos.length} color={C.pago}
          pie="Al confirmar, la asignación reparte en las cuentas de Igna, José y Hans.">
          {pagos.map((it) => (
            <Tarjeta key={it._id} it={it} color={C.pago} inp={inp} dup={duplicadoDe(it)}
              onCambiar={cambiar} onDescartar={descartar} onConfirmar={confirmarUno} guardando={guardando}>
              <Campo label="Monto">
                <input type="number" step="0.01" value={it.monto ?? ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'monto', e.target.value === '' ? null : parseFloat(e.target.value))} />
              </Campo>
              <Campo label="Canal de cobro">
                <select value={it.moneda || 'BRL'} style={inp}
                  onChange={(e) => cambiar(it._id, 'moneda', e.target.value)}>
                  {[['BRL','BRL genérico'], ['R$_STONE_JOSE','R$ Stone José'],
                    ['R$_STONE_IGNA','R$ Stone Igna'], ['R$_EFECTIVO','R$ Efectivo'],
                    ['EUR_WIZE_IGNA','€ Wize Igna'], ['USD_EFECTIVO','USD Efectivo']]
                    .map(([v, t]) => <option key={v} value={v} style={{ color: '#111' }}>{t}</option>)}
                </select>
              </Campo>
              <Campo label="Forma de pago">
                <select value={it.formaPago || 'Efectivo'} style={inp}
                  onChange={(e) => cambiar(it._id, 'formaPago', e.target.value)}>
                  {['Efectivo', 'Transferencia', 'MercadoPago', 'Tarjeta Crédito', 'Tarjeta Débito']
                    .map((f) => <option key={f} value={f} style={{ color: '#111' }}>{f}</option>)}
                </select>
              </Campo>
              <Campo label="Asignado a">
                <select value={it.asignadoA || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'asignadoA', e.target.value || null)}>
                  <option value=""      style={{ color: '#111' }}>— decidir después —</option>
                  <option value="IGNA"  style={{ color: '#111' }}>Igna · 16 / 8 / 5</option>
                  <option value="JOSE"  style={{ color: '#111' }}>José · 8 / 16 / 5</option>
                  <option value="AMBOS" style={{ color: '#111' }}>Ambos · 12,5 / 12,5 / 5</option>
                  <option value="ALE"   style={{ color: '#111' }}>Ausentes · 10 / 10 / 5</option>
                </select>
              </Campo>
              <Campo label="Lo cobró en mano" ancho>
                <select value={it.pasivoDirectoId || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'pasivoDirectoId', e.target.value ? Number(e.target.value) : null)}>
                  <option value="" style={{ color: '#111' }}>— entró a la caja —</option>
                  {pasivos.map((p) =>
                    <option key={p.id} value={p.id} style={{ color: '#111' }}>{p.titulo}</option>)}
                </select>
              </Campo>
              {it.pasivoDirectoId && (
                <div style={{ gridColumn: 'span 4', fontSize: 11, color: C.suave,
                  background: 'rgba(255,255,255,.06)', padding: '7px 10px', borderRadius: 7 }}>
                  Van tres movimientos: ingreso de{' '}
                  <strong>R$ {(Number(it.monto) || 0).toFixed(2)}</strong> en BRL genérico, el egreso
                  espejo por el mismo monto —la plata nunca entró a la caja— y el descuento en su
                  tarjeta. La caja queda igual que antes.
                </div>
              )}
              {(() => {
                const cand = clasesDelPago(it);
                if (!cand.length) return (
                  <div style={{ gridColumn: 'span 4', fontSize: 11, color: C.pago,
                    background: 'rgba(251,191,36,.1)', padding: '7px 10px', borderRadius: 7 }}>
                    No encontré clases sin cobrar de {it.alumno || 'este alumno'}. El ingreso se
                    guarda igual, pero las clases van a seguir figurando como no cobradas.
                  </div>
                );
                const elegidas = clasesElegidas(it).map((a) => a.id);
                return (
                  <div style={{ gridColumn: 'span 4' }}>
                    <label style={{ fontSize: 10, color: C.tenue, display: 'block', marginBottom: 5 }}>
                      Clases que cubre — {elegidas.length} de {cand.length}
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {cand.map((a) => {
                        const on = elegidas.includes(a.id);
                        return (
                          <button key={a.id} type="button" onClick={() => toggleClase(it, a.id)}
                            style={{ fontSize: 11, padding: '5px 10px', borderRadius: 99, cursor: 'pointer',
                              border: `1px solid ${on ? C.ok : C.borde}`,
                              background: on ? 'rgba(52,211,153,.14)' : 'transparent',
                              color: on ? C.ok : C.suave }}>
                            {on ? '✓ ' : ''}{a.fecha.slice(8, 10)}/{a.fecha.slice(5, 7)} {a.alumno}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {it.formaPago === 'Tarjeta Crédito' && it.monto > 0 && (
                <div style={{ gridColumn: 'span 4', fontSize: 11, color: C.pago,
                  background: 'rgba(251,191,36,.1)', padding: '7px 10px', borderRadius: 7 }}>
                  Tarjeta de crédito: se descuenta 5% del banco.{' '}
                  {Number(it.monto).toFixed(2)} − {(it.monto * 0.05).toFixed(2)} ={' '}
                  <strong>{(it.monto * 0.95).toFixed(2)}</strong> a caja
                </div>
              )}
            </Tarjeta>
          ))}
        </Seccion>
      )}

      {gastos.length > 0 && (
        <Seccion titulo="Gastos" cantidad={gastos.length} color={C.gasto}
          pie="Sale plata de la caja elegida. Si le asignás una cuenta corriente, además queda el movimiento en esa tarjeta.">
          {gastos.map((it) => (
            <Tarjeta key={it._id} it={it} color={C.gasto} inp={inp} dup={duplicadoDe(it)}
              onCambiar={cambiar} onDescartar={descartar} onConfirmar={confirmarUno} guardando={guardando}>
              <Campo label="Monto">
                <input type="number" step="0.01" value={it.monto ?? ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'monto', e.target.value === '' ? null : parseFloat(e.target.value))} />
              </Campo>
              <Campo label="Sale de">
                <select value={it.moneda || 'R$_EFECTIVO'} style={inp}
                  onChange={(e) => cambiar(it._id, 'moneda', e.target.value)}>
                  {[['BRL','BRL genérico'], ['R$_STONE_JOSE','R$ Stone José'],
                    ['R$_STONE_IGNA','R$ Stone Igna'], ['R$_EFECTIVO','R$ Efectivo'],
                    ['EUR_WIZE_IGNA','€ Wize Igna'], ['USD_EFECTIVO','USD Efectivo']]
                    .map(([v, t]) => <option key={v} value={v} style={{ color: '#111' }}>{t}</option>)}
                </select>
              </Campo>
              <Campo label="Categoría" ancho>
                <select value={it.actividad || 'Otros'} style={inp}
                  onChange={(e) => cambiar(it._id, 'actividad', e.target.value)}>
                  {CATEGORIAS_EGRESO.map((c) =>
                    <option key={c} value={c} style={{ color: '#111' }}>{c}</option>)}
                </select>
              </Campo>
              <Campo label="Cuenta corriente" ancho>
                <select value={it.pasivoId || ''} style={inp}
                  onChange={(e) => cambiar(it._id, 'pasivoId', e.target.value ? Number(e.target.value) : null)}>
                  <option value="" style={{ color: '#111' }}>— ninguna, gasto suelto —</option>
                  {pasivos.map((p) =>
                    <option key={p.id} value={p.id} style={{ color: '#111' }}>{p.titulo}</option>)}
                </select>
              </Campo>
              {it.pasivoId && (
                <Campo label="Tipo de movimiento" ancho>
                  <select value={it.tipoMovimientoPasivo || 'PAGO_DEUDA'} style={inp}
                    onChange={(e) => cambiar(it._id, 'tipoMovimientoPasivo', e.target.value)}>
                    <option value="PAGO_DEUDA" style={{ color: '#111' }}>Pago de deuda</option>
                    <option value="ADELANTO"   style={{ color: '#111' }}>Adelanto</option>
                  </select>
                </Campo>
              )}
            </Tarjeta>
          ))}
        </Seccion>
      )}

        </div>

        {verMonitor && items.length > 0 && (
          <aside style={{ flex: '0 1 320px', minWidth: 260, position: 'sticky', top: 12,
            marginTop: 24, background: 'rgba(0,0,0,.22)', border: `1px solid ${C.borde}`,
            borderRadius: 14, padding: 14, maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 600, color: C.texto }}>
              Ya cargado en el monitor
            </h3>
            <p style={{ margin: '0 0 12px', fontSize: 11, color: C.tenue, lineHeight: 1.5 }}>
              Los días que toca este mensaje, como están ahora en la base.
            </p>

            {yaCargado.every((d) => !d.clases.length) && (
              <p style={{ fontSize: 12, color: C.tenue, margin: 0 }}>
                No hay nada cargado en esos días todavía.
              </p>
            )}

            {yaCargado.filter((d) => d.clases.length).map((d) => (
              <div key={d.fecha} style={{ marginBottom: 14 }}>
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: C.clase }}>
                  {d.fecha.slice(8, 10)}/{d.fecha.slice(5, 7)}
                  <span style={{ color: C.tenue, fontWeight: 400 }}> · {d.clases.length}</span>
                </p>
                {d.clases.map((a) => (
                  <div key={a.id} style={{ display: 'flex', gap: 7, fontSize: 11.5,
                    padding: '5px 0', borderBottom: `1px solid ${C.borde}`, color: C.suave }}>
                    <span style={{ color: C.tenue, minWidth: 36 }}>{a.hora || '--:--'}</span>
                    <span style={{ flex: 1, color: C.texto, minWidth: 0, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.alumno || 'sin nombre'}</span>
                    <span style={{ color: a.cobrada ? C.ok : C.tenue }}>{a.cobrada ? 'cobrada' : '—'}</span>
                  </div>
                ))}
              </div>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}