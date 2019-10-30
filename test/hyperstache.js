import test from 'tape';
import htm from 'htm';
import { compile, registerHelper } from '../src/index.js';

const h = (tag, props, ...children) => ({ tag, props, children });
const html = htm.bind(h);
const hbs = compile.bind(html);

registerHelper('loud', (str) => str.toUpperCase());
registerHelper('sum', (a, b) => a + b);
registerHelper('noop', function(options) {
  return options.fn(this)
});
registerHelper('bold', function(options) {
  return hbs`<b>${options.fn(this)}</b>`();
});
registerHelper('mul', options => options.hash.a * options.hash.b);
registerHelper('pass', options => options.hash.value);

test('simple expressions', t => {
  t.deepEqual(
    hbs`<div>{{mustache}}</div>`({ mustache: 'Hyper&' }),
    { tag: 'div', props: null, children: ['Hyper&amp;'] }
  );
  t.deepEqual(
    hbs`<div>{{mustache}}{{snor}}</div>`({ mustache: 'Hyper&', snor: 9 }),
    { tag: 'div', props: null, children: ['Hyper&amp;', 9] }
  );
  t.deepEqual(
    hbs`<div>{{mustache}} {{snor}}</div>`({ mustache: 'Hyper', snor: 'Handle it' }),
    { tag: 'div', props: null, children: ['Hyper', ' ', 'Handle it'] }
  );
  t.deepEqual(
    hbs`<div>{{mustache}} {{nooper}}</div>`({ mustache: 'Hyper' }),
    { tag: 'div', props: null, children: ['Hyper', ' ', ''] }
  );
  t.deepEqual(
    hbs`<div>${99}{{mustache}}</div>`({ mustache: 'Hyper' }),
    { tag: 'div', props: null, children: [99, 'Hyper'] }
  );
  t.deepEqual(
    hbs`<div>{{mustache}} ${99}</div>`({ mustache: 'Hyper' }),
    { tag: 'div', props: null, children: ['Hyper', ' ', 99] }
  );
  t.deepEqual(
    hbs`<div> ${99} {{mustache}}${99}</div>`({ mustache: 'Hyper' }),
    { tag: 'div', props: null, children: [' ', 99, ' ', 'Hyper', 99] }
  );
  t.end();
});

test('raw expressions', t => {
  t.deepEqual(
    hbs`<div>{{{mustache}}}</div>`({ mustache: '<b>Hyper&son</b>' }),
    { tag: 'div', props: null, children: ['<b>Hyper&son</b>'] }
  );
  t.end();
});

test('nested input objects', t => {
  t.deepEqual(
    hbs`<div>{{person.mustache}}</div>`({ person: { mustache: 'brown' }  }),
    { tag: 'div', props: null, children: ['brown'] }
  );
  t.deepEqual(
    hbs`<div>{{ articles.[2].[#comments] }}</div>`({
      articles: [{}, {}, { '#comments': 5 }]
    }),
    { tag: 'div', props: null, children: [5] }
  );
  t.end();
});

test('simple helpers', t => {
  t.equal(hbs`{{loud "big"}}`(), 'BIG');
  t.deepEqual(
    hbs`<div>{{loud mustache}}</div>`({ mustache: 'Hyper' }),
    { tag: 'div', props: null, children: ['HYPER'] }
  );
  t.deepEqual(hbs` {{sum 1 1}}`(), [' ', 2]);
  t.end();
});

test('simple block helpers', t => {
  t.equal(hbs`{{#noop}}hello{{/noop}}`(), 'hello');
  t.deepEqual(
    hbs`{{#bold}}{{body}}{{/bold}}`({ body: 'hyper' }),
    { tag: 'b', props: null, children: ['hyper'] }
  );
  t.deepEqual(
    hbs`<div>
      {{#bold}}
        {{~body}}
      {{/bold~}}
    </div>`({ body: 'hyper' }),
    h('div', null, h('b', null, 'hyper'))
  );
  t.deepEqual(
    hbs`<div>
      {{#bold~}}
        <span>{{body}}</span>
      {{/bold~}}
    </div>`({ body: 'hyper' }),
    h('div', null, h('b', null, h('span', null, 'hyper')))
  );
  t.end();
});

