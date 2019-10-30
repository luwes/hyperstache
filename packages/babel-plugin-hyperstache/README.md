# `babel-plugin-hyperstache`

A Babel plugin to pre-compile handlebars.

## Usage

Basic usage:

```js
[
  ["hyperstache", {
    "tag": "hbs",
    "tagOut": "html",
    "runtime": "hyperstache/runtime"
  }]
]
```

```js
// input:
hbs`<div id=hello>{{fruit}}</div>`({ fruit: 'Apple' });

// output:
const { template } = require("hyperstache/runtime");

template((hys,ctx,data) => html`<div id=hello>${
  hys.escape(hys.expr("fruit",ctx,{data}))
}</div>`)({ fruit: 'Apple' });
```

## options

### `tag=hbs`

By default, `babel-plugin-hyperstache` will process all Tagged Templates with a tag function named `hbs`. To use a different name, use the `tag` option in your Babel configuration:

```js
{"plugins":[
  ["babel-plugin-hyperstache", {
    "tag": "myCustomHbsFunction"
  }]
]}
```

### `tagOut=html`

The output tag given to Tagged Templates for further processing.

```js
{"plugins":[
  ["babel-plugin-hyperstache", {
    "tagOut": "myCustomHtmlFunction"
  }]
]}
```
