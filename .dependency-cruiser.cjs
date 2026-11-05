/** Rete di sicurezza per ciò che ESLint vede male: i cicli. Si lancia con: npx depcruise src --config .dependency-cruiser.cjs */
module.exports = {
  forbidden: [
    { name: "features-not-to-features", severity: "error",
      from: { path: "^src/features/([^/]+)/" }, to: { path: "^src/features/", pathNot: "^src/features/$1/" } },
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
  ],
  options: { tsConfig: { fileName: "tsconfig.json" }, doNotFollow: { path: "node_modules" }, exclude: { path: "\\.next" } },
};
