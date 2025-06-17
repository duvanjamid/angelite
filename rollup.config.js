import { terser } from 'rollup-plugin-terser';

export default {
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
