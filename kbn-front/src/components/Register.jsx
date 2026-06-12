import React, { useState } from 'react';
import axios from '../axiosConfig';

const STRENGTH_LEVELS = [
  { label: '',            color: '#e5e7eb', pct: 0   },
  { label: 'Muy débil',  color: '#ef4444', pct: 25  },
  { label: 'Débil',      color: '#f97316', pct: 50  },
  { label: 'Buena',      color: '#84cc16', pct: 75  },
  { label: '¡Excelente!',color: '#22c55e', pct: 100 },
];

function getStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  return Math.max(score, 1);
}

function EyeToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      style={{
        position: 'absolute', right: 10, top: '50%',
        transform: 'translateY(-50%)', background: 'none',
        border: 'none', cursor: 'pointer', padding: 0,
        color: '#9ca3af', display: 'flex', alignItems: 'center',
      }}
    >
      {show ? (
        // eye-off
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        // eye
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );
}

export default function Register() {
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '',
    telefono: '', password: '', confirm: '',
  });
  const [showPw, setShowPw]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.nombre.trim())   errs.nombre   = 'El nombre es requerido.';
    if (!form.apellido.trim()) errs.apellido = 'El apellido es requerido.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Email no válido.';
    if (form.telefono && !/^\+?[\d\s\-()]{7,15}$/.test(form.telefono))
      errs.telefono = 'Teléfono no válido.';
    if (form.password.length < 8)
      errs.password = 'Mínimo 8 caracteres.';
    if (form.password !== form.confirm)
      errs.confirm = 'Las contraseñas no coinciden.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const { confirm, ...payload } = form; // no mandar confirm al backend
      await axios.post('/register', payload);
      setSuccess(true);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Error al registrar. Intentá de nuevo.';
      setErrors({ api: msg });
    } finally {
      setLoading(false);
    }
  };

  const strength     = getStrength(form.password);
  const strengthInfo = STRENGTH_LEVELS[strength];
  const passwordsMatch =
    form.confirm.length > 0 && form.password === form.confirm;

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: 56 }}>✅</div>
            <h2 style={{ ...styles.title, marginTop: '1rem' }}>¡Cuenta creada!</h2>
            <p style={styles.subtitle}>
              Revisá tu email para confirmar el registro.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario ─────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={styles.avatar}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <h2 style={styles.title}>Crear cuenta</h2>
          <p style={styles.subtitle}>Completá tus datos para registrarte</p>
        </div>

        {/* Error de API */}
        {errors.api && (
          <div style={styles.apiError}>{errors.api}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* Nombre + Apellido */}
          <div style={styles.row}>
            <Field label="Nombre" error={errors.nombre}>
              <input
                type="text"
                value={form.nombre}
                onChange={set('nombre')}
                placeholder="Juan"
                autoComplete="given-name"
                style={inputStyle(errors.nombre)}
              />
            </Field>
            <Field label="Apellido" error={errors.apellido}>
              <input
                type="text"
                value={form.apellido}
                onChange={set('apellido')}
                placeholder="García"
                autoComplete="family-name"
                style={inputStyle(errors.apellido)}
              />
            </Field>
          </div>

          {/* Email */}
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="juan@ejemplo.com"
              autoComplete="email"
              style={inputStyle(errors.email)}
            />
          </Field>

          {/* Teléfono (opcional) */}
          <Field label="Teléfono" hint="Opcional" error={errors.telefono}>
            <input
              type="tel"
              value={form.telefono}
              onChange={set('telefono')}
              placeholder="+54 9 351 000-0000"
              autoComplete="tel"
              style={inputStyle(errors.telefono)}
            />
          </Field>

          {/* Contraseña */}
          <Field label="Contraseña" error={errors.password}>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                style={{ ...inputStyle(errors.password), paddingRight: 36 }}
              />
              <EyeToggle show={showPw} onToggle={() => setShowPw((v) => !v)} />
            </div>
            {/* Barra de fuerza */}
            {form.password.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={styles.strengthTrack}>
                  <div style={{
                    ...styles.strengthFill,
                    width: `${strengthInfo.pct}%`,
                    background: strengthInfo.color,
                  }} />
                </div>
                <span style={{
                  fontSize: 12,
                  color: strengthInfo.color,
                  fontWeight: 500,
                }}>
                  {strengthInfo.label}
                </span>
              </div>
            )}
          </Field>

          {/* Confirmar contraseña */}
          <Field label="Confirmar contraseña" error={errors.confirm}>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="Repetí tu contraseña"
                autoComplete="new-password"
                style={{ ...inputStyle(errors.confirm), paddingRight: 36 }}
              />
              <EyeToggle
                show={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
              />
            </div>
            {passwordsMatch && !errors.confirm && (
              <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 500 }}>
                ✓ Las contraseñas coinciden
              </span>
            )}
          </Field>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: '1.25rem' }}>
          ¿Ya tenés cuenta?{' '}
          <a href="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
            Iniciá sesión
          </a>
        </p>
      </div>
    </div>
  );
}

// ── Sub-componente Field ───────────────────────────────────────────────────────
function Field({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>
        {label}
        {hint && (
          <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>
            ({hint})
          </span>
        )}
      </label>
      {children}
      {error && <p style={styles.errMsg}>{error}</p>}
    </div>
  );
}

// ── Helpers de estilo ─────────────────────────────────────────────────────────
const inputStyle = (hasError) => ({
  width: '100%', boxSizing: 'border-box',
  padding: '8px 12px', fontSize: 14,
  border: `1px solid ${hasError ? '#ef4444' : '#d1d5db'}`,
  borderRadius: 8, outline: 'none',
  backgroundColor: '#fff', color: '#111827',
  transition: 'border-color 0.15s',
});

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f3f4f6', padding: '1rem',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '2rem', width: '100%', maxWidth: 460,
  },
  avatar: {
    width: 48, height: 48, borderRadius: '50%',
    background: '#eff6ff', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: '0.75rem',
  },
  title: { fontSize: 22, fontWeight: 600, margin: 0, color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', margin: '4px 0 0' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: {
    display: 'block', fontSize: 13,
    fontWeight: 500, color: '#374151', marginBottom: 5,
  },
  errMsg: { fontSize: 12, color: '#ef4444', margin: '4px 0 0' },
  apiError: {
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 14, color: '#dc2626', marginBottom: 16,
  },
  strengthTrack: {
    height: 3, borderRadius: 2,
    background: '#e5e7eb', overflow: 'hidden',
  },
  strengthFill: {
    height: '100%', borderRadius: 2,
    transition: 'width 0.3s, background 0.3s',
  },
  btn: {
    width: '100%', padding: '10px',
    background: '#3b82f6', color: '#fff',
    border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600,
    marginTop: 8, transition: 'background 0.15s',
  },
};