/* Adapted from HTM - Apache License 2.0 - Jason Miller, Joachim Viide */

import { helpers } from './helpers.js';
import { escapeExpression, parseArgs, parseVar, log } from './utils.js';

// const MODE_SLASH = 0;
const MODE_TEXT = 1;
// const MODE_WHITESPACE = 2;
const MODE_EXPR_SET = 3;
const MODE_EXPR_APPEND = 4;

const CHILD_APPEND = 0;
const CHILD_RECURSE = 2;
const EXPR_VAR = 3;
const EXPR_RAW = 4;
const EXPR_BLOCK = 5;
const EXPR_INVERSE = 6;

export const build = function(statics) {
  let str;
  let mode = MODE_TEXT;
  let expr;
  let buffer = '';
  let lastBuffer = '';
  let quote = '';
  let current = [0];
  let char;
  let charHead; // current + next char

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
      charHead = char + str[j + 1];

      if (mode === MODE_TEXT) {
        if (charHead === '{{') {
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
      } else if (charHead === '}}' && str[j + 2] !== '}') {
        commit();
        mode = MODE_TEXT;
        j++;
      } else if (MODE_EXPR_APPEND) {
        if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
          if (expr === EXPR_INVERSE) {
            // Add `else` chaining.
            // e.g. transforms {{else if }} into {{else}}{{#if }}
            str = ' {{#' + buffer + str.slice(j);
            mode = MODE_TEXT;
            j = 0;
            buffer = '';
          } else {
            // Only commit if there is buffer, ignore spaces after `{{`.
            if (buffer) {
              commit();
            }
          }
        } else if ((!buffer && char === '{') || char === '}') {
          // First `{` after opening expression `{{`.
          expr = EXPR_RAW;
        } else if (!buffer && char === '#') {
          // First `#` after opening expression `{{`.
          // [1] is reserved for `if`, [2] for `else`.
          const block = [current];
          current = block[1] = [block];
          block[2] = [block];
          expr = EXPR_BLOCK;
          mode = MODE_EXPR_SET;
        } else if (char === '/') {
          mode = current[0];
          (current = current[0][0]).push(mode, CHILD_RECURSE);
          // mode = MODE_SLASH;
        } else {
          buffer += char;
        }
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
    buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, '');

    if (mode === MODE_TEXT && (field != null || buffer)) {
      current.push(field || buffer, CHILD_APPEND);
    } else if (mode >= MODE_EXPR_SET && buffer) {
      if (mode === MODE_EXPR_SET) {
        if (buffer === 'else' || buffer === '^') {
          current = current[0][2];
          expr = EXPR_INVERSE;
          mode = MODE_EXPR_SET;
        } else {
          current.push(field || buffer, expr);
          mode = MODE_EXPR_APPEND;
        }
      } else {
        // Merge expression args in an array, they have to be applied
        // to a function later anyway. Array creation is inevitable.
        current[current.length - 2] = [].concat(
          current[current.length - 2],
          field || buffer
        );
        current[current.length - 1] = expr;
      }
    }

    lastBuffer = buffer;
    buffer = '';
  }
};

export const evaluate = (h, built, fields, context, options) => {
  const statics = [];
  const exprs = [];
  // log('BUILT', built);
  for (let i = 1; i < built.length; i++) {
    const field = built[i];
    // log('FIELD', field);
    const type = built[++i];

    if (typeof field === 'number') {
      exprs.push(fields[field]);
    } else if (type === EXPR_VAR || type === EXPR_RAW) {
      let value;
      if (typeof field === 'string') {
        value = parseVar(field, context, options);
      } else {
        // field === Array
        const fnName = field.shift();
        if (helpers[fnName]) {
          value = helpers[fnName].apply(
            context,
            field.map(parseArgs(context, options))
          );
        }
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
      // type === CHILD_RECURSE
      /**
       * field = [
       *   [Circular],
       *   [[Circular], [ 'if', '@first' ], 5, 'body', 3],          // if block
       *   [[Circular], [ 'if', '@last' ], 5, 'body', 3, 'End', 1]  // else block
       *  ]
       */

      // Can be a function name or array of expression instructions.
      let args = [].concat(field[1][1]);
      const fnName = args.shift();
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
        args = args.map(parseArgs(context, options));
        args.push({
          // Discard block expression and expression type. Array elements 2 and 3.
          // Nullify parent array, not needed anymore.
          fn: block([0].concat(field[1].slice(3))),
          // No discard for the else block.
          inverse: block(field[2]),
          data: {}
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
  return h(args);
};
