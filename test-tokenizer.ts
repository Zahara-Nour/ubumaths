import { tokenize } from './src/lib/shared/parameterization/parser/tokenizer';
import { parseEvalExpression } from './src/lib/shared/parameterization/parser/eval-parser';

const text = '{{eval:10 + 7}}';
console.log('Input:', text);

const tokens = tokenize(text);
console.log('Tokens:', JSON.stringify(tokens, null, 2));

const evalTokens = tokens.filter((t) => t.type === 'eval');
console.log('Eval tokens:', evalTokens);

if (evalTokens.length > 0) {
	const expr = parseEvalExpression(evalTokens[0].content);
	console.log('Parsed expression:', expr);
}
