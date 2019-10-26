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

export function parseVar(context, data) {
  return name => {
    if (typeof name === 'string') {
      const unwrapped = unwrap(name, '"') || unwrap(name, "'");
      if (unwrapped) {
        name = unwrapped;
      } else if (name[0] === '@' && (name = name.slice(1)) && name in data) {
        name = data[name];
      } else {
        name = objectPath(name, context);
      }
    }
    return name;
  };
}

export function objectPath(paths, obj) {
  paths = paths.split('.');
  let val = obj;
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

const badChars = /[&<>"'`=]/g,
  possible = /[&<>"'`=]/;

function escapeChar(chr) {
  return escape[chr];
}

/**
 * Escape an expression, aka make HTML characters safe.
 *
 * This is different from Handlebars because some expressions are better left
 * in its original type for further processing. Numbers, objects, booleans.
 *
 * @param  {*} string
 * @return {*}
 */
export function escapeExpression(string) {
  if (string == null) return '';

  if (string && string.toHTML) {
    return string.toHTML();
  }

  const type = typeof string;
  if (type === 'number' || type === 'boolean' || type === 'object') {
    return string;
  }

  if (type !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (!string) {
      return string + '';
    }
    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = '' + string;
  }

  if (!possible.test(string)) {
    return string;
  }
  return string.replace(badChars, escapeChar);
}

// Build out our basic SafeString type
export function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = SafeString.prototype.toHTML = function() {
  return '' + this.string;
};
