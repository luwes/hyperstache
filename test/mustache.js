import fs from 'fs';
import _ from 'underscore';

import tape from 'tape';
import { compile } from '../src/index.js';

const stitch = (strings, ...values) =>
  strings.map((str, i) => `${str}${
    (Array.isArray(values[i]) ? values[i].join('') : values[i]) || ''
  }`).join('');

const hbs = compile.bind(stitch);

var specDir = __dirname + '/mustache/specs/';
var specs = _.filter(fs.readdirSync(specDir), function(name) {
  return /.*\.json$/.test(name);
});

_.each(specs, function(name) {
  var spec = require(specDir + name);
  _.each(spec.tests, function(test) {
    // Our lambda implementation knowingly deviates from the optional Mustace lambda spec
    // We also do not support alternative delimeters
    if (
      // Hyperstache has helpers instead
      name === '~lambdas.json' ||
      // Hyperstache doesn't support partials
      name === 'partials.json' ||
      // name === 'inverted.json' ||
      // name === 'interpolation.json' ||
      // name === 'comments.json' ||
      // name === 'sections.json' ||

      /\{\{=/.test(test.template) ||
      _.any(test.partials, function(partial) {
        return /\{\{=/.test(partial);
      })
    ) {
      tape.skip(name + ' - ' + test.name);
      return;
    }

    // if (test.name !== 'Deeply Nested Contexts') return;

    var data = _.clone(test.data);
    if (data.lambda) {
      // Blergh
      /* eslint-disable no-eval */
      data.lambda = eval('(' + data.lambda.js + ')');
      /* eslint-enable no-eval */
    }

    tape(name + ' - ' + test.name, function(t) {
      t.equal(
        hbs.call(0, [test.template])(data),
        test.expected,
        test.desc + ' "' + test.template + '"'
      );
      t.end();
    });
  });
});
