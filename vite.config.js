import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

const MIME = {
  ".json": "application/json",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8"
};

// Dev-only: serve the root-level /data and /assets folders (which postbuild
// copies into dist/ for production) so `npm run dev` works without a build.
function serveRootStatic() {
  const roots = ["data", "assets"].map((d) => path.resolve(__dirname, d));
  return {
    name: "serve-root-static",
    configureServer(server) {
      server.config.logger.info("[serve-root-static] serving /data and /assets from project root");
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || "").split("?")[0]);
        if (!url.startsWith("/data/") && !url.startsWith("/assets/")) return next();

        const filePath = path.join(__dirname, url);
        const isAllowed = roots.some(
          (root) => filePath === root || filePath.startsWith(root + path.sep)
        );
        if (!isAllowed) return next();

        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) return next();
          const ext = path.extname(filePath).toLowerCase();
          if (MIME[ext]) res.setHeader("Content-Type", MIME[ext]);
          res.statusCode = 200;
          fs.createReadStream(filePath)
            .on("error", () => next())
            .pipe(res);
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), serveRootStatic()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
