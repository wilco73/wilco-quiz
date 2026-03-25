import React, { useState, useEffect } from 'react';
import { Download, X, Share, Plus, Smartphone } from 'lucide-react';

const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Vérifier si déjà en mode standalone (PWA installée)
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Vérifier si déjà refusé
    const wasDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Réafficher après 7 jours
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Écouter l'événement beforeinstallprompt (Android/Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Sur iOS, montrer le prompt manuellement après un délai
    if (iOS && !standalone && !wasDismissed) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  // Ne rien afficher si déjà installé, refusé, ou pas de prompt
  if (isStandalone || dismissed || !showPrompt) {
    return null;
  }

  // Version iOS (instructions manuelles)
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg safe-area-bottom">
        <div className="max-w-lg mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Installer WilcoQuiz</h3>
              <p className="text-sm text-white/90 mb-3">
                Ajoutez l'app à votre écran d'accueil pour une meilleure expérience plein écran !
              </p>
              <div className="flex items-center gap-2 text-sm bg-white/10 rounded-lg p-2">
                <span>Appuyez sur</span>
                <Share className="w-5 h-5" />
                <span>puis</span>
                <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded">
                  <Plus className="w-4 h-4" />
                  Sur l'écran d'accueil
                </span>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 hover:bg-white/20 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Version Android/Chrome (bouton d'installation)
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
          <Download className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold">Installer WilcoQuiz</h3>
          <p className="text-sm text-white/90">Accès rapide et mode plein écran</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex-shrink-0 px-4 py-2 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition"
        >
          Installer
        </button>
        <button 
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
