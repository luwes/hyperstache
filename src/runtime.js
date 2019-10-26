import { expr, block } from './helpers.js';
import { escapeExpression } from './utils.js';

export { registerHelper, helpers } from './helpers.js';
export {
  SafeString,
  createFrame,
  parseVar,
  escapeExpression
} from './utils.js';

export function template(spec) {
  const container = {
    escape: escapeExpression,
    expr,
    block
  };

  function ret(ctx, opts) {
    return spec(container, ctx, opts && opts.data);
  }

  return ret;
}
