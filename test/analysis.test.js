const test = require('node:test');
const assert = require('node:assert/strict');
const { heuristicAnalysis, hashText } = require('../src/analysis');

test('heuristicAnalysis detects calm emotion', () => {
  const result = heuristicAnalysis('I feel calm and relaxed while hearing rain in the forest');
  assert.equal(result.emotion, 'calm');
  assert.ok(result.keywords.includes('calm'));
});

test('hashText normalizes text consistently', () => {
  const a = hashText(' Hello Rain ');
  const b = hashText('hello rain');
  assert.equal(a, b);
});
