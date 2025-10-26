import { resolveExpression } from './src/lib/shared/parameterization/resolver/variable-resolver';
import type { ResolvedVariable } from './src/lib/shared/parameterization/types';

const alreadyResolved: ResolvedVariable[] = [
	{ name: 'a', value: '4' },
	{ name: 'b', value: '9' }
];

const expression = '{{eval:{{a}} + {{b}}}}';
console.log('Input:', expression);
try {
	const result = resolveExpression(expression, alreadyResolved, undefined);
	console.log('Output:', result);
} catch (e) {
	console.error('Error:', e);
}
