import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "4173", 10);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp"
};

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || '')) {
    send(response, 405, "Method Not Allowed", "text/plain; charset=utf-8");
    return;
  }

  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const requestedPath = decodeURIComponent(url.pathname);
    const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
    const filePath = resolve(projectRoot, relativePath);
    const rootPrefix = resolve(projectRoot) + sep;

    if (filePath !== resolve(projectRoot) && !filePath.startsWith(rootPrefix)) {
      send(response, 403, "Forbidden", "text/plain; charset=utf-8");
      return;
    }

    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      send(response, 404, "Not Found", "text/plain; charset=utf-8");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": fileInfo.size,
      "Cache-Control": "no-store",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff"
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath)
      .on("error", () => {
        if (!response.headersSent) send(response, 500, "Internal Server Error", "text/plain; charset=utf-8");
        else response.destroy();
      })
      .pipe(response);
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof URIError) {
      send(response, 404, "Not Found", "text/plain; charset=utf-8");
      return;
    }
    console.error(error);
    send(response, 500, "Internal Server Error", "text/plain; charset=utf-8");
  }
});

function send(response, status, message, contentType) {
  const body = Buffer.from(message);
  response.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": body.length,
    "Cache-Control": "no-store"
  });
  response.end(body);
}

server.listen(port, host, () => {
  console.log(`Muevete CB disponible en http://localhost:${port}`);
  console.log("Ctrl+C para detener el servidor.");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
