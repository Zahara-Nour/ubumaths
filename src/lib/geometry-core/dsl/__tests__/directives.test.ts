import { describe, it, expect } from 'vitest';
import { tokenize, DslTokenizerError } from '../tokenizer';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import type { DirectiveHandler } from '../interpreter';
import { serializeProgram } from '../serializer';
import { geoToNumber } from '../../compute/to-number';
import type { ResolvedValue } from '../builtins';
import type { DslDirective } from '../types';

// ─── Tokenizer ──────────────────────────────────────────────

describe('tokenizer — @ directives', () => {
	it('recognizes @instrument as AT_DIRECTIVE token', () => {
		const tokens = tokenize('@instrument');
		expect(tokens[0]).toMatchObject({ type: 'AT_DIRECTIVE', value: 'instrument' });
	});

	it('recognizes @pause as AT_DIRECTIVE token', () => {
		const tokens = tokenize('@pause');
		expect(tokens[0]).toMatchObject({ type: 'AT_DIRECTIVE', value: 'pause' });
	});

	it('recognizes @instruction as AT_DIRECTIVE token', () => {
		const tokens = tokenize('@instruction');
		expect(tokens[0]).toMatchObject({ type: 'AT_DIRECTIVE', value: 'instruction' });
	});

	it('rejects @ alone at end of line', () => {
		expect(() => tokenize('@')).toThrow(DslTokenizerError);
	});

	it('rejects @123 (non-identifier after @)', () => {
		expect(() => tokenize('@123')).toThrow(DslTokenizerError);
	});

	it('tokenizes @pause(500) with parentheses and number', () => {
		const tokens = tokenize('@pause(500)');
		const relevant = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(relevant.map((t) => t.type)).toEqual(['AT_DIRECTIVE', 'LPAREN', 'NUMBER', 'RPAREN']);
		expect(relevant[0].value).toBe('pause');
	});

	it('tokenizes directive among regular tokens', () => {
		const tokens = tokenize('A = point(0, 0)\n@pause(500)\nB = point(1, 1)');
		const directiveTokens = tokens.filter((t) => t.type === 'AT_DIRECTIVE');
		expect(directiveTokens).toHaveLength(1);
		expect(directiveTokens[0].value).toBe('pause');
	});

	it('handles directive after comment on same conceptual flow', () => {
		const tokens = tokenize('# un commentaire\n@instrument("regle")');
		const relevant = tokens.filter((t) => t.type !== 'NEWLINE' && t.type !== 'EOF');
		expect(relevant[0]).toMatchObject({ type: 'AT_DIRECTIVE', value: 'instrument' });
	});
});

// ─── Parser ──────────────────────────────────────────────────

describe('parser — @ directives', () => {
	it('parses @pause(500) as DslDirective', () => {
		const prog = parse('@pause(500)');
		expect(prog.statements).toHaveLength(1);
		const d = prog.statements[0] as DslDirective;
		expect(d.kind).toBe('directive');
		expect(d.name).toBe('pause');
		expect(d.args).toHaveLength(1);
		expect(d.args[0].kind).toBe('number');
	});

	it('parses @instrument("regle", x=100) with positional and named args', () => {
		const prog = parse('@instrument("regle", x=100)');
		const d = prog.statements[0] as DslDirective;
		expect(d.kind).toBe('directive');
		expect(d.name).toBe('instrument');
		expect(d.args).toHaveLength(1);
		expect(d.args[0].kind).toBe('string');
		expect(d.namedArgs.get('x')).toBeDefined();
	});

	it('parses @cacher without parentheses (no args)', () => {
		const prog = parse('@cacher');
		const d = prog.statements[0] as DslDirective;
		expect(d.kind).toBe('directive');
		expect(d.name).toBe('cacher');
		expect(d.args).toHaveLength(0);
		expect(d.namedArgs.size).toBe(0);
	});

	it('parses @instruction("Tracer le segment [AB]")', () => {
		const prog = parse('@instruction("Tracer le segment [AB]")');
		const d = prog.statements[0] as DslDirective;
		expect(d.kind).toBe('directive');
		expect(d.name).toBe('instruction');
		expect(d.args).toHaveLength(1);
		expect(d.args[0].kind).toBe('string');
	});

	it('parses directives between regular statements', () => {
		const script = [
			'A = point(0, 0)',
			'@instrument("regle")',
			'@instruction("Tracer AB")',
			'B = point(3, 4)',
			'segment(A, B)',
			'@pause(500)'
		].join('\n');
		const prog = parse(script);
		expect(prog.statements).toHaveLength(6);
		expect(prog.statements[0].kind).toBe('assignment');
		expect(prog.statements[1].kind).toBe('directive');
		expect(prog.statements[2].kind).toBe('directive');
		expect(prog.statements[3].kind).toBe('assignment');
		expect(prog.statements[4].kind).toBe('exprStatement');
		expect(prog.statements[5].kind).toBe('directive');
	});

	it('parses @vitesse(2) with numeric arg', () => {
		const prog = parse('@vitesse(2)');
		const d = prog.statements[0] as DslDirective;
		expect(d.name).toBe('vitesse');
		expect(d.args).toHaveLength(1);
	});

	it('parses @montrer("c1") with string arg', () => {
		const prog = parse('@montrer("c1")');
		const d = prog.statements[0] as DslDirective;
		expect(d.name).toBe('montrer');
		expect(d.args).toHaveLength(1);
	});
});

