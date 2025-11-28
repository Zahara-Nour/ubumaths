/**
 * Test Transformer with Real Examples
 * =====================================
 *
 * Script to test the transformer with real question examples
 * from the old TinyMath system.
 */

import { transformQuestion } from './question-transformer';
import type { QuestionBase } from './old-question-types';

// Real examples from the old system
const realQuestions: QuestionBase[] = [
	// Example 1: Simple position décimale (from CP level)
	{
		description: 'Connaître la position décimale',
		subdescription: "Jusqu'aux dizaines.",
		enounces: [
			'Dans le nombre $$&3$$, quel est le chiffre des dizaines ?',
			'Dans le nombre $$&3$$, quel est le chiffre des unités ?'
		],
		variabless: [
			{
				'&1': '$e[1;9]',
				'&2': '$e[0;9]\\{&1}',
				'&3': '[_&1*10+&2_]'
			}
		],
		solutionss: [['&1'], ['&2']],
		answerFields: [
			'\\text{Le chiffre des dizaines est }$$...$$\\text{.}',
			'\\text{Le chiffre des unités est }$$...$$\\text{.}'
		],
		options: [
			'require-no-extraneous-zeros',
			'require-no-extraneous-brackets',
			'require-no-extraneous-signs'
		],
		defaultDelay: 10,
		grade: 'CP'
	},

	// Example 2: Parité (multiple choice)
	{
		description: "Parité d'un nombre entier",
		enounces: ['Quelle est la parité de ce nombre ?'],
		expressions: ['&2', '&3'],
		variabless: [
			{
				'&1': '$e[0;49]',
				'&2': '[_2*&1_]',
				'&3': '[_2*&1+1_]'
			}
		],
		choicess: [[{ text: 'pair' }, { text: 'impair' }]],
		correctionDetailss: [
			[
				{
					text: '&expression est &solution car il se termine par 0, 2, 4, 6, ou 8.'
				}
			],
			[
				{
					text: '&expression est &solution car il se termine par 1, 3, 5, 7, ou 9.'
				}
			]
		],
		solutionss: [[0], [1]],
		options: ['no-shuffle-choices'],
		defaultDelay: 10,
		grade: 'CE1'
	},

	// Example 3: Large numbers with spaces
	{
		description: 'Ecrire un grand nombre entier avec des espaces',
		subdescription: 'Nombre à 4 chiffres',
		enounces: ['Réécris en espaçant correctement les chiffres.'],
		expressions: ['&1'],
		prefilleds: [['&1']],
		variabless: [{ '&1': '$e{4;4}' }],
		options: ['exp-no-spaces', 'require-correct-spaces'],
		defaultDelay: 15,
		grade: 'CE2'
	}
];

// Function to display transform results
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function displayResult(index: number, question: QuestionBase, result: any) {
	console.log(`\n${'='.repeat(70)}`);
	console.log(`EXAMPLE ${index + 1}: ${question.description}`);
	console.log('='.repeat(70));

	console.log('\nOLD QUESTION:');
	console.log('  Grade:', question.grade);
	console.log(
		'  Type:',
		question.choicess
			? 'Multiple Choice'
			: question.expressions?.some((e) => e.includes('?'))
				? 'Fill-in-blanks'
				: question.answerFields
					? 'Answer Field'
					: 'Expression'
	);
	console.log('  Variations:', question.enounces?.length || 1);

	if (result.success) {
		console.log('\n✅ TRANSFORMATION SUCCESSFUL\n');

		const template = result.template;
		console.log('NEW TEMPLATE:');
		console.log('  Type:', template.type);
		console.log('  Title:', template.title);
		console.log('  Grade:', template.grades.join(', '));
		console.log('  Theme:', template.theme);
		console.log('  Domain:', template.domain);
		console.log('  Level:', template.level);
		console.log('  Variations:', template.variations.length);

		// Show first variation details
		const v = template.variations[0];
		console.log('\nFIRST VARIATION:');
		console.log(
			'  Statement:',
			v.statement
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.map((s: any) =>
					s.type === 'text' ? s.content.substring(0, 60) + '...' : `[Image: ${s.content}]`
				)
				.join(' ')
		);

		if (v.variables) {
			console.log('  Variables:');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			v.variables.forEach((variable: any) => {
				console.log(`    ${variable.name}: ${variable.expression}`);
			});
		}

		console.log('  Answer:', Array.isArray(v.answer) ? v.answer.join(', ') : v.answer);

		if (v.choices) {
			console.log('  Choices:');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			v.choices.forEach((choice: any, i: number) => {
				console.log(
					`    ${i}: ${choice.content.content} (${choice.isCorrect ? 'correct' : 'incorrect'})`
				);
			});
		}

		if (template.options) {
			console.log('\nOPTIONS:');
			Object.entries(template.options).forEach(([key, value]) => {
				console.log(`  ${key}: ${value}`);
			});
		}
	} else {
		console.log('\n❌ TRANSFORMATION FAILED\n');
		console.log('ERRORS:', result.errors?.join('\n  ') || 'None');
	}

	if (result.warnings && result.warnings.length > 0) {
		console.log('\n⚠️  WARNINGS:');
		result.warnings.forEach((w: string) => console.log('  -', w));
	}

	if (result.stats) {
		console.log('\n📊 STATISTICS:');
		console.log('  Detected Type:', result.stats.detectedType);
		console.log('  Variations:', result.stats.variations);
		console.log('  Variables:', result.stats.variables);
		console.log('  Options Mapped:', result.stats.optionsMapped);
		console.log('  Has Images:', result.stats.hasImages);
		console.log('  Has Custom Validation:', result.stats.hasCustomValidation);
	}
}

// Transform and display results
console.log('TESTING QUESTION TRANSFORMER WITH REAL EXAMPLES');
console.log('='.repeat(70));

realQuestions.forEach((question, index) => {
	const result = transformQuestion(question, index);
	displayResult(index, question, result);
});

console.log('\n' + '='.repeat(70));
console.log('SUMMARY:');
const results = realQuestions.map((q, i) => transformQuestion(q, i));
const successful = results.filter((r) => r.success).length;
const failed = results.filter((r) => !r.success).length;
const withWarnings = results.filter((r) => r.warnings && r.warnings.length > 0).length;

console.log(`  Total: ${realQuestions.length}`);
console.log(`  Successful: ${successful}`);
console.log(`  Failed: ${failed}`);
console.log(`  With Warnings: ${withWarnings}`);

// Export for use in other scripts
export { realQuestions, displayResult };
