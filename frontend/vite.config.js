import { defineConfig } from 'vite';
import vue2 from '@vitejs/plugin-vue2';
import path from 'path';

export default defineConfig({
  plugins: [vue2()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'lodash': 'lodash-es',
      'vue-router': 'vue-router/dist/vue-router.esm.js'
    }
  },
  optimizeDeps: {
    include: ['lodash', 'lodash-es', 'vue-router']
  },
  ssr: {
    noExternal: ['lodash', 'lodash-es']
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
