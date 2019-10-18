/* Adapted from HTM - Apache License 2.0 - Jason Miller */

import { helpers } from './helpers.js';
import { escapeExpression, parseArgs, objectPath } from './utils.js';

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
const EXPR_COMMENT = 6;
const EXPR_SPECIAL_COMMENT = 7;

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

  // console.log('STATICS', statics);
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
      } else if (expr === EXPR_SPECIAL_COMMENT && charHead === '--' && str.substr(j + 2, 2) === '}}') {
        commit();
        mode = MODE_TEXT;
        j += 3;
      } else if (expr !== EXPR_SPECIAL_COMMENT && charHead === '}}' && str[j + 2] !== '}') {
        commit();
        mode = MODE_TEXT;
        j++;
      } else if (MODE_EXPR_APPEND) {
        if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
          // Only commit if there is buffer, ignore spaces after `{{` unless
          // it's a comment.
          if (buffer && expr !== EXPR_COMMENT && expr !== EXPR_SPECIAL_COMMENT) {
            commit();
          }
        } else if (expr !== EXPR_SPECIAL_COMMENT && ((!buffer && char === '{') || char === '}')) {
          // First `{` after opening expression `{{`.
          expr = EXPR_RAW;
        } else if ((!buffer && char === '!')) {
          const isSpecialComment = str.substr(j + 1, 2) === '--';
          if (isSpecialComment) {
            expr = EXPR_SPECIAL_COMMENT
            j += 2;
          } else {
            expr = EXPR_COMMENT
          }

          commit('');
        } else if (!buffer && char === '#') {
          // First `#` after opening expression `{{`.
          current = [current];
          expr = EXPR_BLOCK;
          mode = MODE_EXPR_SET;
        } else if (char === '/') {
          mode = current;
          (current = current[0]).push(mode, CHILD_RECURSE);
          // mode = MODE_SLASH;
        } else if (expr == EXPR_COMMENT || expr == EXPR_SPECIAL_COMMENT) {
          // Ignore comments
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
        current.push(field || buffer, expr);
        mode = MODE_EXPR_APPEND;
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

export const evaluate = (h, built, fields, context) => {
  const statics = [];
  const exprs = [];
  // console.log('BUILT', built);
  for (let i = 1; i < built.length; i++) {
    const field = built[i];
    // console.log('FIELD', field);
    const type = built[++i];

    if (typeof field === 'number') {
      exprs.push(fields[field]);
    } else if (type === EXPR_VAR || type === EXPR_RAW) {
      let value;
      if (typeof field === 'string') {
        value = objectPath(context, field);
      } else {
        // field === Array
        const fnName = field.shift();
        if (helpers[fnName]) {
          value = helpers[fnName].apply(context, field.map(parseArgs(context)));
        }
      }
      // console.log('VALUE', value);
      if (value) {
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
      // field = [ [Circular], 'bold', 5, 'body', 3 ]
      const [fields] = field.splice(1, 2);
      // `fields` can be a function name or array of expression instructions.
      let args = [].concat(fields);
      const fnName = args.shift();
      if (helpers[fnName]) {
        const results = [];
        const fn = ctx => {
          // Handlebar helpers expect string operations but `evaluate`
          // returns arrays. Save these arrays in the context `results`, make
          // the helper return a template and fill the var expressions later.
          const count = results.push(evaluate(h, field, fields, ctx));
          return `{{{${count - 1}}}}`;
        };

        args = args.map(parseArgs(context));
        args.push({ fn });

        const template = helpers[fnName].apply(context, args);
        // console.log('RESULTS', results);
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
  console.log('ARGS', args);
  return h(args);
};
