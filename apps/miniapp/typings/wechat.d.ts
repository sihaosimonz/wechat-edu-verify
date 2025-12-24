// Minimal WeChat + App typings to satisfy TypeScript

declare const wx: any;

// WeChat provides these at runtime; TypeScript needs declarations.
declare function App<T>(options: T): void;
declare function Page(options: any): void;

interface IAppOption {
  globalData: Record<string, any>;
  onLaunch?: () => void;
}

declare namespace WechatMiniprogram {
  interface LoginSuccessCallbackResult {
    code: string;
  }
}
