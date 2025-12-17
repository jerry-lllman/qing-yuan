import { ElectronAPI } from '@electron-toolkit/preload';

interface WindowControls {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: unknown;
    windowControls: WindowControls;
  }
}
