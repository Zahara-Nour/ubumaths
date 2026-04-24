import { describe, it, expect } from 'vitest';
import { tokenize, DslTokenizerError } from '../tokenizer';
import type { Token } from '../tokens';

function types(tokens: Token[]): string[] {
	return tokens.map((t) => t.type);
}

describe('tokenizer — basics', () => {
	it('empty string produces only EOF', () => {
		const tokens = tokenize('');
		expect(types(tokens)).toEqual(['EOF']);
	});

	it('blank lines produce only EOF', () => {
		const tokens = tokenize('\n\n\n');
		expect(types(tokens)).toEqual(['EOF']);
	});

	it('comment-only line is ignored', () => {
		const tokens = tokenize('# ceci est un commentaire');
		expect(types(tokens)).toEqual(['EOF']);
	});

	it('integer number', () => {
		const tokens = tokenize('42');
		expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '42' });
	});

	it('decimal number', () => {
		const tokens = tokenize('3.14');
		expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '3.14' });
	});

	it('identifier', () => {
		const tokens = tokenize('MonPoint');
		expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'MonPoint' });
	});

	it('keyword recognized', () => {
		const tokens = tokenize('point');
		expect(tokens[0]).toMatchObject({ type: 'KEYWORD', value: 'point' });
	});

	it('all French keywords are recognized', () => {
		const keywords = [
			'point',
			'milieu',
			'segment',
			'droite',
			'demidroite',
			'cercle',
			'symetrie',
			'rotation',
			'translation',
			'homothetie',
			'intersection',
			'marque_angle',
			'angle_droit',
			'marque_segment',
			'mesure',
			'style',
			'macro',
			'retourne',
			'pour',
			'dans',
			'si',
			'sinon',
			'vrai',
			'faux',
			'non',
			'et',
			'ou'
		];
		for (const kw of keywords) {
			const tokens = tokenize(kw);
			expect(tokens[0].type).toBe('KEYWORD');
			expect(tokens[0].value).toBe(kw);
		}
	});

	it('identifier that looks like keyword prefix is not a keyword', () => {
		const tokens = tokenize('pointer');
		expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'pointer' });
	});

	it('string literal', () => {
		const tokens = tokenize('"hello"');
		expect(tokens[0]).toMatchObject({ type: 'STRING', value: 'hello' });
	});

	it('string with special characters', () => {
		const tokens = tokenize('"A\'"');
		expect(tokens[0]).toMatchObject({ type: 'STRING', value: "A'" });
	});
});

describe('tokenizer — operators and punctuation', () => {
	it('arithmetic operators', () => {
		const tokens = tokenize('+ - * / % ^');
		const ops = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(ops.map((t) => t.type)).toEqual(['PLUS', 'MINUS', 'STAR', 'SLASH', 'PERCENT', 'CARET']);
	});

	it('assignment operator', () => {
		const tokens = tokenize('=');
		expect(tokens[0].type).toBe('EQUALS');
	});

	it('comparison operators', () => {
		const tokens = tokenize('== != < > <= >=');
		const ops = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(ops.map((t) => t.type)).toEqual([
			'DOUBLE_EQUALS',
			'NOT_EQUALS',
			'LESS',
			'GREATER',
			'LESS_EQUALS',
			'GREATER_EQUALS'
		]);
	});

	it('punctuation', () => {
		const tokens = tokenize('( ) [ ] : , .');
		const ops = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(ops.map((t) => t.type)).toEqual([
			'LPAREN',
			'RPAREN',
			'LBRACKET',
			'RBRACKET',
			'COLON',
			'COMMA',
			'DOT'
		]);
	});
});