test('block helpers with args', t => {
  t.deepEqual(
    hbs`
      {{#with story~}}
        <div class="intro">{{{intro}}}</div>
        <div class="body">{{{body}}}</div>
      {{/with~}}
      `({ story: { intro: 'Hello', body: 'World' } }),
    [
      { tag: 'div', props: { class: 'intro' }, children: ['Hello'] },
      { tag: 'div', props: { class: 'body' }, children: ['World'] }
    ]
  );
  t.end();
});

test('if/else/unless without chaining', t => {
  t.deepEqual(hbs`{{#if truthy}}Hello{{/if}}`({ truthy: 1 }), 'Hello');

  t.deepEqual(hbs`{{#if false}}Hello{{else}}Bye{{/if}}`(), 'Bye');

  t.deepEqual(hbs`
    {{#unless license~}}
      WARNING: This entry does not have a license!
    {{/unless~}}
  `({ license: false }), 'WARNING: This entry does not have a license!');

  t.deepEqual(hbs`
    {{#if false}}
      Hello
    {{else}}
      {{#if true}}Bye{{/if}}
    {{/if~}}
  `(), 'Bye');

  t.deepEqual(hbs`
    {{#if false}}
      Hello
    {{else}}
      {{#if false}}
        Hello again
      {{else~}}
        Bye
      {{/if}}
    {{/if~}}
  `(), 'Bye');

  t.end();
});

test('if/else with chaining', t => {
  // no chained variant
  t.deepEqual(hbs`
    {{#if false}}
      Hello 1
    {{else}}
      {{#if true~}}
        Hello 2
      {{else}}
        {{#if false}}
          Hello 3
        {{else}}
          Bye
        {{/if}}
      {{/if}}
    {{/if~}}
  `(), 'Hello 2');

  t.deepEqual(hbs`
    {{#if false}}
      Hello
    {{else if true~}}
      Bye
    {{/if~}}
    `({ truthy: 1 }), 'Bye');

  t.deepEqual(hbs`
    {{#if false}}
      Hello
    {{else if false}}
      Hey again
    {{else if true}}
      {{#if truthy~}}
        Bye
      {{/if}}
    {{/if~}}
    99
    `({ truthy: 1 }), ['Bye', '99']);

  t.deepEqual(hbs`
    {{#if false}}
      Hello
    {{else if false}}
      Hello 2
    {{else if false}}
      Hello 3
    {{else if false}}
      Hello 4
    {{else if true~}}
      Hello 5
    {{else}}
      Bye
    {{/if~}}
    `(), 'Hello 5');

  t.deepEqual(hbs`
    {{#if false}}
      Hello
    {{else if false}}
      Hello 2
    {{else if false}}
      Hello 3
    {{else if false}}
      Hello 4
    {{else if false}}
      Hello 5
    {{else~}}
      Bye
    {{/if~}}
    `(), 'Bye');

  t.deepEqual(hbs`
    {{#if false}}
      Hello
    {{else if true~}}
      Hello 2
    {{else if true}}
      Hello 3
    {{else if true}}
      Hello 4
    {{else if true}}
      Hello 5
    {{else}}
      Bye
    {{/if~}}
    `(), 'Hello 2');

  t.deepEqual(hbs`
    {{#if false}}
      99 licenses
    {{else unless license~}}
      WARNING: This entry does not have a license!
    {{/unless~}}
  `({ license: false }), 'WARNING: This entry does not have a license!');

  t.end();
});

test('template comments', t => {
  t.deepEqual(
    hbs`<div>{{! This comment will not show up in the output}}</div>`(),
    { tag: 'div', props: null, children: [''] }
  );
  t.deepEqual(
    hbs`<div>{{!-- This comment may contain mustaches like }} --}}</div>`(),
    { tag: 'div', props: null, children: [''] }
  );
  t.deepEqual(
    hbs`
      <div>
        {{!-- This comment may contain mustaches like }} --}}
        {{~fruit~}}
      </div>
    `({ fruit: 'Banana' }),
    { tag: 'div', props: null, children: ['', 'Banana'] }
  );
  t.end();
});

test('@data variables', t => {
  const ctx = {};
  t.equals(
    hbs`<div>{{@root}}</div>`(ctx).children[0],
    ctx
  );
  t.end();
});

