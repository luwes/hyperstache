import fs from 'fs';
import path from 'path';
import test from 'tape';
import { transform } from '@babel/core';
import hysBabelPlugin from '../src/index.js';

const options = {
  babelrc: false,
  configFile: false,
  sourceType: 'script',
  compact: true
};

const out = (result) => 'const{template}=require("hyperstache/runtime");' + result;

test('basic transformation', t => {
  t.equal(
    transform('hbs`<div id=hello>${"hello"}</div>`;', {
      ...options,
      plugins: [hysBabelPlugin]
    }).code,
    out('template((ctx,data,depths,hys)=>html`<div id=hello>${"hello"}</div>`);')
  );
  t.equal(
    transform('hbs`<div id=hello>{{"hello"}}</div>`;', {
      ...options,
      plugins: [hysBabelPlugin]
    }).code,
    out('template((ctx,data,depths,hys)=>html`<div id=hello>${hys.escape("hello")}</div>`);')
  );
  t.equal(
    transform('hbs`<div id=hello>{{99}}</div>`;', {
      ...options,
      plugins: [hysBabelPlugin]
    }).code,
    out('template((ctx,data,depths,hys)=>html`<div id=hello>${99}</div>`);')
  );
  t.equal(
    transform('hbs`<div id=hello>{{fruit}}</div>`;', {
      ...options,
      plugins: [hysBabelPlugin]
    }).code,
    out('template((ctx,data,depths,hys)=>html`<div id=hello>${' +
        'hys.escape(hys.expr("fruit",ctx,{' +
          'data,' +
          'depths' +
        '}))' +
      '}</div>`);')
  );
  t.equal(
    transform('hbs`<div id=hello>{{loud "big"}}</div>`;', {
      ...options,
      plugins: [hysBabelPlugin]
    }).code,
    out('template((ctx,data,depths,hys)=>html`<div id=hello>${hys.escape(hys.expr("loud",ctx,{' +
      'params:["\\"big\\""],' +
      'data,' +
      'depths' +
      '}))}</div>`);')
  );
  t.equal(
    transform('hbs`<div id=hello>{{sum a=1 b=1}}</div>`;', {
      ...options,
      plugins: [hysBabelPlugin]
    }).code,
    out('template((ctx,data,depths,hys)=>html`<div id=hello>${hys.escape(hys.expr("sum",ctx,{' +
      'hash:{"a":1,"b":1},' +
      'data,' +
      'depths' +
      '}))}</div>`);')
  );
  t.equal(
    transform('hbs`{{#bold}}{{body}}{{/bold}}`;', {
      ...options,
      plugins: [hysBabelPlugin]
    }).code,
    out('template((ctx,data,depths,hys)=>html`${hys.block("bold",ctx,{' +
        'fn:template((ctx,data,depths)=>html`${hys.escape(hys.expr("body",ctx,{' +
          'data,' +
          'depths' +
        '}))}`),' +
        'data,' +
        'depths' +
      '})}`);')
  );
  t.equal(
    transform('hbs`{{#if true}}99{{else}}11{{/if}}`;', {
      ...options,
      plugins: [hysBabelPlugin]
    }).code,
    out('template((ctx,data,depths,hys)=>html`${hys.block("if",ctx,{' +
      'fn:template((ctx,data,depths)=>html`99`),' +
      'inverse:template((ctx,data,depths)=>html`11`),' +
      'params:[true],' +
      'data,' +
      'depths' +
      '})}`);')
  );
  t.end();
});


// Run all of the main tests against the Babel plugin:
const mod = fs.readFileSync(
  path.resolve(__dirname, '../../../test/hyperstache.js'), 'utf8').replace(/\\0/g, '\0'
);

const runtimeModule = '../../../src/runtime.js';

const source = mod
    .replace("import test from 'tape';", '')
    .replace("import htm from 'htm';", "const htm = require('htm');")
    .replace(
      /^import { compile, (.+?) } from '\.\.\/src\/index\.js';$/mi,
      'const { $1 } = require("' + runtimeModule + '");'
    )
    .replace("const hbs = compile.bind(html);", '');

const { code } = transform(source, {
  ...options,
  plugins: [hysBabelPlugin]
});

eval(
  code.replace(/hyperstache\/runtime/g, runtimeModule)
);
