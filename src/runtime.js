import { expr, block } from './helpers.js';
import { escapeExpression } from './utils.js';

export { registerHelper, helpers } from './helpers.js';
export { SafeString, createFrame, escapeExpression } from './utils.js';

let depths;

export function template(spec) {
  const container = {
    escape: escapeExpression,
    expr,
    block
  };

  function ret(ctx, opts) {
    if (depths) {
      depths = ctx != depths[0] ?
        [ctx].concat(depths) : depths;
    } else {
      depths = [ctx];
    }

    const result = spec(ctx, opts && opts.data, depths, container);
    depths = null;

    return result;
  }

  return ret;
}
