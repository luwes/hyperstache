import { build, evaluate } from './build.js';

export { registerHelper } from './helpers.js';
export { escapeExpression, SafeString, createFrame } from './utils.js';

export function compile(statics) {
  const template = build(statics);
  const fields = arguments;
  const h = this;
  return function(context) {
    return evaluate(h, template, fields, context);
  }
}
