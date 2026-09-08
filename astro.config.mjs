import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://aryanbasantani.me',
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