// ─── Interpreter ─────────────────────────────────────────────

describe('interpreter — @ directives', () => {
	it('silently ignores directives when no handler is provided', () => {
		const script = [
			'A = point(0, 0)',
			'@pause(500)',
			'B = point(3, 4)',
			'@instrument("regle")'
		].join('\n');
		const program = parse(script);
		const { figure, symbols } = interpret(program);
		// Figure should have 2 points, directives ignored
		expect(symbols.get('A')).toBeDefined();
		expect(symbols.get('B')).toBeDefined();
		const posB = figure.getPosition(symbols.get('B')!.figureId!);
		expect(geoToNumber(posB!.x)).toBeCloseTo(3);
		expect(geoToNumber(posB!.y)).toBeCloseTo(4);
	});

	it('calls handler with resolved directive name and args', () => {
		const received: Array<{ name: string; args: ResolvedValue[] }> = [];
		const handler: DirectiveHandler = (name, args) => {
			received.push({ name, args: [...args.positional] });
		};

		const script = ['@pause(500)', 'A = point(0, 0)', '@instrument("regle")', '@vitesse(2)'].join(
			'\n'
		);
		const program = parse(script);
		interpret(program, undefined, handler);

		expect(received).toHaveLength(3);
		expect(received[0].name).toBe('pause');
		expect(received[0].args[0]).toEqual({ type: 'nombre', value: 500 });
		expect(received[1].name).toBe('instrument');
		expect(received[1].args[0]).toEqual({ type: 'string', value: 'regle' });
		expect(received[2].name).toBe('vitesse');
		expect(received[2].args[0]).toEqual({ type: 'nombre', value: 2 });
	});

	it('handler receives named args', () => {
		const received: Array<{ name: string; named: Map<string, ResolvedValue> }> = [];
		const handler: DirectiveHandler = (name, args) => {
			received.push({ name, named: new Map(args.named) });
		};

		const program = parse('@instrument("regle", x=100, y=200)');
		interpret(program, undefined, handler);

		expect(received).toHaveLength(1);
		expect(received[0].named.get('x')).toEqual({ type: 'nombre', value: 100 });
		expect(received[0].named.get('y')).toEqual({ type: 'nombre', value: 200 });
	});
});

// ─── Non-regression ──────────────────────────────────────────

describe('directives — non-regression', () => {
	it('scripts without @ produce identical results', () => {
		const script = [
			'A = point(0, 0)',
			'B = point(4, 0)',
			'M = milieu(A, B)',
			'segment(A, B)',
			'd = droite(A, B)',
			'c = cercle(A, rayon=3)'
		].join('\n');
		const program = parse(script);
		const { figure, symbols } = interpret(program);
		expect(symbols.get('A')).toBeDefined();
		expect(symbols.get('B')).toBeDefined();
		expect(symbols.get('M')).toBeDefined();
		const posM = figure.getPosition(symbols.get('M')!.figureId!);
		expect(geoToNumber(posM!.x)).toBeCloseTo(2);
		expect(geoToNumber(posM!.y)).toBeCloseTo(0);
		expect(figure.getAllElements().filter((e) => e.type === 'segment')).toHaveLength(1);
		expect(figure.getAllElements().filter((e) => e.type === 'line')).toHaveLength(1);
	});

	it('serializeProgram round-trips directives', () => {
		const script = [
			'A = point(0, 0)',
			'@instrument("regle")',
			'@pause(500)',
			'B = point(3, 4)',
			'@cacher'
		].join('\n');
		const program = parse(script);
		const serialized = serializeProgram(program);

		// Re-parse the serialized output
		const program2 = parse(serialized);
		expect(program2.statements).toHaveLength(5);
		expect(program2.statements[0].kind).toBe('assignment');
		expect(program2.statements[1].kind).toBe('directive');
		expect((program2.statements[1] as DslDirective).name).toBe('instrument');
		expect(program2.statements[2].kind).toBe('directive');
		expect((program2.statements[2] as DslDirective).name).toBe('pause');
		expect(program2.statements[3].kind).toBe('assignment');
		expect(program2.statements[4].kind).toBe('directive');
		expect((program2.statements[4] as DslDirective).name).toBe('cacher');
	});

	it('macros still work alongside directives', () => {
		const script = [
			'macro carre(A, B):',
			'    segment(A, B)',
			'    retourne A',
			'',
			'A = point(0, 0)',
			'@instruction("Construire le carre")',
			'B = point(2, 0)',
			'carre(A, B)',
			'@pause(1000)'
		].join('\n');
		const program = parse(script);
		// Should parse and interpret without error
		const { figure } = interpret(program);
		expect(figure.getAllElements().filter((e) => e.type === 'segment')).toHaveLength(1);
	});
});
