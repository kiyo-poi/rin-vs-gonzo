import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages のサブパスでも Cloudflare Pages のルートでも動くように相対パスで出力する
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
