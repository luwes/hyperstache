/* Adapted from HTM - Apache License 2.0 - Jason Miller, Joachim Viide */

import { helpers } from './helpers.js';
import { escapeExpression, parseVar, parseLiteral, log } from './utils.js';

// const MODE_SLASH = 0;
const MODE_TEXT = 1;
// const MODE_WHITESPACE = 2;
const MODE_EXPR_SET = 3;
const MODE_EXPR_APPEND = 4;

const CHILD_APPEND = 0;
const CHILD_RECURSE = 1;
const EXPR_INVERSE = 2;
const EXPR_BLOCK = 3;
const EXPR_VAR = 4;
const EXPR_RAW = 5;
const EXPR_COMMENT = 6;

export const build = function(statics) {
  let str;
  let mode = MODE_TEXT;
  let expr;
  let buffer = '';
  let lastBuffer = '';
  let quote = '';
  let current = [0];
  let char;
  let openTag = '{{';
  let closeTag = '}}';
  let openSlice;
  let closeSlice;
  let propName;

  // log('STATICS', statics);
  for (let i = 0; i < statics.length; i++) {
    // This can be a SafeString obj, convert to string.
    str = '' + statics[i];

    if (i) {
      if (mode === MODE_TEXT) {
        commit();
        if (!lastBuffer) {
          // Add a split if there is no content before the expression.
          commit('');
        }
      }
      commit(i);
    }

    for (let j = 0; j < str.length; j++) {
      char = str[j];
      openSlice = str.substr(j, openTag.length);
      closeSlice = str.substr(j, closeTag.length);

      if (mode === MODE_TEXT) {
        if (openSlice === openTag) {
          commit();
          if (!lastBuffer) {
            // Add a split if there is no content before the expression.
            commit('');
          }

          expr = EXPR_VAR;
          mode = MODE_EXPR_SET;
          j++;
        } else {
          expr = undefined;
          buffer += char;
        }
      } else if (quote) {
        if (char === quote) {
          quote = '';
        }
        buffer += char;
      } else if (char === '"' || char === "'") {
        quote = char;
        buffer += char;
      } else if (closeSlice === closeTag && str[j + closeTag.length] !== '}') {
        j += closeTag.length - 1;
        if (expr == EXPR_COMMENT) {
          commit('');
          closeTag = '}}';
        } else {
          commit();
          propName = '';
        }
        mode = MODE_TEXT;
      } else if (expr == EXPR_COMMENT) {
        buffer += char;
        if (buffer === '--') {
          closeTag = '--}}';
        }
      } else if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        if (expr === EXPR_INVERSE) {
          // Add `else` chaining.
          // e.g. transforms {{else if }} into {{else}}{{#/if }}
          str = `{{#/${buffer}${str.substr(j)}`; // {{#/ autoclose
          mode = MODE_TEXT;
          j = -1;
          buffer = '';
        } else {
          // Only commit if there is buffer, ignore spaces after `{{`.
          if (buffer) {
            commit();
            propName = '';
          }
        }
      } else if ((!buffer && char === '{') || char === '}') {
        // First `{` after opening expression `{{`.
        expr = EXPR_RAW;
      } else if ((!buffer && char === '!')) {
        expr = EXPR_COMMENT;
      } else if (!buffer && char === '#') {
        // First `#` after opening expression `{{`.
        // [1] is reserved for `if`, [2] for `else`.
        const block = [current];
        current = block[1] = [block];
        block[2] = [block];
        block[3] = str[j + 1] === '/' && ++j; // autoclose
        expr = EXPR_BLOCK;
        mode = MODE_EXPR_SET;
      } else if (char === '=') {
        propName = buffer;
        buffer = '';
      } else if (char === '/') {
        if (current[0][3]) { // autoclose
          str = `}}{{/${str.substr(j + 1)}`;
          j = -1;
        }

        mode = current[0];
        (current = current[0][0]).push(mode, CHILD_RECURSE);
        // mode = MODE_SLASH;
      } else {
        buffer += char;
      }
    }
  }
  commit();
  if (!lastBuffer) {
    // Add a split if there is no content before the expression.
    commit('');
  }

  return current;

  function commit(field) {
    let value;
    if (field != null) {
      value = field;
    } else {
      buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, '');
      if (buffer) value = buffer;
    }

    if (mode === MODE_TEXT && value != null) {
      current.push(value, CHILD_APPEND);
    } else if (mode >= MODE_EXPR_SET && value != null) {
      if (mode === MODE_EXPR_SET) {
        if (buffer === 'else' || buffer === '^') {
          current = current[0][2];
          expr = EXPR_INVERSE;
          mode = MODE_EXPR_SET;
        } else {
          // [..., (var|fn), EXPR, args, hash, ...]
          current.push(value, expr, [], {});
          mode = MODE_EXPR_APPEND;
        }
      } else {
        current[current.length - 3] = expr;
        if (propName) {
          current[current.length - 1][propName] = parseLiteral(value);
        } else {
          current[current.length - 2].push(parseLiteral(value));
        }
      }
    }

    lastBuffer = buffer;
    buffer = '';
  }
};

