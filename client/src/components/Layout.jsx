import { useState } from 'react';
import Sidebar from './Sidebar';
import './Sidebar.css';

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="layout">
      <Sidebar collapsed={collapsed} />
      <button
        className={`layout-toggle-btn ${collapsed ? 'layout-toggle-btn-collapsed' : ''}`}
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Развернуть' : 'Свернуть'}
      >
        <IconChevronLeft />
      </button>
      <main className={`layout-content ${collapsed ? 'layout-content-collapsed' : ''}`}>
        {children}
      </main>
    </div>
  );
}

export default Layout;
