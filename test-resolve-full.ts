import { resolveExpression } from './src/lib/shared/parameterization/resolver/variable-resolver';
import type { ResolvedVariable } from './src/lib/shared/parameterization/types';

// This is what should be happening after variable resolution
const expression = '{{eval:{{a}} + {{b}}}}';
const resolvedVars: ResolvedVariable[] = [
	{ name: 'a', value: '10' },
	{ name: 'b', value: '7' }
];

console.log('Input expression:', expression);
console.log('Resolved variables:', resolvedVars);

try {
	const result = resolveExpression(expression, resolvedVars, undefined);
	console.log('Output:', result);
} catch (e) {
	console.error('Error:', e);
}
