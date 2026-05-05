/**
 * Demo cases — AnswerFormat scenarios.
 *
 * Demonstrates the fragment extraction step appended by the pipeline when
 * `target.answerFormat` is set. The fragment latex appears in the output
 * via the `presentExpression` helper's "(answer fragment: ...)" line.
 */

import { multiply, number, sqrt, superscript } from '../../factory';
import type { DemoCase } from '../demo-helpers';

export const ANSWER_FORMAT_SCENARIOS: readonly DemoCase[] = [
	{
		label: '10^6 with format "10^?" → fragment = 6',
		expression: superscript(number('10'), number('6')),
		target: { answerFormat: '10^?' },
		schoolLevels: ['college']
	},
	{
		label: '5 × 10^6 with format "? × 10^?" → fragment = 5 (mantissa)',
		expression: multiply(number('5'), superscript(number('10'), number('6')), 'cross'),
		target: { answerFormat: '? \\times 10^?' },
		schoolLevels: ['college']
	},
	{
		label: '√8 with format "?√?" — fragment extraction skipped (template-mismatch)',
		expression: sqrt(number('8')),
		target: { answerFormat: '?\\sqrt{?}' },
		schoolLevels: ['college']
	}
];
