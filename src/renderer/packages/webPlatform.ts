import { Config, Settings } from "src/shared/types";
import { getOS } from './navigator';
import { parseLocale } from '@/i18n/parser';
import Exporter from './exporter';
import WebExporter from './exporter';

export class WebPlatform {
  public exporter = new WebExporter();

  public async getVersion() {
    return '1.0.0-web';
  }
  
  public async getPlatform() {
    return 'web';
  }
  
  public async shouldUseDarkColors(): Promise<boolean> {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  public onSystemThemeChange(callback: () => void): () => void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => callback();
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }
  
  public onWindowShow(callback: () => void): () => void {
    window.addEventListener('focus', callback);
    return () => window.removeEventListener('focus', callback);
  }
  
  public async openLink(url: string): Promise<void> {
    window.open(url, '_blank');
  }
  
  public async getInstanceName(): Promise<string> {
    return `Web Browser / ${getOS()}`;
  }
  
  public async getLocale() {
    return parseLocale(navigator.language);
  }
  
  public async ensureShortcutConfig(): Promise<void> {
    // No-op in web
    return;
  }
  
  public async ensureProxyConfig(): Promise<void> {
    // No-op in web
    return;
  }
  
  public async relaunch(): Promise<void> {
    window.location.reload();
  }

  public async getConfig(): Promise<Config> {
    // Use default config or fetch from server/localStorage
    const configStr = localStorage.getItem('chatbox-config');
    if (configStr) {
      return JSON.parse(configStr);
    }
    return {
      uuid: crypto.randomUUID(),
      serverUrl: '',
      shareId: '',
      sharePwd: '',
    };
  }
  
  public async getSettings(): Promise<Settings> {
    // Use default settings or fetch from server/localStorage
    const settingsStr = localStorage.getItem('chatbox-settings');
    if (settingsStr) {
      return JSON.parse(settingsStr);
    }
    return {
      language: 'en',
      theme: 'light',
      fontSize: 14,
      proxy: '',
      disableQuickToggleShortcut: false,
      showWordCount: false,
      showTokenCount: false,
      showTokenUsed: false,
      showModelName: true,
      showMessageTimestamp: false,
      spellCheck: true,
      enableMarkdownRendering: true,
      autoGenerateTitle: true,
      allowReportingAndTracking: false,
      chatboxApiHost: 'https://chatboxai.app',
    };
  }

  public async setStoreValue(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  
  public async getStoreValue(key: string) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }
  
  public delStoreValue(key: string) {
    localStorage.removeItem(key);
  }
  
  public async getAllStoreValues(): Promise<{ [key: string]: any }> {
    const result: { [key: string]: any } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch (e) {
            result[key] = value;
          }
        }
      }
    }
    return result;
  }
  
  public async setAllStoreValues(data: { [key: string]: any }) {
    Object.entries(data).forEach(([key, value]) => {
      this.setStoreValue(key, value);
    });
  }

  public initTracking(): void {
    // Initialize web analytics if needed
  }
  
  public trackingEvent(name: string, params: { [key: string]: string }) {
    // Send to web analytics service if needed
    console.log('Track event:', name, params);
  }

  public async shouldShowAboutDialogWhenStartUp(): Promise<boolean> {
    const currentVersion = await this.getVersion();
    const lastShownVersion = localStorage.getItem('lastShownAboutDialogVersion');
    if (lastShownVersion === currentVersion) {
      return false;
    }
    localStorage.setItem('lastShownAboutDialogVersion', currentVersion);
    return true;
  }

  public async appLog(level: string, message: string) {
    console[level as keyof Console](message);
  }
}

export default new WebPlatform();
