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
  input: 'src/lite/index.js',
  output: [
    { file: 'dist/angelite-lite.esm.js', format: 'esm' },
    { file: 'dist/angelite-lite.min.js', format: 'iife', name: 'AngeLite', plugins: [terser()] }
  ]
};

const liteId = id => /lite\/index\.js$/.test(id);

const ui = {
  input: 'src/ui/index.js',
  external: liteId,
  output: [
    { file: 'dist/angelite-ui.esm.js', format: 'esm', paths: () => './angelite-lite.esm.js' },
    { file: 'dist/angelite-ui.min.js', format: 'iife', name: 'AngeLiteUI', globals: () => 'AngeLite', plugins: [terser()] }
  ]
};

export default [full, lite, ui];
