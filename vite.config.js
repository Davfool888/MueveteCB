import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

function localApiPlugin() {
  return {
    name: 'local-api-handler',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url === '/api/chat' && req.method === 'POST') {
          try {
            const chunks = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const rawBody = Buffer.concat(chunks).toString('utf-8');
            let body = {};
            try {
              body = JSON.parse(rawBody);
            } catch {}
            req.body = body;

            const { default: chatHandler } = await import('./api/chat.js');
            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (payload) => {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(payload));
              return res;
            };
            await chatHandler(req, res);
            return;
          } catch (error) {
            console.error('Error procesando /api/chat local en Vite:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'server_error', message: error.message }));
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
});

