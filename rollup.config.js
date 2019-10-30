/* eslint-env node */
import nodeResolve from 'rollup-plugin-node-resolve';
import builtins from 'rollup-plugin-node-builtins';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';
import bundleSize from 'rollup-plugin-size';
import replace from 'rollup-plugin-replace';

const env = process.env.NODE_ENV;

const terserPlugin = terser({
  sourcemap: true,
  warnings: true,
  compress: {
    passes: 2
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
});

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
    nodeResolve({
      preferBuiltins: true
    }),
    builtins(),
    terserPlugin
  ]
};

const babelPlugin = babel();

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
      babelPlugin
    ]
  },
  {
    ...config,
    output: {
      ...config.output,
      file: 'dist/hyperstache.min.js',
      format: 'iife'
    },
    plugins: [
      ...config.plugins,
      babelPlugin
    ]
  },
  {
    ...config,
    output: {
      ...config.output,
      file: 'module/mini.js',
      format: 'es'
    },
    plugins: [
      ...config.plugins,
      replace({
        delimiters: ['', ''],
        'export const MINI = false;': 'export const MINI = true;'
      })
    ]
  },
  {
    ...config,
    output: {
      ...config.output,
      file: 'dist/mini.js',
      format: 'umd'
    },
    plugins: [
      ...config.plugins,
      replace({
        delimiters: ['', ''],
        'export const MINI = false;': 'export const MINI = true;'
      }),
      babelPlugin
    ]
  },
  {
    ...config,
    output: {
      ...config.output,
      file: 'dist/mini.min.js',
      format: 'iife'
    },
    plugins: [
      ...config.plugins,
      replace({
        delimiters: ['', ''],
        'export const MINI = false;': 'export const MINI = true;'
      }),
      babelPlugin
    ]
  },
  {
    ...config,
    input: 'src/runtime.js',
    output: {
      ...config.output,
      file: 'module/runtime.js',
      format: 'es'
    }
  },
  {
    ...config,
    input: 'src/runtime.js',
    output: {
      ...config.output,
      file: 'dist/runtime.js',
      format: 'umd'
    },
    plugins: [
      ...config.plugins,
      babelPlugin
    ]
  },
  {
    ...config,
    input: 'src/runtime.js',
    output: {
      ...config.output,
      file: 'dist/runtime.min.js',
      format: 'iife'
    },
    plugins: [
      ...config.plugins,
      babelPlugin
    ]
  },
  {
    ...config,
    input: 'src/runtime.js',
    output: {
      ...config.output,
      file: 'module/runtime-mini.js',
      format: 'es'
    },
    plugins: [
      ...config.plugins,
      replace({
        delimiters: ['', ''],
        'export const MINI = false;': 'export const MINI = true;'
      })
    ]
  },
  {
    ...config,
    input: 'src/runtime.js',
    output: {
      ...config.output,
      file: 'dist/runtime-mini.js',
      format: 'umd'
    },
    plugins: [
      ...config.plugins,
      replace({
        delimiters: ['', ''],
        'export const MINI = false;': 'export const MINI = true;'
      }),
      babelPlugin
    ]
  },
  {
    ...config,
    input: 'src/runtime.js',
    output: {
      ...config.output,
      file: 'dist/runtime-mini.min.js',
      format: 'iife'
    },
    plugins: [
      ...config.plugins,
      replace({
        delimiters: ['', ''],
        'export const MINI = false;': 'export const MINI = true;'
      }),
      babelPlugin
    ]
  },
  {
    ...config,
    input: 'packages/babel-plugin-hyperstache/src/index.js',
    output: {
      ...config.output,
      file: 'packages/babel-plugin-hyperstache/module/babel-plugin-hyperstache.js',
      format: 'es'
    }
  },
  {
    ...config,
    input: 'packages/babel-plugin-hyperstache/src/index.js',
    output: {
      ...config.output,
      file: 'packages/babel-plugin-hyperstache/dist/babel-plugin-hyperstache.js',
      format: 'umd'
    }
  },
];
