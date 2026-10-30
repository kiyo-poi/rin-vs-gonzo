import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages のサブパスでも Cloudflare Pages のルートでも動くように相対パスで出力する
  base: './',
  // assets/ の中身をそのまま公開する（vite build で dist/ の直下にコピーされる）。
  // 例: assets/images/characters/lin/lin_idle.png → 公開 URL は images/characters/lin/lin_idle.png
  publicDir: 'assets',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
