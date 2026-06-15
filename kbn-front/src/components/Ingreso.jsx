import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

const Ingreso = ({ formData, handleChange, handleSubmit: originalHandleSubmit, InstructorField, setView, axiosConfig }) => {

  const [pasivos, setPasivos] = useState([]);
  const [pasivoVinculado, setPasivoVinculado] = useState(null);
  const [deudaCalculada, setDeudaCalculada] = useState(0);

  useEffect(() => {
    if (!axiosConfig) return;
    axios.get('https://kbnadmin-production.up.railway.app/api/pasivos', axiosConfig)
      .then(res => setPasivos(res.data))
      .catch(err => console.error('Error cargando pasivos:', err));
  }, [axiosConfig]);

  // Detectar instructor vinculado cada vez que cambia el instructor o las horas
  useEffect(() => {
    if (!formData.instructor || pasivos.length === 0) {
      setPasivoVinculado(null);
      setDeudaCalculada(0);
      return;
    }
    const match = pasivos.find(p => {
      const { esInstructor } = decodeTarifa(p.descripcion);
      return esInstructor && p.titulo.toLowerCase() === formData.instructor.toLowerCase();
    });
    if (match) {
      const { tarifaHora } = decodeTarifa(match.descripcion);
      const horas = parseFloat(formData.horas) || 0;
      setPasivoVinculado(match);
      setDeudaCalculada(Math.round(tarifaHora * horas * 100) / 100);
    } else {
      setPasivoVinculado(null);
      setDeudaCalculada(0);
    }
  }, [formData.instructor, formData.horas, pasivos]);

  const HANS_PASIVO_TITULO = 'Hans Wurbs';
  const HANS_PCT = 5;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Guardar el ingreso normalmente
    await originalHandleSubmit(e);

    const actividad = formData.actividad === 'Otro' ? formData.actividadOtro : formData.actividad;
    const total = parseFloat(formData.total) || 0;

    // 2. Acumular deuda al pasivo del instructor (por horas trabajadas)
    if (pasivoVinculado && deudaCalculada > 0 && axiosConfig) {
      try {
        const { tarifaHora } = decodeTarifa(pasivoVinculado.descripcion);
        const horas = parseFloat(formData.horas) || 0;
        const detalles = formData.detalles ? ` — ${formData.detalles}` : '';
        const nota = `Pago por ${horas}h de ${actividad}${detalles} · ${horas}h × ${tarifaHora} BRL/h = ${deudaCalculada.toFixed(2)} BRL`;
        await axios.post(
          'https://kbnadmin-production.up.railway.app/api/clases/guardar',
          {
            tipoTransaccion: 'EGRESO',
            tipoMovimientoPasivo: 'NUEVA_DEUDA',
            pasivoId: pasivoVinculado.id,
            total: String(-deudaCalculada),
            fecha: formData.fecha,
            moneda: pasivoVinculado.moneda,
            formaPago: 'Efectivo',
            detalles: nota,
            actividad: 'Pago Pasivo',
            instructor: formData.instructor,
          },
          axiosConfig
        );
      } catch (err) {
        console.error('Error al acumular deuda instructor:', err);
        alert(`⚠️ El ingreso se guardó pero no se pudo acumular a ${pasivoVinculado.titulo}. Revisá en Cuentas Corrientes.`);
      }
    }

    // 3. Acumular 5% de Hans en su pasivo (sobre el total del ingreso)
    if (total > 0 && axiosConfig) {
      try {
        const resPasivos = await axios.get(
          'https://kbnadmin-production.up.railway.app/api/pasivos',
          axiosConfig
        );
        const pasivoHans = resPasivos.data.find(
          p => p.titulo.toLowerCase() === HANS_PASIVO_TITULO.toLowerCase()
        );
        if (pasivoHans) {
          const mHans = Math.round(total * HANS_PCT / 100 * 100) / 100;
          const nota = `5% de ${actividad}${formData.detalles ? ' — ' + formData.detalles : ''} = ${mHans.toFixed(2)} ${formData.moneda}`;
          await axios.post(
            'https://kbnadmin-production.up.railway.app/api/clases/guardar',
            {
              tipoTransaccion: 'EGRESO',
              tipoMovimientoPasivo: 'NUEVA_DEUDA',
              pasivoId: pasivoHans.id,
              total: String(-mHans),
              fecha: formData.fecha,
              moneda: pasivoHans.moneda,
              formaPago: 'Efectivo',
              detalles: nota,
              actividad: 'Pago Pasivo',
              instructor: 'Sistema',
            },
            axiosConfig
          );
        }
      } catch (err) {
        console.error('Error acumulando Hans:', err);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      <button
        onClick={() => setView('AGENDA')}
        className="mb-4 text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
      >
        ← Volver a Agenda
      </button>

      <h2 className="text-2xl font-bold mb-6 text-green-600">💰 Nueva Planilla de Ingreso</h2>

      <form onSubmit={handleSubmit} className="space-y-4">

        <div className="space-y-1">
          <InstructorField />
        </div>

        {/* Banner instructor vinculado */}
        {pasivoVinculado && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <p className="text-xs font-black text-indigo-700 uppercase">Cuenta corriente vinculada</p>
              <p className="text-[11px] text-indigo-500 font-bold mt-0.5">
                {pasivoVinculado.titulo} · {decodeTarifa(pasivoVinculado.descripcion).tarifaHora} BRL/h
              </p>
              {deudaCalculada > 0 ? (
                <p className="text-xs font-black text-rose-600 mt-1">
                  Se acumularán <span className="text-rose-700">{deudaCalculada.toFixed(2)} BRL</span> al guardar
                  <span className="text-indigo-400 font-bold"> ({parseFloat(formData.horas) || 0}h × {decodeTarifa(pasivoVinculado.descripcion).tarifaHora} BRL/h)</span>
                </p>
              ) : (
                <p className="text-[11px] text-amber-600 font-bold mt-1">⚠️ Ingresá las horas para calcular la deuda.</p>
              )}
            </div>
          </div>
        )}

        {/* Aviso sin cuenta corriente */}
        {!pasivoVinculado && formData.instructor && formData.instructor !== 'Secretaria' && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-[11px] text-gray-400 font-bold">
            ℹ️ <span className="text-gray-600">{formData.instructor}</span> no tiene cuenta corriente vinculada.
            Creala en <span className="text-indigo-600">Cuentas Corrientes → 🎓 Instructor</span>.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha</label>
          <input
            type="date"
            name="fecha"
            value={formData.fecha}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 border p-2 text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Actividad</label>
            <select
              name="actividad"
              value={formData.actividad}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
              required
            >
              <option value="">Seleccionar actividad</option>
              <option value="Clase de Kite">Clase de Kite</option>
              <option value="Clase de Wing">Clase de Wing</option>
              <option value="Clase de Windsurf">Clase de Windsurf</option>
              <option value="Rental">Rental</option>
              <option value="Otro">Otro...</option>
            </select>
          </div>
          {formData.actividad === 'Otro' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Especificar actividad</label>
              <input
                type="text"
                name="actividadOtro"
                value={formData.actividadOtro || ''}
                onChange={handleChange}
                placeholder="Ej: Aula teórica"
                className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Vendedor (Opcional)</label>
          <input
            type="text"
            name="vendedor"
            value={formData.vendedor || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Detalles</label>
          <textarea
            name="detalles"
            rows="2"
            value={formData.detalles || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
            placeholder="Ej: Clase a José"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 bg-green-50 p-4 rounded-md">
          <div>
            <label className="block text-sm font-medium text-gray-700">Cant. Horas</label>
            <input
              type="number"
              step="0.5"
              name="horas"
              inputMode="decimal"
              value={formData.horas}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tarifa ($/h)</label>
            <input
              type="number"
              name="tarifa"
              inputMode="decimal"
              value={formData.tarifa}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-green-800">TOTAL</label>
            <input
              type="number"
              value={formData.total}
              readOnly
              className="mt-1 block w-full rounded-md border p-2 bg-white font-bold text-green-600 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-2 bg-green-50 p-4 rounded-md">
          <div>
            <label className="block text-sm font-medium text-gray-700">Moneda</label>
            <select
              name="moneda"
              value={formData.moneda}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="BRL">Reales (BRL)</option>
              <option value="USD">Dólares (USD)</option>
              <option value="EUR">Euros (EUR)</option>
              <option value="ARS">Pesos (ARS)</option>
              <option value="CLP">Pesos Chilenos (CLP)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gastos</label>
            <input
              type="number"
              name="gastos"
              inputMode="decimal"
              value={formData.gastos}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Comisión</label>
            <input
              type="number"
              name="comision"
              inputMode="decimal"
              value={formData.comision}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Forma de Pago</label>
          <select
            name="formaPago"
            value={formData.formaPago}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
          >
            <option value="Efectivo">Efectivo</option>
            <option value="MercadoPago">MercadoPago</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
            <option value="USD">USD</option>
            <option value="Otro">Otro...</option>
          </select>
          {formData.formaPago === 'Otro' && (
            <input
              type="text"
              placeholder="Detalle forma de pago"
              name="formaPagoOtro"
              value={formData.formaPagoOtro || ''}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border p-2 border-gray-300 text-sm"
            />
          )}
        </div>

        {/* Resumen antes de guardar */}
        {pasivoVinculado && deudaCalculada > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
            <p className="text-xs font-black text-rose-700 uppercase mb-1">Resumen al guardar</p>
            <p className="text-[11px] text-rose-500 font-bold">
              ✅ Se registra el ingreso normalmente.<br />
              📋 Se suma <strong>{deudaCalculada.toFixed(2)} BRL</strong> a la cuenta de <strong>{pasivoVinculado.titulo}</strong> con nota en el historial.
            </p>
          </div>
        )}

        <button
          type="submit"
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-all uppercase tracking-widest"
        >
          Guardar Ingreso
        </button>
      </form>
    </div>
  );
};

export default Ingreso;