test('hash params', t => {
  t.deepEqual(hbs` {{mul a=8 b=20}}`(), [' ', 160]);
  t.deepEqual(hbs`{{pass value=33}}`(), 33);
  t.deepEqual(hbs`{{pass value=true}}`(), true);
  t.deepEqual(hbs`{{pass value=false}}`(), false);
  t.deepEqual(hbs`{{pass value=null}}`(), '');
  t.deepEqual(hbs`{{pass value=undefined}}`(), '');
  t.end();
});

test('each over array', t => {
  t.deepEqual(hbs`
    {{#each @root}}
      {{~@root}}
    {{~/each~}}
  `([
    'Item 1',
    'Item 2',
    'Item 3'
  ]),
  [
    'Item 1',
    'Item 2',
    'Item 3'
  ]);

  t.deepEqual(hbs`
    {{#each comments~}}
      <div class="comment{{@index}}">
        <h2>{{subject}}</h2>
        {{~#if @first}},{{/if~}}
        {{~#if @last}}last one{{/if~}}
        {{{body}}}
      </div>
    {{/each~}}
  `({ comments: [
    { subject: 'Hello', body: hbs`<p>World</p>`() },
    { subject: 'Handle', body: hbs`<p>Bars</p>`() },
    { subject: 'You', body: hbs`<p>will pass!</p>`() }
  ] }),
  [
    { tag: 'div', props: { class: 'comment0' }, children: [
      { tag: 'h2', props: null, children: ['Hello'] },
      ',',
      '',
      { tag: 'p', props: null, children: ['World'] }
    ] },
    { tag: 'div', props: { class: 'comment1' }, children: [
      { tag: 'h2', props: null, children: ['Handle'] },
      '',
      '',
      { tag: 'p', props: null, children: ['Bars'] }
    ] },
    { tag: 'div', props: { class: 'comment2' }, children: [
      { tag: 'h2', props: null, children: ['You'] },
      '',
      'last one',
      { tag: 'p', props: null, children: ['will pass!'] }
    ] }
  ]
  );

  t.deepEqual(hbs`
    {{#each comments}}
      <div class="comment">
        <h2>{{subject}}</h2>
        {{{body}}}
      </div>
    {{else~}}
      no dice
    {{/each~}}
  `({ comments: [] }), 'no dice'
  );

  t.end();
});

test('each over object', t => {
  t.deepEqual(hbs`
    <ul>{{#each list}}<li>{{name}}</li>{{else}}no dice{{/each}}</ul>
  `({ list: {
      item1: { name: 'John' },
      item2: { name: 'Frank' }
    } }), { tag: 'ul', props: null, children: [ [
      { tag: 'li', props: null, children: [ 'John' ] },
      { tag: 'li', props: null, children: [ 'Frank' ] } ] ] }
  );
  t.end();
});

test('Deeply Nested Contexts', t => {
  t.deepEqual(hbs`
{{~#a}}
{{one}}
{{#b}}
{{one}}{{two}}{{one}}
{{#c}}
{{one}}{{two}}{{three}}{{two}}{{one}}
{{#d}}
{{one}}{{two}}{{three}}{{four}}{{three}}{{two}}{{one}}
{{#e}}
{{one}}{{two}}{{three}}{{four}}{{five}}{{four}}{{three}}{{two}}{{one}}
{{/e}}
{{one}}{{two}}{{three}}{{four}}{{three}}{{two}}{{one}}
{{/d}}
{{one}}{{two}}{{three}}{{two}}{{one}}
{{/c}}
{{one}}{{two}}{{one}}
{{/b}}
{{one}}
{{/a~}}
  `({
    a: { one: 1 },
    b: { two: 2 },
    c: { three: 3 },
    d: { four: 4 },
    e: { five: 5 }
  }), [ 1,
      [ 1, 2, 1,
        [ 1, 2, 3, 2, 1,
          [ 1, 2, 3, 4, 3, 2, 1,
            [ 1, 2, 3, 4, 5, 4, 3, 2, 1 ],
          1, 2, 3, 4, 3, 2, 1
        ], 1, 2, 3, 2, 1
      ], 1, 2, 1
    ], 1
  ]);
  t.end();
});

test('Falsey sections should have their contents rendered.', (t) => {
  t.deepEqual(
    hbs`{{^boolean}}This should be rendered.{{/boolean}}`({
      boolean: false
    }),
    'This should be rendered.'
  );
  t.end();
});
