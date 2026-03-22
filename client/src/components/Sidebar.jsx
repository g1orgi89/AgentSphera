import { NavLink } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import './Sidebar.css';

/* === SVG-иконки === */

function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconClients() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 17c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconContracts() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2H5.5A1.5 1.5 0 004 3.5v13A1.5 1.5 0 005.5 18h9a1.5 1.5 0 001.5-1.5V7L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 2v5h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconTasks() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="3.5" width="15" height="13.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 7.5h15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 1.5v3M13.5 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconActs() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H5.5A1.5 1.5 0 004 3.5v13A1.5 1.5 0 005.5 18h9a1.5 1.5 0 001.5-1.5V7L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 2v5h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCollapse() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 17H4a1 1 0 01-1-1V4a1 1 0 011-1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 14l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* Логотип АгентСфера */
function Logo({ collapsed }) {
  return (
    <div className="sidebar-logo">
      <svg width="36" height="36" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="26" height="26" rx="3" transform="rotate(45 21 21)" fill="var(--pri)" />
        <rect x="24" y="24" width="22" height="22" rx="3" transform="rotate(45 35 35)" fill="var(--sec)" />
        <rect x="25" y="25" width="8" height="8" rx="1.5" transform="rotate(45 29 29)" fill="var(--acc)" />
        <text x="13" y="26" fill="#fff" fontSize="14" fontFamily="'Tenor Sans',serif" fontWeight="400">A</text>
        <text x="31" y="41" fill="#fff" fontSize="12" fontFamily="'Tenor Sans',serif" fontWeight="400">C</text>
      </svg>
      {!collapsed && <span className="sidebar-logo-text">АгентСфера</span>}
    </div>
  );
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Дашборд', Icon: IconDashboard },
  { to: '/clients', label: 'Клиенты', Icon: IconClients },
  { to: '/contracts', label: 'Договоры', Icon: IconContracts },
  { to: '/tasks', label: 'Задачи', Icon: IconTasks },
  { to: '/calendar', label: 'Календарь', Icon: IconCalendar },
  { to: '/acts', label: 'Акты', Icon: IconActs }
];

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Логотип */}
      <div className="sidebar-top">
        <Logo collapsed={collapsed} />
        <button
          className={`sidebar-collapse-btn ${collapsed ? 'sidebar-collapse-btn-rotated' : ''}`}
          onClick={onToggle}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          <IconCollapse />
        </button>
      </div>

      {/* Навигация */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Нижняя часть: пользователь + выход */}
      <div className="sidebar-bottom">
        <div className="sidebar-user" title={user?.name || ''}>
          <div className="sidebar-avatar">{getInitials(user?.name)}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || 'Пользователь'}</span>
              <span className="sidebar-user-role">{user?.role === 'admin' ? 'Админ' : 'Агент'}</span>
            </div>
          )}
        </div>
        <button
          className="sidebar-logout-btn"
          onClick={logout}
          title="Выйти"
        >
          <IconLogout />
          {!collapsed && <span>Выйти</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
