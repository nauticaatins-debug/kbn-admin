import React from 'react';
import { NA, sx, focusOn, focusOff, Field, TextInput, Select } from './PasivosShared';

const ModalCrear = ({ newPasivo, setNewPasivo, onSubmit, onClose, guardando }) => (
  <div style={sx.overlay} onClick={onClose}>
    <div style={sx.modal} onClick={(e) => e.stopPropagation()}>
      <h2 style={{ fontSize: 18, fontWeight: 500, color: NA.text, margin: '0 0 4px', textAlign: 'center' }}>Nueva cuenta corriente</h2>
      <p style={{ fontSize: 12, color: NA.text2, textAlign: 'center', margin: '0 0 20px' }}>Registrá una deuda, adelanto o cuenta de instructor</p>

      <form onSubmit={onSubmit}>
        {/* ── Tipo de cuenta ── */}
        <Field label="Tipo de cuenta">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ v: false, l: 'General', i: 'ti-file-text' }, { v: true, l: 'Instructor', i: 'ti-school' }].map((opt) => (
              <button key={opt.l} type="button"
                onClick={() => setNewPasivo({ ...newPasivo, esInstructor: opt.v, tipoRegistro: 'DEUDA' })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  border: `1.5px solid ${newPasivo.esInstructor === opt.v ? NA.dark : NA.border}`,
                  background: newPasivo.esInstructor === opt.v ? NA.dark : '#fff',
                  color: newPasivo.esInstructor === opt.v ? '#fff' : NA.text2,
                }}>
                <i className={`ti ${opt.i}`} style={{ fontSize: 15 }} aria-hidden="true" />
                {opt.l}
              </button>
            ))}
          </div>
        </Field>

        <Field label={newPasivo.esInstructor ? 'Nombre del instructor' : 'Nombre / referencia'}>
          <TextInput
            type="text"
            placeholder={newPasivo.esInstructor ? 'Ej: Facundo Moreno' : 'Ej: Alquiler local'}
            value={newPasivo.titulo}
            onChange={(e) => setNewPasivo({ ...newPasivo, titulo: e.target.value })}
            required
          />
        </Field>

        {/* ── Tarifa si es instructor ── */}
        {newPasivo.esInstructor && (
          <div style={{ background: NA.light, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Field label={<span style={{ color: NA.darker }}>Tarifa por hora (BRL)</span>}>
              <input
                type="number" step="0.01" placeholder="Ej: 120"
                value={newPasivo.tarifaHora}
                onChange={(e) => setNewPasivo({ ...newPasivo, tarifaHora: e.target.value })}
                required={newPasivo.esInstructor}
                style={{ ...sx.input, fontSize: 17, fontWeight: 600, color: NA.darker }}
                onFocus={focusOn} onBlur={focusOff}
              />
            </Field>
            <p style={{ fontSize: 11, color: NA.dark, margin: 0 }}>
              Cada clase registrada en Ingreso sumará automáticamente horas × tarifa a esta cuenta.
            </p>
          </div>
        )}

        {/* ── Tipo de registro si es general ── */}
        {!newPasivo.esInstructor && (
          <>
            <Field label="¿Qué es?">
              <Select value={newPasivo.tipoRegistro} onChange={(e) => setNewPasivo({ ...newPasivo, tipoRegistro: e.target.value })}>
                <option value="DEUDA">Deuda — les debemos plata (rojo)</option>
                <option value="ADELANTO">Adelanto — nos quedan debiendo (verde)</option>
              </Select>
            </Field>
            <div style={{
              background: newPasivo.tipoRegistro === 'DEUDA' ? '#FEF2F2' : NA.light,
              color: newPasivo.tipoRegistro === 'DEUDA' ? '#B91C1C' : NA.darker,
              fontSize: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 14,
            }}>
              {newPasivo.tipoRegistro === 'DEUDA'
                ? 'Solo registra la deuda. No sale plata de caja.'
                : 'Sale de caja. El saldo queda en verde (nos deben).'}
            </div>
          </>
        )}

        <Field label="Descripción / nota">
          <TextInput
            type="text" placeholder="Ej: Pago de clases enero"
            value={newPasivo.descripcion}
            onChange={(e) => setNewPasivo({ ...newPasivo, descripcion: e.target.value })}
          />
        </Field>

        {/* ── Monto inicial y moneda (solo general) ── */}
        {!newPasivo.esInstructor && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <Field label="Monto inicial">
              <TextInput
                type="number" step="0.01"
                value={newPasivo.montoInicial}
                onChange={(e) => setNewPasivo({ ...newPasivo, montoInicial: e.target.value })}
                required
              />
            </Field>
            <Field label="Moneda">
              <Select value={newPasivo.moneda} onChange={(e) => setNewPasivo({ ...newPasivo, moneda: e.target.value })}>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </Select>
            </Field>
          </div>
        )}

        {newPasivo.esInstructor && (
          <div style={{ background: '#f9fafb', color: '#6b7280', fontSize: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 14 }}>
            El saldo arranca en 0. Cada clase registrada acumulará la deuda automáticamente.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando}
            style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: guardando ? NA.mid : NA.dark, color: '#fff', fontSize: 13, fontWeight: 500, cursor: guardando ? 'default' : 'pointer' }}>
            {guardando ? 'Creando...' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default ModalCrear;