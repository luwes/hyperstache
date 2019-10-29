/* Some code from Handlebars - MIT License - Yehuda Katz */
import { inspect } from 'util';

export function log(label, ...args) {
  console.log(label, ...args.map(a => inspect(a, { depth: 10, colors: true })));
}

export function extend(obj, props) {
  for (let i in props) obj[i] = props[i];
  return obj;
}

export function createFrame(object) {
  let frame = extend({}, object);
  frame._parent = object;
  return frame;
}

export function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (Array.isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

export function parseLiteral(value) {
  if (value === 'true') {
    value = true;
  } else if (value === 'false') {
    value = false;
  } else if (value === 'null') {
    value = null;
  } else if (value === 'undefined') {
    value = undefined;
  } else if (!isNaN(+value)) {
    value = +value;
  }
  return value;
}

export function lookup(context, options) {
  const data = options.data;
  const depths = options.depths;
  return name => {
    if (typeof name === 'string') {
      const unwrapped = unwrap(name, '"') || unwrap(name, "'");
      if (unwrapped) {
        return unwrapped;
      } else if (name[0] === '@' && (name = name.slice(1)) && name in data) {
        return data[name];
      } else {
        if (name === '.') {
          return context;
        } else {
          const paths = name.split('.');
          for (let i = 0; i < depths.length; i++) {
            if (depths[i] && objectPath([paths[0]], depths[i]) != null) {
              return objectPath(paths, depths[i]);
            }
          }
          return;
        }
      }
    }
    return name;
  };
}

export function objectPath(paths, val) {
  let idx = 0;
  while (idx < paths.length) {
    if (val == null) {
      return;
    }
    const path =
      unwrap(paths[idx], '"') ||
      unwrap(paths[idx], "'") ||
      unwrap(paths[idx], '[]') ||
      paths[idx];
    val = val[path];
    idx++;
  }
  return val;
}

export function unwrap(str, adfix) {
  return (
    str[0] === adfix[0] &&
    str[str.length - 1] === adfix[adfix.length - 1] &&
    str.slice(1, -1)
  );
}

const escape = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

function escapeChar(chr) {
  return escape[chr];
}

/**
 * Escape an expression, aka make HTML characters safe.
 *
 * This is different from Handlebars because some expressions are better left
 * in its original type for further processing.
 *
 * @param  {*} string
 * @return {*}
 */
export function escapeExpression(string) {
  if (string == null) return '';

  // don't escape SafeStrings, since they're already safe
  if (string && string.toHTML) {
    return string.toHTML();
  }

  if (typeof string !== 'string') {
    return string;
  }

  return string.replace(/[&<>"'`=]/g, escapeChar);
}

// Build out our basic SafeString type
export function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = SafeString.prototype.toHTML = function() {
  return '' + this.string;
};
