import test from 'tape';
import htm from 'htm';
import { compile } from '../src/index.js';

const h = (tag, props, ...children) => ({ tag, props, children });
const hh = (args) => htm.apply(h, args);

const hbs = (statics, ...fields) => {
  const hyperstache = compile(statics, ...fields);
  return hyperstache.bind(hh);
}

test('single named elements', t => {
  t.deepEqual(
    hbs`<div />`(),
    { tag: 'div', props: null, children: [] }
  );
  t.deepEqual(
    hbs`<div />`(),
    { tag: 'div', props: null, children: [] }
  );
  t.deepEqual(
    hbs`<span />`(),
    { tag: 'span', props: null, children: [] }
  );
  t.end();
});

test('multiple root elements', t => {
  t.deepEqual(
    hbs`<a /><b></b><c><//>`(),
    [
      { tag: 'a', props: null, children: [] },
      { tag: 'b', props: null, children: [] },
      { tag: 'c', props: null, children: [] }
    ]
  );
  t.end();
});

test('single boolean prop', t => {
  t.deepEqual(
    hbs`<a disabled />`(),
    { tag: 'a', props: { disabled: true }, children: [] }
  );
  t.end();
});

test('two boolean props', t => {
  t.deepEqual(
    hbs`<a invisible disabled />`(),
    { tag: 'a', props: { invisible: true, disabled: true }, children: [] }
  );
  t.end();
});

test('single prop with empty value', t => {
  t.deepEqual(
    hbs`<a href="" />`(),
    { tag: 'a', props: { href: '' }, children: [] }
  );
  t.end();
});

test('two props with empty values', t => {
  t.deepEqual(
    hbs`<a href="" foo="" />`(),
    { tag: 'a', props: { href: '', foo: '' }, children: [] }
  );
  t.end();
});

test('single prop with empty name', t => {
  t.deepEqual(
    hbs`<a ""="foo" />`(),
    { tag: 'a', props: { '': 'foo' }, children: [] }
  );
  t.end();
});

test('single prop with static value', t => {
  t.deepEqual(
    hbs`<a href="/hello" />`(),
    { tag: 'a', props: { href: '/hello' }, children: [] }
  );
  t.end();
});

test('single prop with static value followed by a single boolean prop', t => {
  t.deepEqual(
    hbs`<a href="/hello" b />`(),
    { tag: 'a', props: { href: '/hello', b: true }, children: [] }
  );
  t.end();
});

test('two props with static values', t => {
  t.deepEqual(
    hbs`<a href="/hello" target="_blank" />`(),
    { tag: 'a', props: { href: '/hello', target: '_blank' }, children: [] }
  );
  t.end();
});

test('slash in the middle of tag name or property name self-closes the element', t => {
  t.deepEqual(
    hbs`<ab/ba prop=value>`(),
    { tag: 'ab', props: null, children: [] }
  );
  t.deepEqual(
    hbs`<abba pr/op=value>`(),
    { tag: 'abba', props: { pr: true }, children: [] }
  );
  t.end();
});

test('slash in a property value does not self-closes the element, unless followed by >', t => {
  t.deepEqual(hbs`<abba prop=val/ue><//>`(), {
    tag: 'abba',
    props: { prop: 'val/ue' },
    children: []
  });
  t.deepEqual(
    hbs`<abba prop="value" />`(),
    { tag: 'abba', props: { prop: 'value' }, children: [] }
  );
  t.deepEqual(hbs`<abba prop=value/ ><//>`(), {
    tag: 'abba',
    props: { prop: 'value/' },
    children: []
  });
  t.end();
});

test('closing tag', t => {
  t.deepEqual(
    hbs`<a></a>`(),
    { tag: 'a', props: null, children: [] }
  );
  t.deepEqual(
    hbs`<a b></a>`(),
    { tag: 'a', props: { b: true }, children: [] }
  );
  t.end();
});

test('auto-closing tag', t => {
  t.deepEqual(
    hbs`<a><//>`(),
    { tag: 'a', props: null, children: [] }
  );
  t.end();
});

test('non-element roots', t => {
  t.deepEqual(hbs`${1}`(), 1);
  t.deepEqual(hbs`foo${1}`(), ['foo', 1]);
  t.deepEqual(hbs`foo${1}bar`(), ['foo', 1, 'bar']);
  t.end();
});

test('text child', t => {
  t.deepEqual(
    hbs`<a>foo</a>`(),
    { tag: 'a', props: null, children: ['foo'] }
  );
  t.deepEqual(
    hbs`<a>foo bar</a>`(),
    { tag: 'a', props: null, children: ['foo bar'] }
  );
  t.deepEqual(
    hbs`<a>foo "<b /></a>`(),
    {tag: 'a',props: null,children: ['foo "', { tag: 'b', props: null, children: [] }]
    }
  );
  t.end();
});

test('element child', t => {
  t.deepEqual(
    hbs`<a><b /></a>`(),
    h('a', null, h('b', null))
  );
  t.end();
});

test('multiple element children', t => {
  t.deepEqual(
    hbs`<a><b /><c /></a>`(),
    h('a', null, h('b', null), h('c', null))
  );
  t.deepEqual(
    hbs`<a x><b y/><c z/></a>`(),
    h('a', { x: true }, h('b', { y: true }), h('c', { z: true }))
  );
  t.deepEqual(
    hbs`<a x="1"><b y="2"/><c z="3"/></a>`(),
    h('a', { x: '1' }, h('b', { y: '2' }), h('c', { z: '3' }))
  );
  t.end();
});

test('mixed typed children', t => {
  t.deepEqual(
    hbs`<a>foo<b /></a>`(),
    h('a', null, 'foo', h('b', null))
  );
  t.deepEqual(
    hbs`<a><b />bar</a>`(),
    h('a', null, h('b', null), 'bar')
  );
  t.deepEqual(
    hbs`<a>before<b />after</a>`(),
    h('a', null, 'before', h('b', null), 'after')
  );
  t.deepEqual(
    hbs`<a>before<b x="1" />after</a>`(),
    h('a', null, 'before', h('b', { x: '1' }), 'after')
  );
  t.end();
});

test('hyphens (-) are allowed in attribute names', t => {
  t.deepEqual(
    hbs`<a b-c></a>`(),
    h('a', { 'b-c': true })
  );
  t.end();
});

test('NUL characters are allowed in attribute values', t => {
  t.deepEqual(
    hbs`<a b="\0"></a>`(),
    h('a', { b: '\0' })
  );
  t.end();
});

test('NUL characters are allowed in text', t => {
  t.deepEqual(
    hbs`<a>\0</a>`(),
    h('a', null, '\0')
  );
  t.end();
});

test('ignore html comments', t => {
  t.deepEqual(
    hbs`<a><!-- Hello, world! --></a>`(),
    h('a', null)
  );
  t.deepEqual(
    hbs`<a  ><!-- Hello,
world! --></a>`(),
    h('a', null)
  );
  t.deepEqual(
    hbs`<a><!--> Hello, world <!--></a>`(),
    h('a', null)
  );
  t.end();
});
