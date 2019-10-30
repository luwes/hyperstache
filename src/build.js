/* Adapted from HTM - Apache License 2.0 - Jason Miller, Joachim Viide */

import { expr, block } from './helpers.js';
import { escapeExpression, parseLiteral, log } from './utils.js';

const MODE_TEXT = 0;
const MODE_EXPR_SET = 1;
const MODE_EXPR_APPEND = 2;

const TEXT = 0;
export const CHILD_RECURSE = 1;
const EXPR_INVERSE = 2;
const EXPR_BLOCK = 3;
export const EXPR_VAR = 4;
const EXPR_RAW = 5;
const EXPR_COMMENT = 6;

export const build = function(statics) {
  let str;
  let char;
  let mode = MODE_TEXT;
  let expr;
  let buffer = '';
  let lastBuffer;
  let quote;
  let current = [0];
  let closeEnd;
  let propName;
  let line = [current]; // Keeps track of `current` arrays per line.
  let lines = line; // Keeps track of all `current` arrays.
  let hasTag; // Is there a {{tag}} on the current line?
  let nonSpace; // Is there a non-space char on the current line?
  let isWhiteSpace; // Is current character a space?
  let skipWhiteSpace;

  // log('STATICS', statics);
  for (let i = 0; i < statics.length; i++) {
    str = statics[i];

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
      isWhiteSpace = /\s/.test(char);

      if (mode === MODE_TEXT) {
        if (char === '{' && str[j + 1] === '{') {
          skipWhiteSpace = false;

          commit();
          if (!lastBuffer) {
            // Add a split if there is no content before the expression.
            commit('');
          }

          hasTag = true;
          expr = EXPR_VAR;
          mode = MODE_EXPR_SET;
          j++;
        } else {
          if (!isWhiteSpace) {
            nonSpace = true;
            skipWhiteSpace = false;
          }

          if (!skipWhiteSpace || !isWhiteSpace) {
            buffer += char;
          }

          if (char === '\n') {
            stripSpace();

            // Keep track of more linear arrays for whitespace control.
            lines = lines.concat(line);
            line = [current];
          }

          expr = undefined;
        }
      } else if (
        (!closeEnd || buffer === closeEnd) &&
        char === '}' &&
        str[j + 1] === '}' &&
        str[j + 2] !== '}'
      ) {
        if (expr === EXPR_VAR || expr === EXPR_RAW) {
          nonSpace = true;
        }

        if (expr === EXPR_COMMENT) {
          commit('');
        } else {
          commit();
        }

        closeEnd = false;
        mode = MODE_TEXT;
        j++;
      } else if (expr === EXPR_COMMENT) {
        // Just keep track of 2 characters.
        buffer = str[j - 1] + char;
        if (buffer === '--') {
          closeEnd = buffer;
        }
      } else if (quote) {
        if (char === quote) {
          quote = '';
        }
        buffer += char;
      } else if (char === '"' || char === "'") {
        quote = char;
        buffer += char;
      } else if (isWhiteSpace) {
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
      } else if (char === '~' && str[j + 1] === '}') {
        skipWhiteSpace = true;
      } else if (!buffer && char === '~') {
        // Remove previous whitespace until a tag or non space character.
        eachToken(lines, (type, field, i, curr) => {
          if (
            type > TEXT ||
            (type === TEXT && (curr[i] = field.replace(/\s*$/, '')))
          ) {
            return true;
          }
        });
      } else if ((!buffer && (char === '{' || char === '&')) || char === '}') {
        // First `{` after opening expression `{{`.
        expr = EXPR_RAW;
        nonSpace = true;
      } else if (!buffer && char === '!') {
        expr = EXPR_COMMENT;
      } else if (!buffer && (char === '#' || char === '^')) {
        // First `#` after opening expression `{{`.

        // [1] is reserved for `if`, [2] for `else`.
        const block = [current];
        current = block[1] = [block];
        line.push(current);
        block[2] = [block];
        block[3] = char === '^';
        block[4] = str[j + 1] === '/' && ++j; // autoclose

        expr = EXPR_BLOCK;
        mode = MODE_EXPR_SET;
      } else if (char === '=') {
        propName = buffer;
        buffer = '';
      } else if (char === '/') {
        if (current[0][4]) {
          // autoclose
          str = `}}{{/${str.substr(j + 1)}`;
          j = -1;
        }

        mode = current[0];
        (current = current[0][0]).push(mode, CHILD_RECURSE);

        expr = EXPR_BLOCK;
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

  stripSpace();
  return current;

  function commit(field) {
    if (mode === MODE_TEXT && (field != null || buffer)) {
      current.push(field != null ? field : buffer, TEXT);
    } else if (mode >= MODE_EXPR_SET && (field != null || buffer)) {
      if (mode === MODE_EXPR_SET) {
        if (buffer === 'else' || buffer === '^') {
          current = current[0][2];
          line.push(current);

          expr = EXPR_INVERSE;
          mode = MODE_EXPR_SET;
        } else {
          // [..., (var|fn), EXPR, args, hash, ...]
          current.push(field != null ? field : buffer, expr, [], {});
          mode = MODE_EXPR_APPEND;
        }
      } else {
        // mode = MODE_EXPR_APPEND;
        current[current.length - 3] = expr;
        if (propName) {
          current[current.length - 1][propName] = parseLiteral(buffer);
        } else {
          current[current.length - 2].push(parseLiteral(buffer));
        }
      }
    }

    lastBuffer = buffer;
    buffer = '';
  }

  function stripSpace() {
    if (hasTag && !nonSpace) {
      buffer = buffer.replace(/\r?\n$/, '');

      // Remove whitespace until \n or non space characters.
      eachToken(line, (type, field, i, curr) => {
        if (type === TEXT && (curr[i] = field.replace(/[^\S\n]*$/, ''))) {
          return true;
        }
      });
    }

    nonSpace = false;
    hasTag = false;
  }
};

function eachToken(currents, fn) {
  for (let i = currents.length; i--; ) {
    for (let j = currents[i].length; j > 2; ) {
      if (fn(currents[i][--j], currents[i][--j], j, currents[i])) {
        return;
      }
    }
  }
}

export const evaluate = (h, built, fields, context, data, depths) => {
  depths = depths || [context];

  const statics = [];
  const exprs = [];
  let value;

  // log('BUILT', built);
  for (let i = 1; i < built.length; i++) {
    const field = built[i];
    // log('FIELD', field);
    const type = built[++i];

    if (type >= EXPR_VAR) {
      value = expr(field, context, {
        params: built[++i],
        hash: built[++i],
        data,
        depths
      });
      // log('VALUE', value);

      if (value != null) {
        if (type === EXPR_VAR) {
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
       *   [parent],
       *   [[parent], if, 5, ['@first'], { hash: param }, 'body', 3], // if block
       *   [[parent], if, 5, ['@last'], {}, 'body', 3, 'End', 1]      // else block
       *  ]
       */
      const makeFun = ifOrElse => (ctx, opts) => {
        depths = ctx != depths[0] ? [ctx].concat(depths) : depths;
        return evaluate(h, ifOrElse, fields, ctx, opts && opts.data, depths);
      };

      value = block(field[1][1], context, {
        fn: makeFun([0].concat(field[1].slice(5))),
        inverse: makeFun(field[2]),
        params: field[1][3],
        hash: field[1][4],
        inverted: field[3],
        data,
        depths
      });

      if (value) {
        // log('RESULT', value);
        exprs.push(value);
      } else {
        // If the result is empty, push an empty string as expression.
        exprs.push('');
      }
    } else if (typeof field === 'number') {
      exprs.push(fields[field]);
    } else  {
      // type === TEXT
      statics.push(field);
    }
  }

  const args = [statics].concat(exprs);
  // log('ARGS', args);
  return h.apply(null, args);
};
