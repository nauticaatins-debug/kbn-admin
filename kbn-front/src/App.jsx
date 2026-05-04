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
import Secretaria from './components/Secretaria'; // 👈 NUEVO

// Ruta privada por rol
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (!user?.role) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    switch (user.role) {
      case 'ADMINISTRADOR':
        return <Navigate to="/admin" replace />;
      case 'SECRETARIA':
        return <Navigate to="/secretaria" replace />;
      case 'INSTRUCTOR':
      case 'ALUMNO':
        return <Navigate to="/instructor" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Redirección raíz según rol
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Cargando sesión...</div>;
  if (!user?.role) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'ADMINISTRADOR':
      return <Navigate to="/admin" replace />;
    case 'SECRETARIA':
      return <Navigate to="/secretaria" replace />;
    case 'INSTRUCTOR':
    case 'ALUMNO':
      return <Navigate to="/instructor" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Header />
        <div className="pt-16">
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
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
                  <Secretaria key={location.pathname} />
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

            {/* Opcional: proteger también */}
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
