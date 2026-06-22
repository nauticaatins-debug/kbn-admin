import React from 'react';
import { NA, sx, focusOn, focusOff, Field, TextInput } from './PasivosShared';

const ModalEditar = ({ editPasivo, setEditPasivo, editDecoded, setEditDecoded, onSubmit, onClose, guardando }) => (
  <div style={sx.overlay} onClick={onClose}>
    <div style={{ ...sx.modal, borderTop: '4px solid #92400E' }} onClick={(e) => e.stopPropagation()}>
      <h2 style={{ fontSize: 17, fontWeight: 500, color: '#92400E', margin: '0 0 20px', textAlign: 'center' }}>Editar cuenta</h2>

      <form onSubmit={onSubmit}>
        {/* ── Tipo ── */}
        <Field label="Tipo de cuenta">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ v: false, l: 'General', i: 'ti-file-text' }, { v: true, l: 'Instructor', i: 'ti-school' }].map((opt) => (
              <button key={opt.l} type="button"
                onClick={() => setEditDecoded({ ...editDecoded, esInstructor: opt.v })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  border: `1.5px solid ${editDecoded.esInstructor === opt.v ? '#92400E' : NA.border}`,
                  background: editDecoded.esInstructor === opt.v ? '#92400E' : '#fff',
                  color: editDecoded.esInstructor === opt.v ? '#fff' : NA.text2,
                }}>
                <i className={`ti ${opt.i}`} style={{ fontSize: 15 }} aria-hidden="true" />
                {opt.l}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Nombre / referencia">
          <TextInput
            type="text"
            value={editPasivo.titulo || ''}
            onChange={(e) => setEditPasivo({ ...editPasivo, titulo: e.target.value })}
            required
          />
        </Field>

        {editDecoded.esInstructor && (
          <div style={{ background: NA.light, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Field label={<span style={{ color: NA.darker }}>Tarifa por hora (BRL)</span>}>
              <input
                type="number" step="0.01"
                value={editDecoded.tarifaHora || ''}
                onChange={(e) => setEditDecoded({ ...editDecoded, tarifaHora: e.target.value })}
                required
                style={{ ...sx.input, fontSize: 17, fontWeight: 600, color: NA.darker }}
                onFocus={focusOn} onBlur={focusOff}
              />
            </Field>
          </div>
        )}

        <Field label="Descripción">
          <textarea
            value={editDecoded.descripcion || ''}
            onChange={(e) => setEditDecoded({ ...editDecoded, descripcion: e.target.value })}
            rows={3}
            style={{ ...sx.input, resize: 'vertical', fontFamily: 'inherit' }}
            onFocus={focusOn} onBlur={focusOff}
          />
        </Field>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: 10, border: `0.5px solid ${NA.border}`, background: '#fff', color: NA.text2, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando}
            style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: guardando ? '#fcd9a8' : '#92400E', color: '#fff', fontSize: 13, fontWeight: 500, cursor: guardando ? 'default' : 'pointer' }}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default ModalEditar;