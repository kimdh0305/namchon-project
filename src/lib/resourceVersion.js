const BUILD_VERSION =
  typeof __BUILD_VERSION__ === "string" ? __BUILD_VERSION__ : "dev";

const RESOURCE_PATH = /\.(?:avif|gif|jpe?g|json|pdf|png|svg|webp)(?:[?#]|$)/i;

/** Add this build's cache-busting query value without disturbing a hash. */
export function versionResourceUrl(url) {
  if (typeof url !== "string" || !url || !RESOURCE_PATH.test(url)) return url;

  const hashIndex = url.indexOf("#");
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}v=${encodeURIComponent(BUILD_VERSION)}${hash}`;
}

/** Version resource URLs nested in API/static JSON while preserving its shape. */
export function versionResourceUrls(value) {
  if (typeof value === "string") return versionResourceUrl(value);
  if (Array.isArray(value)) return value.map(versionResourceUrls);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, versionResourceUrls(item)])
    );
  }
  return value;
}
