import React from 'react';

const Egreso = ({ formData, handleChange, handleSubmit, InstructorField, setView }) => {
  
  // Función intermedia para asegurar que el monto vaya a 'total' y no solo a 'gastos'
  const handleEgresoChange = (e) => {
    const { name, value } = e.target;
    if (name === 'montoEgreso') {
      // Actualizamos 'total' (para el backend) y 'gastos' (por si lo usas en el estado local)
      handleChange({ target: { name: 'total', value: value } });
      handleChange({ target: { name: 'gastos', value: value } });
    } else {
      handleChange(e);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md mt-10">

      <h2 className="text-2xl font-bold mb-6 text-red-600 italic uppercase tracking-tighter">💸 Registro de Egreso</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Aseguramos que el tipo sea EGRESO */}
        <input type="hidden" name="tipoTransaccion" value="EGRESO" />

        <div className="space-y-1">
          <InstructorField />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha</label>
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm focus:ring-red-500 focus:border-red-500 font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700">Monto del Egreso</label>
            <input
              type="number"
              name="total" /* CAMBIO ACÁ: antes decía "gastos" */
              inputMode="decimal"
              value={formData.total} /* CAMBIO ACÁ: antes decía formData.gastos */
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-red-600 font-bold text-sm focus:ring-red-500 focus:border-red-500"
              placeholder="Monto a descontar"
              required
            />
          </div>
        </div>

        {/* Moneda con nuevas opciones al principio */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Moneda</label>
          <select
            name="moneda"
            value={formData.moneda}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm font-bold focus:ring-red-500 focus:border-red-500"
          >
            {/* ── Nuevas monedas ── */}
            <option value="R$_STONE_JOSE">R$ Stone José</option>
            <option value="R$_STONE_IGNA">R$ Stone Igna</option>
            <option value="R$_EFECTIVO">R$ Efectivo</option>
            <option value="USD_EFECTIVO">USD Efectivo</option>
            <option value="USD_MARIANA">USD Mariana</option>
            <option value="EUR_WIZE_IGNA">€ Wize Igna</option>
            {/* ── Separador ── */}
            <option disabled>──────────────</option>
            {/* ── Monedas originales ── */}
            <option value="USD">Dólares (USD)</option>
            <option value="BRL">Reales (BRL)</option>
            <option value="EUR">Euros (EUR)</option>
            <option value="ARS">Pesos (ARS)</option>
            <option value="CLP">Pesos Chilenos (CLP)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Concepto / Detalles</label>
          <textarea
            name="detalles"
            rows="3"
            value={formData.detalles || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm focus:ring-red-500 focus:border-red-500"
            placeholder="Ej: Pago de lancha, reparación de kite, etc."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Forma de Pago</label>
          <select
            name="formaPago"
            value={formData.formaPago}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border p-2 border-gray-300 text-sm focus:ring-red-500 focus:border-red-500"
          >
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Otro">Otro...</option>
          </select>

          {formData.formaPago === 'Otro' && (
            <input
              type="text"
              placeholder="Especifique forma de pago"
              name="detalleFormaPago" // Cambiado para coincidir con el backend
              value={formData.detalleFormaPago || ''}
              onChange={handleChange}
              className="mt-2 block w-full rounded-md border p-2 border-gray-300 text-sm"
            />
          )}
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-black text-white bg-red-600 hover:bg-red-700 transition-all uppercase tracking-widest mt-6"
        >
          Registrar Egreso
        </button>
      </form>
    </div>
  );
};

export default Egreso;