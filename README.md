# Hyperstache

[![Build Status](https://img.shields.io/travis/com/luwes/hyperstache/master.svg?style=flat-square&label=Travis+CI)](https://travis-ci.com/luwes/hyperstache)
![Badge size](https://img.badgesize.io/https://unpkg.com/hyperstache/dist/hyperstache.js?compression=gzip&label=gzip&style=flat-square)
[![codecov](https://img.shields.io/codecov/c/github/luwes/hyperstache.svg?style=flat-square)](https://codecov.io/gh/luwes/hyperstache)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

[Handlebars](https://github.com/wycats/handlebars.js/) to template literals transformer.

**npm**: `npm install hyperstache --save`  
**cdn**: https://unpkg.com/hyperstache  
**module**: https://unpkg.com/hyperstache?module

## Features

- [x] variables `{{escaped}}`, `{{{unescaped}}}`
- [x] variables dot notation `{{obj.prop}}`
- [x] helpers `{{loud lastname}}`
- [x] helpers literal arguments: `numbers`, `strings`, `true`, `false`, `null` and `undefined`
- [ ] subexpressions
- [x] basic block helpers `{{#bold}}`
- [x] built-in helpers: `if`, `unless`, `each`, `with`
- [x] helper hash arguments
- [ ] helper block parameters
- [x] comments `{{!comment}}`, `{{!-- comment with }} --}}`
- [ ] partials `{{>partial}}`

## Usage

```js
import { compile } from 'hyperstache';

const o = (...args) => args;
const template = compile.bind(o)`<div>{{handlebars}}</div>`;
console.log(template({ handlebars: 'Hyper&' })); 

// => [['<div>', '</div>'], 'Hyper&amp;']
```

## API

`compile(statics, ...exprs)`

`registerHelper(name, fn)`

`escapeExpression(str)`

`new SafeString(htmlStr)`

## Real world ([CodeSandbox](https://codesandbox.io/s/serene-feather-ridlp))

```js
import { html, observable } from "sinuous";
import { compile } from "hyperstache";

const literal = `Placed in the middle y'all`;
const counter = observable(0);

const hbs = compile.bind(html);
const template = hbs`
  {{#each comments}}
  <div class="comment{{@index}}">
    <h2>
      {{subject}} 
      {{#if @first}},{{/if}} 
      {{#if @last}}!{{/if}} 
      <span> {{counter}}</span>
    </h2>
    ${literal}
    {{{body}}}
  </div>
  {{/each}}
`;
const el = template({
  comments: [
    { subject: "Hello", body: hbs`<p>World</p>`(), counter },
    { subject: "Handle", body: hbs`<p>Bars</p>`(), counter },
    { subject: "You", body: hbs`<p>will pass!</p>`(), counter }
  ]
});
document.body.append(el);
setInterval(() => counter(counter() + 1), 1000);
```

