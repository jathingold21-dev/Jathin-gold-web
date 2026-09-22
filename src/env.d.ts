interface ImportMetaEnv {
  readonly METALS_DEV_API_KEY?: string;
  readonly PUBLIC_WEB3FORMS_KEY?: string;
  readonly ADMIN_PASSWORD?: string;
}


interface ImportMeta {
  readonly env: ImportMetaEnv;
}