export const evaluate = (h, built, fields, context, options) => {
  options = options || {
    data: { root: context }
  };

  const statics = [];
  const exprs = [];
  // log('BUILT', built);
  for (let i = 1; i < built.length; i++) {
    const field = built[i];
    // log('FIELD', field);
    const type = built[++i];

    if (typeof field === 'number') {
      exprs.push(fields[field]);
    } else if (type >= EXPR_VAR) {
      const args = built[++i];
      options.hash = built[++i];
      // log('OPTIONS', options, args);

      let value;
      if (helpers[field]) {
        value = helpers[field].apply(
          context,
          args
            .map(parseVar(context, options.data))
            .concat(options)
        );
      } else {
        value = parseVar(context, options.data)(field);
      }

      // log('VALUE', value);
      if (value != null) {
        if (type === EXPR_VAR && typeof value === 'string') {
          value = escapeExpression(value);
        }
        exprs.push(value);
      } else {
        // If the context has no value, push an empty string as expression.
        exprs.push('');
      }
    } else if (type === CHILD_RECURSE) {
      /**
       * field = [
       *   [Circular],
       *   [[Circular], if, 5, [ '@first' ], {}, 'body', 3],          // if block
       *   [[Circular], if, 5, [ '@last' ], {}, 'body', 3, 'End', 1]  // else block
       *  ]
       */
      const fnName = field[1][1];
      if (helpers[fnName]) {
        const results = [];
        const block = ifOrElse => (ctx, options) => {
          // Handlebar helpers expect string operations but `evaluate`
          // returns arrays. Save these arrays in the context `results`, make
          // the helper return a template and fill the var expressions later.
          const count = results.push(
            evaluate(h, ifOrElse, fields, ctx, options)
          );
          return `{{{${count - 1}}}}`;
        };

        // log('ARGUMENTS', args, context);
        const args = field[1][3].map(parseVar(context, options.data));
        args.push({
          // Discard block expression and expression type.
          // Nullify parent array, not needed anymore.
          fn: block([0].concat(field[1].slice(5))),
          // No discard for the else block.
          inverse: block(field[2]),
          data: options.data,
          hash: field[1][4]
        });

        const template = helpers[fnName].apply(context, args);
        // log('TEMPLATE', template);
        // log('RESULTS', results);
        const result = evaluate(h, build([template]), [], results);
        exprs.push(result);
      } else {
        // If no helper is found, push an empty string as expression.
        exprs.push('');
      }
    } else {
      // code === CHILD_APPEND
      statics.push(field);
    }
  }

  const args = [statics].concat(exprs);
  // log('ARGS', args);
  return h.apply(null, args);
};
