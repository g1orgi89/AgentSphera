import { Link } from 'react-router-dom';
import './Landing.css';

function Landing() {
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <svg width="36" height="36" viewBox="0 0 60 60" fill="none">
            <rect x="8" y="8" width="26" height="26" rx="3" transform="rotate(45 21 21)" fill="var(--pri)" />
            <rect x="24" y="24" width="22" height="22" rx="3" transform="rotate(45 35 35)" fill="var(--sec)" />
            <rect x="25" y="25" width="8" height="8" rx="1.5" transform="rotate(45 29 29)" fill="var(--acc)" />
            <text x="15" y="26" fill="#fff" fontSize="14" fontFamily="'Tenor Sans',serif" fontWeight="400">V</text>
            <text x="33" y="41" fill="#fff" fontSize="12" fontFamily="'Tenor Sans',serif" fontWeight="400">P</text>
          </svg>
          <span>АгентСфера</span>
        </div>
        <div className="landing-nav-btns">
          <Link to="/login" className="landing-btn-ghost">Войти</Link>
          <Link to="/register" className="landing-btn-primary">Попробовать</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-deco-1" />
        <div className="landing-hero-deco-2" />
        <div className="landing-hero-content">
          <div className="landing-badge">ДЛЯ СТРАХОВЫХ АГЕНТОВ</div>
          <h1>
            Договоры, комиссии и сверка<br />
            <span className="landing-hero-accent">в одном месте</span>
          </h1>
          <p className="landing-hero-desc">
            Взносы с напоминаниями, автосверка актов от СК, умный календарь.
            Уверенно, профессионально, надёжно.
          </p>
          <div className="landing-hero-btns">
            <Link to="/register" className="landing-btn-primary landing-btn-lg">Начать бесплатно</Link>
            <Link to="/login" className="landing-btn-accent landing-btn-lg">Демо-доступ</Link>
          </div>
          <div className="landing-sep">
            <div className="landing-sep-line" />
            <div className="landing-sep-diamond" />
            <div className="landing-sep-line" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-features-inner">
          <h2>Возможности</h2>
          <div className="landing-features-diamond">
            <div className="landing-sep-diamond" />
          </div>
          <div className="landing-features-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3>Карточки клиентов</h3>
              <p>Контакты, дни рождения, история договоров</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <h3>Несколько договоров</h3>
              <p>У каждого клиента — свой список полисов</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3>Взносы и комиссии</h3>
              <p>До 4 взносов, автоматический расчёт КВ</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <h3>Умный календарь</h3>
              <p>Взносы, окончания, дни рождения</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
              </div>
              <h3>Автосверка актов</h3>
              <p>Загрузка Excel от СК и сопоставление</p>
            </div>
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11"/><rect x="3" y="11" width="18" height="7" rx="2"/><circle cx="7.5" cy="15.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="15.5" r="1.5" fill="currentColor"/></svg>
              </div>
              <h3>Типы объектов</h3>
              <p>Авто, недвижимость, жизнь — разные поля</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-sep-diamond" />
        <p>2026 АгентСфера — Уверенно, профессионально, надёжно</p>
      </footer>
    </div>
  );
}

export default Landing;
