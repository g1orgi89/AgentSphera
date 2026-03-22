import { useState } from 'react';
import Sidebar from './Sidebar';
import './Sidebar.css';

function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className={`layout-content ${collapsed ? 'layout-content-collapsed' : ''}`}>
        {children}
      </main>
    </div>
  );
}

export default Layout;
