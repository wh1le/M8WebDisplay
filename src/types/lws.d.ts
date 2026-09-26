declare module "local-web-server" {
  interface LwsConfig {
    blacklist?: string[];
    cert?: string;
    directory?: string;
    key?: string;
    logFormat?: string;
    port?: number;
    rewrite?: string[];
    view?: unknown;
  }

  interface LwsEvent {
    message: string;
  }

  interface Lws {
    on(event: string, listener: (name: string, value: LwsEvent) => void): void;
  }

  const LocalWebServer: {
    create(config: LwsConfig): Promise<Lws>;
  };

  export default LocalWebServer;
}

declare module "lws/lib/view/cli-view.mjs" {
  interface CliViewOptions {
    log?: (message: string) => void;
    logError?: (message: string) => void;
  }

  export default class CliView {
    constructor(options?: CliViewOptions);
  }
}
