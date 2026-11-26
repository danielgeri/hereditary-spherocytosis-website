import { useCallback, useEffect, useState } from 'react';
import { trackEventOnce } from './analytics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function registerPwa(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    trackEventOnce('pwa/installed', 'Installed PWA');
    notifyListeners();
  });

  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  ) {
    trackEventOnce('pwa/standalone-launch', 'Launched Installed PWA');
  }

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // Silent fail if browser blocks SW (e.g. strict private browsing)
      });
    });
  }
}

export function usePwaInstall() {
  const [canPromptInstall, setCanPromptInstall] = useState<boolean>(Boolean(deferredPrompt));
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIosSafari, setIsIosSafari] = useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = Boolean(
        (navigator as Navigator & { standalone?: boolean }).standalone
      );
      setIsStandalone(standaloneMedia || iosStandalone);
    };
    checkStandalone();

    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    setIsIosSafari(isIos && isSafari);

    const sync = () => {
      setCanPromptInstall(Boolean(deferredPrompt));
      checkStandalone();
    };
    listeners.add(sync);

    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener?.('change', checkStandalone);
    return () => {
      listeners.delete(sync);
      mql.removeEventListener?.('change', checkStandalone);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      notifyListeners();
    }
  }, []);

  return { canPromptInstall, isStandalone, isIosSafari, triggerInstall };
}
