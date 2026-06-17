import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import InstructorForm from './components/InstructorForm';
import ReporteEstadisticas from './components/ReporteEstadisticas';
import UserManagement from './components/UserManagement';
import Secretaria from './components/Secretaria';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword  from './components/ResetPassword';

// ── Paleta Náutica Atins ───────────────────────────────────────────────────
const NA = {
  primary:  '#1ABFA0',
  dark:     '#0F6E56',
  darker:   '#085041',
  light:    '#E1F5EE',
  mid:      '#9FE1CB',
  bg:       '#f0faf7',
  text:     '#0a2e27',
  text2:    '#3a6b5e',
  border:   '#c5e8df',
};

// ── Pantalla de carga global ───────────────────────────────────────────────
const LoadingScreen = ({ mensaje = 'Cargando...' }) => (
  <div
    style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: NA.bg,
    }}
  >
    <div style={{ textAlign: 'center' }}>

      {/* Logo animado */}
      <div style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: NA.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
        animation: 'kbn-pulse 1.8s ease-in-out infinite',
      }}>
        <svg viewBox="0 0 40 40" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
          <text
            x="20" y="15"
            textAnchor="middle"
            fontSize="13" fontWeight="700"
            fill={NA.darker}
            fontFamily="system-ui, sans-serif"
          >N</text>
          <path
            d="M6 20 Q13 16 20 20 Q27 24 34 20"
            fill="none" stroke={NA.darker} strokeWidth="1.8"
          />
          <path d="M6 20 Q20 31 34 20" fill={NA.darker} />
          <text
            x="20" y="34"
            textAnchor="middle"
            fontSize="8" fontWeight="700"
            fill={NA.primary}
            fontFamily="system-ui, sans-serif"
          >A</text>
        </svg>
      </div>

      {/* Spinner de línea */}
      <div style={{
        width: 28,
        height: 28,
        border: `2.5px solid ${NA.mid}`,
        borderTopColor: NA.dark,
        borderRadius: '50%',
        animation: 'kbn-spin 0.7s linear infinite',
        margin: '0 auto 12px',
      }} />

      <p style={{
        fontSize: 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: NA.text2,
      }}>
        {mensaje}
      </p>
    </div>

    <style>{`
      @keyframes kbn-spin  { to { transform: rotate(360deg); } }
      @keyframes kbn-pulse { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
    `}</style>
  </div>
);

// ── Ruta privada por rol ───────────────────────────────────────────────────
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen mensaje="Verificando sesión..." />;
  if (!user?.role) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    switch (user.role) {
      case 'ADMINISTRADOR': return <Navigate to="/admin"      replace />;
      case 'SECRETARIA':    return <Navigate to="/secretaria" replace />;
      case 'INSTRUCTOR':
      case 'ALUMNO':        return <Navigate to="/instructor" replace />;
      default:              return <Navigate to="/login"      replace />;
    }
  }

  return children;
};

// ── Redirección raíz según rol ─────────────────────────────────────────────
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen mensaje="Cargando sesión..." />;
  if (!user?.role) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'ADMINISTRADOR': return <Navigate to="/admin"      replace />;
    case 'SECRETARIA':    return <Navigate to="/secretaria" replace />;
    case 'INSTRUCTOR':
    case 'ALUMNO':        return <Navigate to="/instructor" replace />;
    default:              return <Navigate to="/login"      replace />;
  }
};

// ── App ────────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <style>{`
          :root {
            --header-h: 64px;
            --na-primary:  ${NA.primary};
            --na-dark:     ${NA.dark};
            --na-darker:   ${NA.darker};
            --na-light:    ${NA.light};
            --na-mid:      ${NA.mid};
            --na-bg:       ${NA.bg};
            --na-text:     ${NA.text};
            --na-text2:    ${NA.text2};
            --na-border:   ${NA.border};
          }

          /* Scroll iOS */
          html, body, #root {
            height: 100%;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior-y: none;
          }

          /* Color de selección de texto */
          ::selection {
            background: var(--na-mid);
            color: var(--na-darker);
          }

          /* Scrollbar sutil con colores Náutica */
          ::-webkit-scrollbar        { width: 5px; height: 5px; }
          ::-webkit-scrollbar-track  { background: var(--na-light); }
          ::-webkit-scrollbar-thumb  { background: var(--na-mid); border-radius: 99px; }
          ::-webkit-scrollbar-thumb:hover { background: var(--na-dark); }

          /* Focus ring con color primario */
          *:focus-visible {
            outline: 2px solid var(--na-primary);
            outline-offset: 2px;
          }

          /* Previene zoom en iOS */
          input[type="text"],
          input[type="email"],
          input[type="password"],
          input[type="number"],
          input[type="tel"],
          input[type="date"],
          select,
          textarea {
            font-size: 16px !important;
          }

          /* Táctil general */
          button, a, select, input, textarea {
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
          }

          /* Colores globales de Tailwind overrides para componentes */
          .text-primary   { color: var(--na-text) !important; }
          .text-secondary { color: var(--na-text2) !important; }
          .bg-primary     { background-color: var(--na-primary) !important; }
          .bg-light       { background-color: var(--na-light) !important; }
          .border-na      { border-color: var(--na-border) !important; }
        `}</style>

        <Header />

        <div style={{
          paddingTop: 'calc(var(--header-h) + env(safe-area-inset-top, 0px))',
          minHeight: '100dvh',
          boxSizing: 'border-box',
          backgroundColor: NA.bg,
        }}>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login"    element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/register" element={<Register />} />

            {/* ADMINISTRADOR */}
            <Route
              path="/admin"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/reportes"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                  <ReporteEstadisticas />
                </PrivateRoute>
              }
            />

            {/* SECRETARIA */}
            <Route
              path="/secretaria"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR', 'SECRETARIA']}>
                  <Secretaria key="secretaria" />
                </PrivateRoute>
              }
            />

            {/* INSTRUCTOR / ALUMNO / ADMIN */}
            <Route
              path="/instructor"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR', 'INSTRUCTOR', 'ALUMNO']}>
                  <InstructorForm />
                </PrivateRoute>
              }
            />

            {/* GESTIÓN DE USUARIOS */}
            <Route
              path="/usuarios"
              element={
                <PrivateRoute allowedRoles={['ADMINISTRADOR']}>
                  <UserManagement />
                </PrivateRoute>
              }
            />
          </Routes>
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;