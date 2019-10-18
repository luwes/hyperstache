# Hyperstache

[Handlebars](https://github.com/wycats/handlebars.js/) to template literals transformer. Around 1.3kB gzipped.

**npm**: `npm install hyperstache --save`  
**cdn**: https://unpkg.com/hyperstache  
**module**: https://unpkg.com/hyperstache?module

## Features

- [x] variables `{{escaped}}`, `{{{unescaped}}}`
- [x] variables dot notation `{{obj.prop}}`
- [x] helpers `{{loud lastname}}`
- [x] helpers literal arguments; numbers, strings, true, false, null and undefined
- [ ] helpers hash arguments
- [ ] subexpressions
- [x] basic block helpers `{{#bold}}`
- [ ] built-in helpers `if`, `unless`, `each`, `with`
- [ ] comments `{{!comment}}`
- [ ] partials `{{>partial}}`

## Usage

```js
import { compile } from 'hyperstache';

const template = compile`<div>{{handlebars}}</div>`;
console.log(template({ handlebars: 'Hyper&' })); 

// => [['<div>', '</div>'], 'Hyper&amp;']
```
