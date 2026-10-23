import { terser } from 'rollup-plugin-terser';

const core = {
  input: 'src/full.js',
  output: [
    { file: 'dist/angelite.esm.js', format: 'esm' },
    { file: 'dist/angelite.min.js', format: 'iife', name: 'AngeLite', plugins: [terser()] }
  ]
};

const coreId = id => /src\/(index|full)\.js$/.test(id);

const ui = {
  input: 'src/ui/index.js',
  external: coreId,
  output: [
    { file: 'dist/angelite-ui.esm.js', format: 'esm', paths: () => './angelite.esm.js' },
    { file: 'dist/angelite-ui.min.js', format: 'iife', name: 'AngeLiteUI', globals: () => 'AngeLite', plugins: [terser()] }
  ]
};

// runtime only (no template compiler): for precompiled templates, see tools/aot.mjs
const runtime = {
  input: 'src/api.js',
  output: [
    { file: 'dist/angelite-runtime.esm.js', format: 'esm' },
    { file: 'dist/angelite-runtime.min.js', format: 'iife', name: 'AngeLite', plugins: [terser()] }
  ]
};

// built-in pipes for the runtime-only build: shares the runtime's pipe registry
const pipesBuild = {
  input: 'src/pipes.js',
  external: id => /src\/runtime\.js$/.test(id),
  output: { file: 'dist/angelite-pipes.esm.js', format: 'esm', paths: () => './angelite-runtime.esm.js' }
};

// runtime-only plus portals, @defer, template refs and dev warnings
const runtimePlus = {
  input: 'src/runtime-plus.js',
  output: [
    { file: 'dist/angelite-runtime-plus.esm.js', format: 'esm' },
    { file: 'dist/angelite-runtime-plus.min.js', format: 'iife', name: 'AngeLite', plugins: [terser()] }
  ]
};

// test helpers: share the main bundle's runtime
const testing = {
  input: 'src/testing.js',
  external: id => /src\/runtime\.js$/.test(id),
  output: { file: 'dist/angelite-testing.esm.js', format: 'esm', paths: () => './angelite.esm.js' }
};

// optional modules that build on the main bundle: they import signals/runtime from it, so there is one reactive core
const addons = {
  input: {
    'angelite-forms': 'src/forms.js',
    'angelite-http': 'src/http.js',
    'angelite-i18n': 'src/i18n.js',
    'angelite-devtools': 'src/devtools.js',
    'angelite-hydrate': 'src/hydrate.js'
  },
  external: id => /src\/(signals|runtime)\.js$/.test(id),
  output: { dir: 'dist', format: 'esm', entryFileNames: '[name].esm.js', paths: () => './angelite.esm.js' }
};

// the same add-ons as one <script>: global AngeLiteAddons, reading its signals from the global AngeLite (main bundle)
const addonsScript = {
  input: 'src/addons.js',
  external: id => /src\/(signals|runtime)\.js$/.test(id),
  output: { file: 'dist/angelite-addons.min.js', format: 'iife', name: 'AngeLiteAddons', globals: () => 'AngeLite', plugins: [terser()] }
};

export default [core, runtime, runtimePlus, pipesBuild, testing, addons, addonsScript, ui];
