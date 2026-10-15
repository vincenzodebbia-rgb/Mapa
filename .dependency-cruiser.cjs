/** Safety net for what ESLint sees poorly: cycles. Run: npx depcruise src --config .dependency-cruiser.cjs */
module.exports = {
  forbidden: [
    { name: "features-not-to-features", severity: "error",
      from: { path: "^src/features/([^/]+)/" }, to: { path: "^src/features/", pathNot: "^src/features/$1/" } },
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
  ],
  options: { tsConfig: { fileName: "tsconfig.json" }, doNotFollow: { path: "node_modules" }, exclude: { path: "\\.next" } },
};
