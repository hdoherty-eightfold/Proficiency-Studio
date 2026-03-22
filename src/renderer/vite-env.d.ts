/// <reference types="vite/client" />

interface Window {
  electron: import('../preload/preload').ElectronAPI;
}

// Image imports
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
