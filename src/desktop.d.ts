export {};

declare global {
  interface SigitmRect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  /** Ponte exposta por desktop/preload.js quando o app roda no Electron. */
  interface FastoolsDesktopBridge {
    isDesktop: boolean;
    openSigitm: (rect: SigitmRect) => void;
    updateSigitmBounds: (rect: SigitmRect) => void;
    closeSigitm: () => void;
  }

  interface Window {
    fastoolsDesktop?: FastoolsDesktopBridge;
  }
}
