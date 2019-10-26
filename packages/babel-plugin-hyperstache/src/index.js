import { build, EXPR_VAR, CHILD_RECURSE } from '../../../src/build.js';
import { unwrap, parseLiteral, log } from '../../../src/utils.js';

/**
 * @param {Babel} babel
 * @param {object} options
 * @param {string} [options.tag=hbs]  The tagged template "tag" function name to process.
 * @param {string} [options.tagOut=html]  The tagged template "tag" function name to output.
 */
export default function hysBabelPlugin({ types: t }, options = {}) {
  function TaggedTemplateExpression(path) {
    const tag = path.node.tag.name;
    if (tag === hbsName) {
      const stats = path.node.quasi.quasis.map(e => e.value.raw);
      const fields = [0, ...path.node.quasi.expressions];

      const built = build(stats);
      // log('BUILT', built);

      const node = evaluate(built, fields);

      // var _hys = require("hyperstache/runtime");
      const runtimeTpl =  t.variableDeclaration(
        'const',
        [
          t.variableDeclarator(
            t.objectPattern([
              t.objectProperty(
                t.identifier('template'),
                t.identifier('template'),
                false,
                true
              )
            ]),
            t.callExpression(
              t.identifier('require'),
              [t.stringLiteral('hyperstache/runtime')]
            )
          )
        ]
      );

      path.replaceWithMultiple([
        runtimeTpl,
        t.expressionStatement(node)
      ]);
    }
  }

  const evaluate = (built, fields) => {
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
        const params = built[++i];
        const hash = built[++i];

        let expr = transform(field);
        // log('EXPR', expr);

        if (t.isIdentifier(expr)) {
          const args = [
            t.stringLiteral(field),
            t.identifier('ctx')
          ];

          const properties = [];
          if (params.length >  0) {
            properties.push(t.objectProperty(
              t.identifier('params'),
              t.arrayExpression(params.map(transformParams))
            ))
          }

          if (Object.keys(hash).length >  0) {
            properties.push(t.objectProperty(
              t.identifier('hash'),
              t.objectExpression(Object.keys(hash).map((key) => {
                return t.objectProperty(
                  t.stringLiteral(key),
                  transform(hash[key])
                );
              }))
            ));
          }

          properties.push(t.objectProperty(
            t.identifier('data'),
            t.identifier('data'),
            false, // computed
            true // shorthand
          ));

          const options = t.objectExpression(properties);
          args.push(options);

          expr = t.callExpression(dottedIdentifier('hys.expr'), args);
        }

        if (type === EXPR_VAR && (t.isCallExpression(expr) || t.isStringLiteral(expr))) {
          expr = t.callExpression(dottedIdentifier('hys.escape'), [expr]);
        }
        // log('EXPR', expr);
        exprs.push(expr);
      } else if (type === CHILD_RECURSE) {
        /**
         * field = [
         *   [parent],
         *   [[parent], if, 5, ['@first'], { hash: param }, 'body', 3], // if block
         *   [[parent], if, 5, ['@last'], {}, 'body', 3, 'End', 1]      // else block
         *  ]
         */
        const fnName = field[1][1];
        const params = field[1][3];
        const hash = field[1][4]
        const inverse = field[2];

        const args = [
          t.stringLiteral(fnName),
          t.identifier('ctx')
        ];

        const properties = [
          t.objectProperty(
            t.identifier('fn'),
            evaluate([0].concat(field[1].slice(5)))
          )
        ];

        if (inverse.length > 1) {
          properties.push(t.objectProperty(
            t.identifier('inverse'),
            evaluate(inverse)
          ))
        }

        if (params.length >  0) {
          properties.push(t.objectProperty(
            t.identifier('params'),
            t.arrayExpression(params.map(transformParams))
          ))
        }

        if (Object.keys(hash).length >  0) {
          properties.push(t.objectProperty(
            t.identifier('hash'),
            t.objectExpression(Object.keys(hash).map((key) => {
              return t.objectProperty(
                t.stringLiteral(key),
                transformParams(hash[key])
              );
            }))
          ));
        }

        properties.push(t.objectProperty(
          t.identifier('data'),
          t.identifier('data'),
          false, // computed
          true // shorthand
        ));

        const options = t.objectExpression(properties);
        args.push(options);

        let expr = t.callExpression(dottedIdentifier('hys.block'), args);
        // log('EXPR', expr);
        exprs.push(expr);
      } else {
        // code === CHILD_APPEND
        statics.push(t.templateElement({
          raw: field,
          cooked: field
        }));
      }
    }

    // log('EXPRS', exprs);

    const params = [t.identifier('hys'), t.identifier('ctx'), t.identifier('data')];
    const quasi = t.templateLiteral(statics, exprs);
    const body = t.taggedTemplateExpression(t.identifier(htmlName), quasi);
    const node = t.callExpression(
      t.identifier('template'),
      [t.arrowFunctionExpression(params, body)]
    );
    return node;
  }

  function dottedIdentifier(keypath) {
    const path = keypath.split('.');
    let out;
    for (let i=0; i<path.length; i++) {
      const ident = propertyName(path[i]);
      out = i===0 ? ident : t.memberExpression(out, ident);
    }
    return out;
  }

  function propertyName(key) {
    if (t.isValidIdentifier(key)) {
      return t.identifier(key);
    }
    return t.stringLiteral(key);
  }

  function transform(value) {
    if (value === '') {
      return t.stringLiteral(value);
    }

    if (typeof value === 'string') {
      value = parseLiteral(value);
    }

    let str;
    switch (typeof value) {
      case 'string':
        if ((str = unwrap(value, '"')) || (str = unwrap(value, "'"))) {
          return t.stringLiteral(str);
        }
        return t.identifier(value);
      case 'number':
        return t.numericLiteral(value);
      case 'boolean':
        return t.booleanLiteral(value);
      default:
        return t.identifier('' + value);
    }
  }

  function transformParams(value) {
    if (typeof value === 'string') {
      value = parseLiteral(value);
    }

    switch (typeof value) {
      case 'string':
        if (unwrap(value, '"') || unwrap(value, "'")) {
          return t.stringLiteral(value);
        }
        return t.stringLiteral(value);
      case 'number':
        return t.numericLiteral(value);
      case 'boolean':
        return t.booleanLiteral(value);
      default:
        return t.identifier('' + value);
    }
  }

	// The tagged template tag function name we're looking for.
	// This is static because it's generally assigned via htm.bind(h),
	// which could be imported from elsewhere, making tracking impossible.
	const hbsName = options.tag || 'hbs';
  const htmlName = options.tagOut || 'html';
	return {
		name: 'hyperstache',
		visitor: {
      TaggedTemplateExpression
    }
	};
}
