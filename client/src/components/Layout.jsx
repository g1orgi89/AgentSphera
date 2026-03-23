import { useState, useEffect, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Sidebar.css';

/* === Контекст мобильного меню === */

const MobileMenuContext = createContext(null);

export function useMobileMenu() {
  return useContext(MobileMenuContext);
}

/* === Бургер-кнопка (вставляется в хедер каждой страницы) === */

export function BurgerButton() {
  const ctx = useMobileMenu();
  if (!ctx || !ctx.isMobile) return null;
  return (
    <button className="burger-btn" onClick={ctx.openMenu} aria-label="Открыть меню">
      <span className="burger-line" />
      <span className="burger-line" />
      <span className="burger-line" />
    </button>
  );
}

/* === Иконка стрелки для кнопки сворачивания === */

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* === Layout === */

function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const location = useLocation();

  /* Отслеживаем ширину экрана */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileMenuOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* Закрываем drawer при навигации */
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  /* Блокируем скролл body при открытом drawer */
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const openMenu = () => setMobileMenuOpen(true);
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <MobileMenuContext.Provider value={{ openMenu, closeMenu, isMobile }}>
      <div className="layout">
        {/* Десктоп: фиксированный сайдбар + кнопка сворачивания */}
        {!isMobile && (
          <>
            <Sidebar collapsed={collapsed} />
            <button
              className={`layout-toggle-btn ${collapsed ? 'layout-toggle-btn-collapsed' : ''}`}
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Развернуть' : 'Свернуть'}
            >
              <IconChevronLeft />
            </button>
          </>
        )}

        {/* Мобильный: overlay + выезжающий drawer */}
        {isMobile && (
          <>
            <div
              className={`mobile-overlay ${mobileMenuOpen ? 'mobile-overlay-open' : ''}`}
              onClick={closeMenu}
            />
            <aside className={`mobile-drawer ${mobileMenuOpen ? 'mobile-drawer-open' : ''}`}>
              <Sidebar collapsed={false} onMobileClose={closeMenu} isMobileDrawer />
            </aside>
          </>
        )}

        <main
          className={`layout-content ${!isMobile && collapsed ? 'layout-content-collapsed' : ''} ${isMobile ? 'layout-content-mobile' : ''}`}
        >
          {children}
        </main>
      </div>
    </MobileMenuContext.Provider>
  );
}

export default Layout;
