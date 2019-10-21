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
- [ ] helper hash arguments
- [ ] helper block parameters
- [x] comments `{{!comment}}`, `{{!-- comment with }} --}}`
- [ ] partials `{{>partial}}`

## Usage

```js
import { compile } from 'hyperstache';

const template = compile`<div>{{handlebars}}</div>`;
console.log(template({ handlebars: 'Hyper&' })); 

// => [['<div>', '</div>'], 'Hyper&amp;']
```
