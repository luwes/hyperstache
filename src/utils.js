/* Some code from Handlebars - MIT License - Yehuda Katz */

export function objectPath(obj, paths) {
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

export function parseArgs(context) {
  return arg => {
    const unwrapped = unwrap(arg, '"') || unwrap(arg, "'");
    if (unwrapped) {
      arg = unwrapped;
    } else if (arg === 'true') {
      arg = true;
    } else if (arg === 'false') {
      arg = false;
    } else if (!isNaN(+arg)) {
      arg = +arg;
    } else if (context && arg in context) {
      arg = context[arg];
    }
    return arg;
  };
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

export function escapeExpression(string) {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
      return '';
    } else if (!string) {
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
