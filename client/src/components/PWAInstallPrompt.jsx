import { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

/* Определяем iOS */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/* Определяем standalone (уже установлено) */
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    /* Если уже установлено или пользователь закрыл — не показываем */
    if (isStandalone()) return;

    /* Android/Chrome: перехват события beforeinstallprompt */
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  /* Нажатие «Установить» (Android) */
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  /* Нажатие «Установить» (iOS — показываем инструкцию) */
  const handleIOSInstall = () => {
    setShowIOSPrompt(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowIOSPrompt(false);
  };

  /* Если уже установлено или пользователь закрыл */
  if (isStandalone() || dismissed) return null;

  /* Android: есть deferredPrompt */
  if (deferredPrompt) {
    return (
      <button className="pwa-install-btn" onClick={handleInstall}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 2v10M5 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 13v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Установить</span>
      </button>
    );
  }

  /* iOS: показываем кнопку + инструкцию */
  if (isIOS()) {
    return (
      <>
        <button className="pwa-install-btn" onClick={handleIOSInstall}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 2v10M5 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 13v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Установить</span>
        </button>

        {showIOSPrompt && (
          <div className="pwa-ios-overlay" onClick={handleDismiss}>
            <div className="pwa-ios-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pwa-ios-header">
                <h3>Установка на iPhone</h3>
                <button className="pwa-ios-close" onClick={handleDismiss}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="pwa-ios-steps">
                <div className="pwa-ios-step">
                  <div className="pwa-ios-step-num">1</div>
                  <div className="pwa-ios-step-text">
                    Нажмите <strong>Поделиться</strong>
                    <svg className="pwa-ios-share-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2v10" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M6 6l4-4 4 4" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 10v6a2 2 0 002 2h8a2 2 0 002-2v-6" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    в нижней панели Safari
                  </div>
                </div>
                <div className="pwa-ios-step">
                  <div className="pwa-ios-step-num">2</div>
                  <div className="pwa-ios-step-text">
                    Прокрутите вниз и нажмите <strong>На экран «Домой»</strong>
                  </div>
                </div>
                <div className="pwa-ios-step">
                  <div className="pwa-ios-step-num">3</div>
                  <div className="pwa-ios-step-text">
                    Нажмите <strong>Добавить</strong> в правом верхнем углу
                  </div>
                </div>
              </div>

              <p className="pwa-ios-note">После этого АгентСфера появится на вашем домашнем экране как обычное приложение</p>

              <button className="pwa-ios-ok" onClick={handleDismiss}>Понятно</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export default PWAInstallPrompt;
