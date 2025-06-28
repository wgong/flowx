const { build } = require('esbuild');

// Plugin to strip "npm:" prefixes
const stripNpmPrefixPlugin = {
  name: 'strip-npm-prefix',
  setup(build) {
    build.onResolve({ filter: /^npm:/ }, args => {
      return {
        path: args.path.substring(4), // Remove "npm:"
        external: true,
      };
    });
  },
};

// Plugin to exclude problematic native modules
const excludeNativeModulesPlugin = {
  name: 'exclude-native-modules',
  setup(build) {
    build.onResolve({ filter: /^node-pty$/ }, () => {
      return { path: 'node-pty', external: true, sideEffects: false };
    });
  },
};

// Plugin to mark all other non-relative paths as external
const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^./]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }));
  },
};

(async () => {
  try {
    await build({
      entryPoints: ['src/cli/main.ts'],
      bundle: true,
      platform: 'node',
      outfile: 'dist/main.js',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    console.log('Build finished successfully!');
  } catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
  }
})(); 