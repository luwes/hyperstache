/* Adapted code from Handlebars - MIT License - Yehuda Katz */
import { MINI } from './constants.js';
import { isEmpty, createFrame, lookup, log } from './utils.js';

export const helpers = MINI
  ? {}
  : {
      with: withHelper,
      if: ifHelper,
      unless: unlessHelper,
      each: eachHelper
    };

export function expr(field, context, options) {
  options = options || {};
  options.data = options.data || {};
  options.data.root = context;

  return helpers[field]
    ? block(field, context, options)
    : lookup(context, options)(field);
}

export function block(field, context, options) {
  options = options || {};
  options.data = options.data || {};
  options.data.root = context;
  options.params = options.params || [];
  options.hash = options.hash || {};
  options.inverse = options.inverse || (() => '');

  let value;
  if (helpers[field]) {
    value = helpers[field].apply(
      context,
      options.params
        .map(lookup(context, options))
        .concat(options)
    )
  } else {
    value = lookup(context, options)(field);

    if (options.inverted) {
      const tmp = options.fn;
      options.fn = options.inverse;
      options.inverse = tmp;
    }

    if (Array.isArray(value)) {
      options.params = [value];
      return block('each', context, options);
    } else if (
      typeof value === 'object' ||
      typeof value === 'string' ||
      typeof value === 'number'
    ) {
      options.params = [value];
      return block('with', context, options);
    } else {
      options.params = [value];
      return block('if', context, options);
    }
  }

  return value;
}

export function registerHelper(name, fn) {
  helpers[name] = fn;
}

function withHelper(context, options) {
  if (typeof context === 'function') {
    context = context.call(this);
  }

  if (!isEmpty(context)) {
    let data = options.data;

    return options.fn(context, {
      data: data,
      blockParams: [context]
    });
  } else {
    return options.inverse(this);
  }
}

function ifHelper(conditional, options) {
  if (typeof conditional === 'function') {
    conditional = conditional.call(this);
  }

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
    ret = [],
    data;

  if (typeof context === 'function') {
    context = context.call(this);
  }

  if (options.data) {
    data = createFrame(options.data);
  }

  function execIteration(field, index, last) {
    if (data) {
      data.key = field;
      data.index = index;
      data.first = index === 0;
      data.last = !!last;
    }

    ret.push(
      options.fn(context[field], {
        data: data,
        blockParams: [context[field], field]
      })
    );
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
    return options.inverse(this);
  }

  return ret;
}