describe('tokenizer — expressions', () => {
	it('point(0, 0)', () => {
		const tokens = tokenize('point(0, 0)');
		const ts = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(ts.map((t) => t.type)).toEqual([
			'KEYWORD',
			'LPAREN',
			'NUMBER',
			'COMMA',
			'NUMBER',
			'RPAREN'
		]);
	});

	it('A = point(3, 4)', () => {
		const tokens = tokenize('A = point(3, 4)');
		const ts = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(ts.map((t) => t.type)).toEqual([
			'IDENTIFIER',
			'EQUALS',
			'KEYWORD',
			'LPAREN',
			'NUMBER',
			'COMMA',
			'NUMBER',
			'RPAREN'
		]);
	});

	it('cercle(O, rayon=3)', () => {
		const tokens = tokenize('cercle(O, rayon=3)');
		const ts = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(ts.map((t) => [t.type, t.value])).toEqual([
			['KEYWORD', 'cercle'],
			['LPAREN', '('],
			['IDENTIFIER', 'O'],
			['COMMA', ','],
			['IDENTIFIER', 'rayon'],
			['EQUALS', '='],
			['NUMBER', '3'],
			['RPAREN', ')']
		]);
	});

	it('P[0]', () => {
		const tokens = tokenize('P[0]');
		const ts = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(ts.map((t) => t.type)).toEqual(['IDENTIFIER', 'LBRACKET', 'NUMBER', 'RBRACKET']);
	});

	it('i * 360 / n', () => {
		const tokens = tokenize('i * 360 / n');
		const ts = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(ts.map((t) => t.type)).toEqual(['IDENTIFIER', 'STAR', 'NUMBER', 'SLASH', 'IDENTIFIER']);
	});

	it('(i + 1) % n', () => {
		const tokens = tokenize('(i + 1) % n');
		const ts = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(ts.map((t) => t.type)).toEqual([
			'LPAREN',
			'IDENTIFIER',
			'PLUS',
			'NUMBER',
			'RPAREN',
			'PERCENT',
			'IDENTIFIER'
		]);
	});

	it('A.x + 1', () => {
		const tokens = tokenize('A.x + 1');
		const ts = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(ts.map((t) => t.type)).toEqual(['IDENTIFIER', 'DOT', 'IDENTIFIER', 'PLUS', 'NUMBER']);
	});
});

describe('tokenizer — indentation', () => {
	it('simple indent/dedent', () => {
		const script = 'pour i de 0 a 5:\n    point(i, 0)';
		const tokens = tokenize(script);
		const ts = types(tokens);
		expect(ts).toContain('INDENT');
		expect(ts).toContain('DEDENT');
	});

	it('indent depth tracked correctly', () => {
		const script = ['macro f(A):', '    M = milieu(A, B)', '    retourne M'].join('\n');
		const tokens = tokenize(script);
		const indents = tokens.filter((t) => t.type === 'INDENT').length;
		const dedents = tokens.filter((t) => t.type === 'DEDENT').length;
		expect(indents).toBe(1);
		expect(dedents).toBe(1);
	});

	it('nested indentation', () => {
		const script = [
			'pour i de 0 a 2:',
			'    si i > 0:',
			'        segment(P[i], P[i-1])',
			'    point(i, 0)'
		].join('\n');
		const tokens = tokenize(script);
		const indents = tokens.filter((t) => t.type === 'INDENT').length;
		const dedents = tokens.filter((t) => t.type === 'DEDENT').length;
		expect(indents).toBe(2);
		expect(dedents).toBe(2);
	});

	it('multiple dedents at once', () => {
		const script = [
			'pour i de 0 a 2:',
			'    si i > 0:',
			'        segment(P[i], P[i-1])',
			'A = point(0, 0)'
		].join('\n');
		const tokens = tokenize(script);
		// Should have 2 indents going in, then 2 dedents when returning to level 0
		const indents = tokens.filter((t) => t.type === 'INDENT').length;
		const dedents = tokens.filter((t) => t.type === 'DEDENT').length;
		expect(indents).toBe(2);
		expect(dedents).toBe(2);
	});

	it('inconsistent indentation throws error', () => {
		const script = [
			'pour i de 0 a 2:',
			'    point(i, 0)',
			'  point(0, 0)' // 2 spaces instead of 4
		].join('\n');
		expect(() => tokenize(script)).toThrow(DslTokenizerError);
	});

	it('no indent without block', () => {
		const script = 'A = point(0, 0)\nB = point(1, 1)';
		const tokens = tokenize(script);
		expect(tokens.filter((t) => t.type === 'INDENT').length).toBe(0);
		expect(tokens.filter((t) => t.type === 'DEDENT').length).toBe(0);
	});
});

