import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

copyRecursive(path.join(root, "assets"), path.join(dist, "assets"));
copyRecursive(path.join(root, "data"), path.join(dist, "data"));
copyRecursive(path.join(root, "src", "static", "_headers"), path.join(dist, "_headers"));
copyRecursive(path.join(root, "src", "static", "_redirects"), path.join(dist, "_redirects"));

console.log("Postbuild copy complete.");
