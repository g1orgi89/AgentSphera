import { Link } from 'react-router-dom';
import './NotFound.css';

function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-content">
        <svg className="notfound-icon" width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="16" y="16" width="34" height="34" rx="4" transform="rotate(45 33 33)" fill="var(--pri)" opacity="0.15" />
          <rect x="30" y="30" width="28" height="28" rx="4" transform="rotate(45 44 44)" fill="var(--sec)" opacity="0.15" />
          <rect x="32" y="32" width="10" height="10" rx="2" transform="rotate(45 37 37)" fill="var(--acc)" opacity="0.3" />
          <text x="40" y="48" textAnchor="middle" fill="var(--pri)" fontSize="28" fontFamily="'Tenor Sans',serif" fontWeight="400">?</text>
        </svg>
        <h1 className="notfound-title">404</h1>
        <p className="notfound-text">Страница не найдена</p>
        <p className="notfound-sub">Возможно, она была перемещена или удалена</p>
        <div className="notfound-actions">
          <Link to="/dashboard" className="notfound-btn-primary">На главную</Link>
          <Link to="/clients" className="notfound-btn-secondary">Клиенты</Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