describe('tokenizer — multi-line programs', () => {
	it('three-line program', () => {
		const script = 'A = point(0, 0)\nB = point(1, 1)\nsegment(A, B)';
		const tokens = tokenize(script);
		const newlines = tokens.filter((t) => t.type === 'NEWLINE').length;
		expect(newlines).toBe(3);
	});

	it('blank lines are skipped', () => {
		const script = 'A = point(0, 0)\n\n\nB = point(1, 1)';
		const tokens = tokenize(script);
		// Only 2 content lines = 2 NEWLINEs
		const newlines = tokens.filter((t) => t.type === 'NEWLINE').length;
		expect(newlines).toBe(2);
	});

	it('inline comment stripped', () => {
		const script = 'A = point(0, 0) # un point';
		const tokens = tokenize(script);
		const identifiers = tokens.filter((t) => t.type === 'IDENTIFIER');
		expect(identifiers.length).toBe(1);
		expect(identifiers[0].value).toBe('A');
	});
});

describe('tokenizer — line and column tracking', () => {
	it('tracks line number', () => {
		const script = 'A = point(0, 0)\nB = point(1, 1)';
		const tokens = tokenize(script);
		const bToken = tokens.find((t) => t.value === 'B');
		expect(bToken?.line).toBe(2);
	});

	it('tracks column number', () => {
		const script = 'A = point(0, 0)';
		const tokens = tokenize(script);
		const equalsToken = tokens.find((t) => t.type === 'EQUALS');
		expect(equalsToken?.col).toBe(3);
	});
});

describe('tokenizer — errors', () => {
	it('unknown character throws with position', () => {
		expect(() => tokenize('A = @')).toThrow(DslTokenizerError);
		try {
			tokenize('A = @');
		} catch (e) {
			expect((e as DslTokenizerError).line).toBe(1);
			expect((e as DslTokenizerError).message).toContain('@');
		}
	});

	it('unclosed string throws', () => {
		expect(() => tokenize('"hello')).toThrow(DslTokenizerError);
	});
});

describe('tokenizer — complex scripts', () => {
	it('polygone regulier script', () => {
		const script = [
			'n = 6',
			'O = point(0, 0)',
			'P[0] = point(3, 0)',
			'pour i de 1 a n - 1:',
			'    P[i] = rotation(P[0], centre=O, angle=i * 360 / n)',
			'pour i de 0 a n - 1:',
			'    segment(P[i], P[(i + 1) % n])'
		].join('\n');
		const tokens = tokenize(script);
		// Should not throw
		expect(tokens[tokens.length - 1].type).toBe('EOF');
		// Should have 2 INDENT and 2 DEDENT
		expect(tokens.filter((t) => t.type === 'INDENT').length).toBe(2);
		expect(tokens.filter((t) => t.type === 'DEDENT').length).toBe(2);
	});

	it('macro definition script', () => {
		const script = [
			'macro mediatrice(A, B):',
			'    M = milieu(A, B)',
			'    H = rotation(A, centre=M, angle=90)',
			'    d = droite(M, H)',
			'    retourne (M, d)'
		].join('\n');
		const tokens = tokenize(script);
		expect(tokens[tokens.length - 1].type).toBe('EOF');
		expect(tokens.filter((t) => t.type === 'INDENT').length).toBe(1);
		expect(tokens.filter((t) => t.type === 'DEDENT').length).toBe(1);
		// Check keywords
		const keywords = tokens.filter((t) => t.type === 'KEYWORD').map((t) => t.value);
		expect(keywords).toContain('macro');
		expect(keywords).toContain('milieu');
		expect(keywords).toContain('rotation');
		expect(keywords).toContain('droite');
		expect(keywords).toContain('retourne');
	});
});
