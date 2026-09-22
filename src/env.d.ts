interface ImportMetaEnv {
  readonly METALS_DEV_API_KEY?: string;
  readonly PUBLIC_WEB3FORMS_KEY?: string;
  readonly ADMIN_PASSWORD?: string;
  readonly GITHUB_TOKEN?: string;
  readonly GITHUB_REPO?: string;
  readonly GITHUB_BRANCH?: string;
}


interface ImportMeta {
  readonly env: ImportMetaEnv;
}
