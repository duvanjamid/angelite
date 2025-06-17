import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/lagunlar.js',
  output: [
    {
      file: 'dist/lagunlar.js',
      format: 'iife',
      name: 'Lagunlar',
      sourcemap: true
    },
    {
      file: 'dist/lagunlar.min.js',
      format: 'iife',
      name: 'Lagunlar',
      plugins: [terser()],
      sourcemap: true
    },
    {
      file: 'dist/lagunlar.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ]
};
