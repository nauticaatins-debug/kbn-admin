import React from 'react';

const Ingreso = ({ formData, handleChange, handleSubmit, InstructorField, setView }) => {
  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md mt-10">
      {/* Botón Volver Simple */}
      <button 
        onClick={() => setView('AGENDA')}
        className="mb-4 text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
      >
        ← Volver a Agenda
      </button>

      <h2 className="text-2xl font-bold mb-6 text-green-600">💰 Nueva Planilla de Ingreso</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Campo Instructor: Renderizado con estilo estándar de formulario */}
        <div className="space-y-1">
          <InstructorField />
        </div>

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

        {/* Actividad */}
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
              <label className="block text-sm font-medium text-gray-700">
                Especificar actividad
              </label>
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

        {/* Vendedor */}
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

        {/* Detalles */}
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

        {/* Horas / Tarifa / Total */}
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

        {/* Moneda / Gastos / Comisión */}
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

        {/* Pago */}
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