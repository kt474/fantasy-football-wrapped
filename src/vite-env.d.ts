/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "markdown-it" {
  export default class MarkdownIt {
    constructor(...args: any[]);
    render(src: string, env?: unknown): string;
  }
}
