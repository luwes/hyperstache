/* Adapted code from Handlebars - MIT License - Yehuda Katz */

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
  return options.fn(context, {
    data: options.data
  });
}

function ifHelper(conditional, options) {
  if (conditional) {
    return options.fn(this);
  } else {
    return options.inverse(this);
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
    }
  }

  if (i === 0) {
    ret = options.inverse(this);
  }

  return ret;
}
