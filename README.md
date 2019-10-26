# Hyperstache

[![Build Status](https://img.shields.io/travis/com/luwes/hyperstache/master.svg?style=flat-square&label=Travis+CI)](https://travis-ci.com/luwes/hyperstache)
![Badge size](https://img.badgesize.io/https://unpkg.com/hyperstache/dist/hyperstache.js?compression=gzip&label=gzip&style=flat-square)
[![codecov](https://img.shields.io/codecov/c/github/luwes/hyperstache.svg?style=flat-square)](https://codecov.io/gh/luwes/hyperstache)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

[Handlebars](https://github.com/wycats/handlebars.js/) to template literals transformer.

**npm**: `npm install hyperstache --save`  
**cdn**: https://unpkg.com/hyperstache  
**module**: https://unpkg.com/hyperstache?module

## `hyperstache` by the numbers:

🚙 **<2kB** when used directly in the browser

🏍 **1.5kB** `hyperstache/mini` version

🏎 **1kB** if compiled using [babel-plugin-hyperstache](./packages/babel-plugin-hyperstache)

## Features

- [x] variables `{{escaped}}`, `{{{unescaped}}}`
- [x] variables dot notation `{{obj.prop}}`
- [x] helpers `{{loud lastname}}`
- [x] helpers literal arguments: `numbers`, `strings`, `true`, `false`, `null` and `undefined`
- [x] basic block helpers `{{#bold}}`
- [x] built-in helpers: `if`, `unless`, `each`, `with`
- [x] helper hash arguments
- [x] comments `{{!comment}}`, `{{!-- comment with }} --}}`
- [ ] helper block parameters
- [ ] subexpressions
- [ ] partials `{{>partial}}`

## Usage ([CodeSandbox](https://codesandbox.io/s/boring-breeze-y3od0))

```js
import { compile } from "hyperstache";

const o = (...args) => args;
const template = compile.bind(o)`
  <p>
    Hello, my name is {{name}}. 
    I am from {{hometown}}. I have {{kids.length}} kids:
  </p>
  <ul>
    {{#each kids}}
      <li>{{name}} is {{age}}</li>
    {{/kids}}
  </ul>
`;

const data = {
  name: "Alan",
  hometown: "Somewhere, TX",
  kids: [{ name: "Jimmy", age: "12" }, { name: "Sally", age: "4" }]
};
console.log(template(data));

/** =>
[
  [
    "<p>↵    Hello, my name is ",
    ". ↵    I am from ",
    ". I have ",
    " kids:↵  </p>↵  <ul>",
    "</ul>"
  ],
  "Alan",
  "Somewhere, TX",
  2,
  [
    ["", "", ""],
    [
      ["<li>", " is ", "</li>"],
      "Jimmy",
      "12"
    ],
    [
      ["<li>", " is ", "</li>"],
      "Sally",
      "4"
    ]
  ]
]
 */
```

## API

`compile(statics, ...exprs)`

`registerHelper(name, fn)`

`escapeExpression(str)`

`new SafeString(htmlStr)`

## Real world ([CodeSandbox](https://codesandbox.io/s/damp-wave-5j4u9))

```js
import { html } from "sinuous";
import { compile } from "hyperstache";

const template = compile.bind(html)`
  <p>
    Hello, my name is {{name}}. 
    I am from {{hometown}}. I have {{kids.length}} kids:
  </p>
  <ul>
    {{#each kids}}
      <li>{{name}} is {{age}}</li>
    {{/kids}}
  </ul>
`;

const data = {
  name: "Alan",
  hometown: "Somewhere, TX",
  kids: [{ name: "Jimmy", age: "12" }, { name: "Sally", age: "4" }]
};
const dom = template(data);
document.body.append(dom);
```

