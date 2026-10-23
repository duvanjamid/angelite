import { terser } from 'rollup-plugin-terser';

const full = {
  input: 'src/angelite.js',
  output: [
    {
      file: 'dist/angelite.js',
      format: 'iife',
      name: 'AngeLite',
      sourcemap: true
    },
    {
      file: 'dist/angelite.min.js',
      format: 'iife',
      name: 'AngeLite',
      plugins: [terser()],
      sourcemap: true
    },
    {
      file: 'dist/angelite.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ]
};

const lite = {
  input: 'src/lite/full.js',
  output: [
    { file: 'dist/angelite-lite.esm.js', format: 'esm' },
    { file: 'dist/angelite-lite.min.js', format: 'iife', name: 'AngeLite', plugins: [terser()] }
  ]
};

const liteId = id => /lite\/(index|full)\.js$/.test(id);

const ui = {
  input: 'src/ui/index.js',
  external: liteId,
  output: [
    { file: 'dist/angelite-ui.esm.js', format: 'esm', paths: () => './angelite-lite.esm.js' },
    { file: 'dist/angelite-ui.min.js', format: 'iife', name: 'AngeLiteUI', globals: () => 'AngeLite', plugins: [terser()] }
  ]
};

// runtime only (no template compiler): for precompiled templates, see tools/aot.mjs
const runtime = {
  input: 'src/lite/api.js',
  output: [
    { file: 'dist/angelite-runtime.esm.js', format: 'esm' },
    { file: 'dist/angelite-runtime.min.js', format: 'iife', name: 'AngeLite', plugins: [terser()] }
  ]
};

// built-in pipes for the runtime-only build: shares the runtime's pipe registry
const pipesBuild = {
  input: 'src/lite/pipes.js',
  external: id => /lite\/runtime\.js$/.test(id),
  output: { file: 'dist/angelite-pipes.esm.js', format: 'esm', paths: () => './angelite-runtime.esm.js' }
};

// runtime-only plus portals, @defer, template refs and dev warnings
const runtimePlus = {
  input: 'src/lite/runtime-plus.js',
  output: [
    { file: 'dist/angelite-runtime-plus.esm.js', format: 'esm' },
    { file: 'dist/angelite-runtime-plus.min.js', format: 'iife', name: 'AngeLite', plugins: [terser()] }
  ]
};

// test helpers: share the lite bundle's runtime
const testing = {
  input: 'src/lite/testing.js',
  external: id => /lite\/runtime\.js$/.test(id),
  output: { file: 'dist/angelite-testing.esm.js', format: 'esm', paths: () => './angelite-lite.esm.js' }
};

// optional modules that build on the lite bundle: they import signals/runtime from it, so there is one reactive core
const addons = {
  input: {
    'angelite-forms': 'src/lite/forms.js',
    'angelite-http': 'src/lite/http.js',
    'angelite-i18n': 'src/lite/i18n.js',
    'angelite-devtools': 'src/lite/devtools.js',
    'angelite-hydrate': 'src/lite/hydrate.js'
  },
  external: id => /lite\/(signals|runtime)\.js$/.test(id),
  output: { dir: 'dist', format: 'esm', entryFileNames: '[name].esm.js', paths: () => './angelite-lite.esm.js' }
};

// the same add-ons as one <script>: global AngeLiteAddons, reading its signals from the global AngeLite (lite bundle)
const addonsScript = {
  input: 'src/lite/addons.js',
  external: id => /lite\/(signals|runtime)\.js$/.test(id),
  output: { file: 'dist/angelite-addons.min.js', format: 'iife', name: 'AngeLiteAddons', globals: () => 'AngeLite', plugins: [terser()] }
};

export default [full, lite, runtime, runtimePlus, pipesBuild, testing, addons, addonsScript, ui];
