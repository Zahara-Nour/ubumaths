/**
 * Color Template System Demonstration
 * ====================================
 *
 * This file demonstrates the complete color template system workflow,
 * from old TinyCAS syntax conversion to final color resolution.
 */

import { convertTinyCASToNew } from '../../migration/syntax-converter';
import { resolveExpression } from '../generator/content-resolver';
import { COLOR_PALETTES, getColor, getAllColors } from '../colors';

// ============================================================================
// 1. CONVERSION EXAMPLES
// ============================================================================

console.log('=== COLOR CONVERSION EXAMPLES ===\n');

// Example 1: Basic color conversion
const example1Old = 'Draw a ${get(color1)} circle';
const example1Result = convertTinyCASToNew(example1Old);
console.log('Old:', example1Old);
console.log('New:', example1Result.converted);
console.log('---');

// Example 2: Multiple colors
const example2Old = 'Compare ${get(color1)} with ${get(color2)}';
const example2Result = convertTinyCASToNew(example2Old);
console.log('Old:', example2Old);
console.log('New:', example2Result.converted);
console.log('---');

// Example 3: French colors
const example3Old = 'La couleur ${get(couleur1)} est belle';
const example3Result = convertTinyCASToNew(example3Old);
console.log('Old:', example3Old);
console.log('New:', example3Result.converted);
console.log('---');

// ============================================================================
// 2. COLOR PALETTE SHOWCASE
// ============================================================================

console.log('\n=== AVAILABLE COLOR PALETTES ===\n');

// Primary palette - for highlighting important elements
console.log('PRIMARY PALETTE (Vibrant colors for emphasis):');
COLOR_PALETTES.primary.forEach((color, index) => {
	console.log(`  primary.${index}: ${color}`);
});

// Shapes palette - pastel colors for diagrams
console.log('\nSHAPES PALETTE (Pastel colors for diagrams):');
COLOR_PALETTES.shapes.forEach((color, index) => {
	console.log(`  shapes.${index}: ${color}`);
});

// Text palette - dark colors for text emphasis
console.log('\nTEXT PALETTE (Dark colors for text):');
COLOR_PALETTES.text.forEach((color, index) => {
	console.log(`  text.${index}: ${color}`);
});

// Contrast pairs - for comparisons
console.log('\nCONTRAST PAIRS (High contrast for comparisons):');
COLOR_PALETTES.contrast.forEach((pair, index) => {
	console.log(`  contrast.${index}: ${pair[0]} vs ${pair[1]}`);
});

// Rainbow spectrum
console.log('\nRAINBOW SPECTRUM (ROYGBIV):');
COLOR_PALETTES.rainbow.forEach((color, index) => {
	console.log(`  rainbow.${index}: ${color}`);
});

// ============================================================================
// 3. COLOR RESOLUTION EXAMPLES
// ============================================================================

console.log('\n=== COLOR RESOLUTION EXAMPLES ===\n');

// Resolve specific colors
const template1 = 'Primary color: {#color:primary.0}';
console.log('Template:', template1);
console.log('Resolved:', resolveExpression(template1, []));
console.log('---');

// Resolve random colors with seed
const template2 = 'Random shape color: {#color:shapes}';
console.log('Template:', template2);
console.log('Resolved (seed 42):', resolveExpression(template2, [], 42));
console.log('Resolved (seed 42):', resolveExpression(template2, [], 42)); // Same
console.log('Resolved (seed 123):', resolveExpression(template2, [], 123)); // Different
console.log('---');

// Resolve contrast pairs
const template3 = 'Compare {#color:contrast.0.0} with {#color:contrast.0.1}';
console.log('Template:', template3);
console.log('Resolved:', resolveExpression(template3, []));
console.log('---');

// ============================================================================
// 4. COMPLETE WORKFLOW EXAMPLE
// ============================================================================

console.log('\n=== COMPLETE WORKFLOW EXAMPLE ===\n');

// Geometry question with colors
const oldQuestion =
	'Draw a $' +
	'{get(color1)} triangle with vertices at A, B, and C.\n' +
	'Draw a $' +
	'{get(color2)} circle with center O.\n' +
	'The intersection points are marked in $' +
	'{get(color3)}.';

console.log('STEP 1 - Original TinyCAS Question:');
console.log(oldQuestion.trim());

const converted = convertTinyCASToNew(oldQuestion);
console.log('\nSTEP 2 - Converted to New Syntax:');
console.log(converted.converted?.trim());

console.log('\nSTEP 3 - Resolved with Seed 42:');
const resolved = resolveExpression(converted.converted!, [], 42);
console.log(resolved.trim());

console.log('\nConversion Statistics:');
console.log(converted.stats);

// ============================================================================
// 5. PRACTICAL USE CASES
// ============================================================================

console.log('\n=== PRACTICAL USE CASES ===\n');

// Use Case 1: Geometry shapes with different colors
const geometryTemplate = `
In this diagram:
- The {#color:shapes.0} rectangle has width w and height h
- The {#color:shapes.1} triangle has base b and height h
- The {#color:shapes.2} circle has radius r
- The {#color:text.0} labels show the dimensions
`;
console.log('Geometry Question:');
console.log(resolveExpression(geometryTemplate, [], 42));

// Use Case 2: Data visualization with contrast colors
const dataTemplate = `
Compare the two datasets:
- Dataset A is shown in {#color:contrast.0.0}
- Dataset B is shown in {#color:contrast.0.1}
Notice how the {#color:contrast.0.0} line trends upward
while the {#color:contrast.0.1} line remains stable.
`;
console.log('\nData Comparison:');
console.log(resolveExpression(dataTemplate, [], 42));

// Use Case 3: Rainbow spectrum for physics
const physicsTemplate = `
The visible light spectrum:
- {#color:rainbow.0} light has the longest wavelength
- {#color:rainbow.6} light has the shortest wavelength
- {#color:rainbow.2} light is in the middle of the spectrum
`;
console.log('\nPhysics Spectrum:');
console.log(resolveExpression(physicsTemplate, [], 42));

// ============================================================================
// 6. PROGRAMMATIC ACCESS
// ============================================================================

console.log('\n=== PROGRAMMATIC ACCESS ===\n');

// Get specific colors
console.log('First primary color:', getColor('primary.0'));
console.log('Random shapes color:', getColor('shapes')); // Random each time
console.log('Seeded random text color:', getColor('text', 42)); // Same with seed 42

// Get all colors from a palette
console.log('\nAll primary colors:', getAllColors('primary'));
console.log('All contrast colors (flattened):', getAllColors('contrast'));

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n=== SUMMARY ===\n');
console.log('The color template system provides:');
console.log('1. Automatic conversion from ${get(colorN)} to {#color:primary.N-1}');
console.log('2. Five specialized color palettes for different use cases');
console.log('3. Seeded random selection for reproducible colors');
console.log('4. Support for contrast pairs for comparisons');
console.log('5. Integration with the existing variable and content resolution pipeline');
console.log('\nColor references are resolved during question instance generation,');
console.log('ensuring consistent colors within each generated instance.');
