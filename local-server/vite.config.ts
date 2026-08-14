import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_BASE_URL || env.API_BASE_URL || 'http://localhost:5050';
  const vitePort = Number(env.VITE_PORT) || 5175;

  return {
    plugins: [react()],
    server: {
      port: vitePort,
      strictPort: false,
      host: true,
      allowedHosts: ['api.whizpoint.app', 'localhost', '127.0.0.1', '.local'],
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err: any, _req, res: any) => {
              if (err.code === 'ECONNREFUSED') {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend starting up, please wait...' }));
              }
            });
          }
        }
      }
    }
  };
})
