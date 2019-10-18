/* eslint-env node */
import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';
import bundleSize from 'rollup-plugin-size';

const env = process.env.NODE_ENV;
const config = {
  input: 'src/index.js',
  output: {
    format: env,
    name: 'hyperstache',
    strict: false, // Remove `use strict;`
    interop: false, // Remove `r=r&&r.hasOwnProperty("default")?r.default:r;`
    freeze: false, // Remove `Object.freeze()`
    esModule: false // Remove `esModule` property
  },
  plugins: [
    bundleSize(),
    nodeResolve()
  ]
};

export default [
  {
    ...config,
    output: {
      ...config.output,
      file: 'module/hyperstache.js',
      format: 'es'
    }
  },
  {
    ...config,
    output: {
      ...config.output,
      file: 'dist/hyperstache.js',
      format: 'umd'
    },
    plugins: [
      ...config.plugins,
      babel(),
      terser({
        sourcemap: true,
        warnings: true,
        compress: {
          passes: 10
        },
        mangle: {
          properties: {
            regex: /^_/
          }
        },
        nameCache: {
          props: {
            cname: 6,
            props: {
              // $_tag: '__t',
            }
          }
        }
      })
    ]
  }
];
