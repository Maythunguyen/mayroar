const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// SQLite's browser preview uses WebAssembly and SharedArrayBuffer.
if (!config.resolver.assetExts.includes("wasm"))
  config.resolver.assetExts.push("wasm");
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  return middleware(req, res, next);
};
module.exports = config;
