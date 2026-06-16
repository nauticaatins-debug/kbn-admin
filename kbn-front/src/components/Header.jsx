import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  ADMINISTRADOR: "Administrador",
  SECRETARIA: "Secretaria",
  INSTRUCTOR: "Instructor",
  ALUMNO: "Alumno",
};

const ROLE_INITIALS = {
  ADMINISTRADOR: "AD",
  SECRETARIA: "SE",
  INSTRUCTOR: "IN",
  ALUMNO: "AL",
};

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);

  const isLoginPage = location.pathname === "/login";
  const isLogged = !!user?.role;
  const role = user?.role;

  const isAdmin = role === "ADMINISTRADOR";
  const isSecretaria = role === "SECRETARIA";
  const isInstructor = role === "INSTRUCTOR" || role === "ALUMNO";

  // ── Medir altura real del header y actualizar CSS variable ──────────────
  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        const h = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty("--header-h", `${h}px`);
      }
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [isLogged, menuOpen, role]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const goTo = (path) => {
    setMenuOpen(false);
    setActiveTab(path);
    navigate(path, { replace: true });
  };

  const isActive = (path) =>
    activeTab === path || location.pathname === path;

  const navItems = [
    { path: "/admin",      label: "Panel admin",  icon: "ti-layout-dashboard", show: isAdmin },
    { path: "/instructor", label: "Instructor",   icon: "ti-school",            show: isAdmin || isInstructor },
    { path: "/secretaria", label: "Secretaria",   icon: "ti-file-text",         show: isAdmin || isSecretaria },
    { path: "/reportes",   label: "Estadísticas", icon: "ti-chart-bar",         show: isAdmin },
  ].filter((item) => item.show);

  const displayName = user?.nombre || user?.name || user?.email?.split("@")[0] || "Usuario";
  const initials = ROLE_INITIALS[role] || "?";

  return (
    <header ref={headerRef} className="bg-white border-b border-gray-100 fixed top-0 left-0 w-full z-50">

      {/* Barra principal */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <div
          className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
          onClick={() => goTo("/")}
        >
          <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
            <img src="/logo.png" alt="Náutica Atins" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-gray-900 tracking-wide">KBN Admin</span>
            <span className="text-[11px] text-gray-400 tracking-wider">Náutica Atins</span>
          </div>
        </div>

        {/* Menú escritorio */}
        <div className="hidden md:flex items-center gap-1">
          {isLogged && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100 mr-2">
              {ROLE_LABELS[role] || role}
            </span>
          )}
          {isLogged && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-gray-100 bg-gray-50 mr-2">
              <div className="w-6 h-6 rounded-full bg-teal-700 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
                {initials}
              </div>
              <span className="text-xs text-gray-700">{displayName}</span>
            </div>
          )}
          {!isLogged && !isLoginPage && (
            <button
              onClick={() => goTo("/login")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 transition-colors"
            >
              <i className="ti ti-login text-base" aria-hidden="true" />
              Iniciar sesión
            </button>
          )}
          {isLogged && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-red-500 border border-red-200 text-sm rounded-lg hover:bg-red-50 transition-colors"
            >
              <i className="ti ti-logout text-base" aria-hidden="true" />
              Cerrar sesión
            </button>
          )}
        </div>

        {/* Botón menú móvil */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <i className={`ti ${menuOpen ? "ti-x" : "ti-menu-2"} text-gray-600 text-xl`} aria-hidden="true" />
        </button>
      </div>

      {/* Tab bar — solo si está logueado y hay items */}
      {isLogged && navItems.length > 0 && (
        <div className="hidden md:flex border-t border-gray-100 px-6 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => goTo(item.path)}
              className={`flex items-center gap-1.5 px-4 h-10 text-sm border-b-2 transition-colors whitespace-nowrap
                ${isActive(item.path)
                  ? "border-teal-700 text-teal-700 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              <i className={`ti ${item.icon} text-sm`} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Menú móvil */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white py-3 px-4 space-y-1">
          {isLogged && (
            <div className="flex items-center gap-3 px-2 py-3 mb-2 border-b border-gray-100">
              <div className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center text-white text-sm font-medium">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{displayName}</p>
                <p className="text-xs text-gray-400">{ROLE_LABELS[role] || role}</p>
              </div>
            </div>
          )}
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => goTo(item.path)}
              className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors
                ${isActive(item.path)
                  ? "bg-teal-50 text-teal-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
                }`}
            >
              <i className={`ti ${item.icon} text-base`} aria-hidden="true" />
              {item.label}
            </button>
          ))}
          {!isLogged && !isLoginPage && (
            <button
              onClick={() => goTo("/login")}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 mt-2 bg-teal-700 text-white text-sm rounded-lg"
            >
              <i className="ti ti-login text-base" aria-hidden="true" />
              Iniciar sesión
            </button>
          )}
          {isLogged && (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 mt-2 text-red-500 border border-red-200 text-sm rounded-lg hover:bg-red-50 transition-colors"
            >
              <i className="ti ti-logout text-base" aria-hidden="true" />
              Cerrar sesión
            </button>
          )}
        </div>
      )}
    </header>
  );
}