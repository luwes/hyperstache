/* Adapted code from Handlebars - MIT License - Yehuda Katz */

import { isEmpty } from './utils.js';

export const helpers = {
  with: withHelper,
  if: ifHelper,
  unless: unlessHelper,
  each: eachHelper
};

export function registerHelper(name, fn) {
  helpers[name] = fn;
}

function withHelper(context, options) {
  if (typeof context === 'function') { context = context.call(this); }

  return options.fn(context, {
    data: options.data,
    blockParams: [context]
  });
}

function ifHelper(conditional, options) {
  if (typeof conditional === 'function') { conditional = conditional.call(this); }

  // Default behavior is to render the positive path if the value is truthy and not empty.
  // The `includeZero` option may be set to treat the condtional as purely not empty based on the
  // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
  if ((!options.hash.includeZero && !conditional) || isEmpty(conditional)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
}

function unlessHelper(conditional, options) {
  return ifHelper.call(this, conditional, {
    fn: options.inverse,
    inverse: options.fn,
    hash: options.hash
  });
}

function eachHelper(context, options) {
  let i = 0,
    ret = '',
    data = options.data;

  if (typeof context === 'function') { context = context.call(this); }

  function execIteration(field, index, last) {
    if (data) {
      data.key = field;
      data.index = index;
      data.first = index === 0;
      data.last = !!last;
    }

    ret =
      ret +
      options.fn(context[field], {
        data: data,
        blockParams: [context[field], field]
      });
  }

  if (context && typeof context === 'object') {
    if (Array.isArray(context)) {
      for (let j = context.length; i < j; i++) {
        if (i in context) {
          execIteration(i, i, i === context.length - 1);
        }
      }
    } else {
      let priorKey;

      for (let key in context) {
        if (context.hasOwnProperty(key)) {
          // We're running the iterations one step out of sync so we can detect
          // the last iteration without have to scan the object twice and create
          // an itermediate keys array.
          if (priorKey !== undefined) {
            execIteration(priorKey, i - 1);
          }
          priorKey = key;
          i++;
        }
      }
      if (priorKey !== undefined) {
        execIteration(priorKey, i - 1, true);
      }
    }
  }

  if (i === 0) {
    ret = options.inverse(this);
  }

  return ret;
}
