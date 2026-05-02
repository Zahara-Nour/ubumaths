import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { createStepper } from '../interpreter';
import type { DirectiveHandler } from '../interpreter';
import { geoToNumber } from '../../compute/to-number';
import { Figure } from '../../graph/figure';
import type { ResolvedValue } from '../builtins';

// ─── Basic stepping ──────────────────────────────────────────

describe('stepper — basic stepping', () => {
	it('creates a stepper with an empty figure', () => {
		const program = parse('A = point(0, 0)');
		const stepper = createStepper(program);
		expect(stepper.figure).toBeInstanceOf(Figure);
		expect(stepper.figure.size).toBe(0);
		expect(stepper.currentIndex).toBe(-1);
	});

	it('uses provided figure', () => {
		const fig = new Figure();
		const program = parse('A = point(0, 0)');
		const stepper = createStepper(program, fig);
		expect(stepper.figure).toBe(fig);
	});

	it('step() executes one statement and returns true', () => {
		const program = parse('A = point(0, 0)');
		const stepper = createStepper(program);
		const result = stepper.step();
		expect(result).toBe(true);
		expect(stepper.currentIndex).toBe(0);
		expect(stepper.figure.size).toBe(1);
	});

	it('step() returns false when program is complete', () => {
		const program = parse('A = point(0, 0)');
		const stepper = createStepper(program);
		stepper.step(); // execute A = point(0, 0)
		const result = stepper.step();
		expect(result).toBe(false);
	});

	it('currentIndex increments with each step', () => {
		const program = parse('A = point(0, 0)\nB = point(1, 1)\nC = point(2, 2)');
		const stepper = createStepper(program);
		expect(stepper.currentIndex).toBe(-1);
		stepper.step();
		expect(stepper.currentIndex).toBe(0);
		stepper.step();
		expect(stepper.currentIndex).toBe(1);
		stepper.step();
		expect(stepper.currentIndex).toBe(2);
	});

	it('nextStatement returns the statement about to be executed', () => {
		const program = parse('A = point(0, 0)\nB = point(1, 1)');
		const stepper = createStepper(program);
		// Before first step, nextStatement is the first step
		expect(stepper.nextStatement).toBeDefined();
		expect(stepper.nextStatement!.kind).toBe('assignment');
		stepper.step();
		expect(stepper.nextStatement).toBeDefined();
		expect(stepper.nextStatement!.kind).toBe('assignment');
		stepper.step();
		// After last step, no more statements
		expect(stepper.nextStatement).toBeUndefined();
	});

	it('totalSteps counts executable steps', () => {
		const program = parse('A = point(0, 0)\nB = point(1, 1)\nsegment(A, B)');
		const stepper = createStepper(program);
		expect(stepper.totalSteps).toBe(3);
	});

	it('symbols are accessible during stepping', () => {
		const program = parse('A = point(3, 4)\nB = point(5, 6)');
		const stepper = createStepper(program);
		stepper.step();
		expect(stepper.symbols.get('A')).toBeDefined();
		expect(stepper.symbols.get('B')).toBeUndefined();
		stepper.step();
		expect(stepper.symbols.get('B')).toBeDefined();
	});

	it('figure state is correct after stepping', () => {
		const program = parse('A = point(3, 4)\nB = point(5, 6)\nM = milieu(A, B)');
		const stepper = createStepper(program);
		stepper.step();
		stepper.step();
		stepper.step();
		const posM = stepper.figure.getPosition(stepper.symbols.get('M')!.figureId!);
		expect(geoToNumber(posM!.x)).toBeCloseTo(4);
		expect(geoToNumber(posM!.y)).toBeCloseTo(5);
	});
});

// ─── MacroDef handling ───────────────────────────────────────

describe('stepper — macroDef', () => {
	it('macroDef is not counted as a step', () => {
		const script = [
			'macro double(A, B):',
			'    segment(A, B)',
			'    retourne A',
			'',
			'A = point(0, 0)',
			'B = point(1, 1)',
			'double(A, B)'
		].join('\n');
		const program = parse(script);
		const stepper = createStepper(program);
		// totalSteps should be 3: A=point, B=point, double(A,B)
		// macroDef should not count
		expect(stepper.totalSteps).toBe(3);
	});

	it('macro calls work during stepping', () => {
		const script = [
			'macro carre(A, cote):',
			'    B = point(A.x + cote, A.y)',
			'    segment(A, B)',
			'    retourne B',
			'',
			'A = point(0, 0)',
			'R = carre(A, 3)'
		].join('\n');
		const program = parse(script);
		const stepper = createStepper(program);
		stepper.step(); // A = point(0, 0)
		stepper.step(); // R = carre(A, 3)
		expect(stepper.symbols.get('R')).toBeDefined();
	});
});

// ─── Loop flattening ─────────────────────────────────────────

describe('stepper — control flow as atomic steps', () => {
	it('pour...de...a executes as one step', () => {
		const script = ['pour i de 0 a 2:', '    P[i] = point(i, 0)'].join('\n');
		const program = parse(script);
		const stepper = createStepper(program);
		// The for loop is a single step
		expect(stepper.totalSteps).toBe(1);
		stepper.step(); // executes the whole loop
		expect(stepper.symbols.getIndexed('P', 0)).toBeDefined();
		expect(stepper.symbols.getIndexed('P', 1)).toBeDefined();
		expect(stepper.symbols.getIndexed('P', 2)).toBeDefined();
		expect(stepper.step()).toBe(false);
	});

	it('si/sinon executes as one step', () => {
		const script = [
			'n = 5',
			'si n > 3:',
			'    A = point(1, 0)',
			'sinon:',
			'    A = point(0, 0)'
		].join('\n');
		const program = parse(script);
		const stepper = createStepper(program);
		// n=5 + si block = 2 steps
		expect(stepper.totalSteps).toBe(2);
		stepper.step(); // n = 5
		stepper.step(); // si n>3 → A = point(1, 0)
		const pos = stepper.figure.getPosition(stepper.symbols.get('A')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(1);
	});
});

// ─── Directives ──────────────────────────────────────────────

describe('stepper — directives', () => {
	it('directives are steps like any other', () => {
		const script = 'A = point(0, 0)\n@pause(500)\nB = point(1, 1)';
		const program = parse(script);
		const stepper = createStepper(program);
		expect(stepper.totalSteps).toBe(3);
	});

	it('directive handler is called when stepping over a directive', () => {
		const received: Array<{ name: string; args: ResolvedValue[] }> = [];
		const handler: DirectiveHandler = (name, args) => {
			received.push({ name, args: [...args.positional] });
		};

		const script = '@pause(500)\nA = point(0, 0)\n@instrument("regle")';
		const program = parse(script);
		const stepper = createStepper(program, undefined, handler);

		stepper.step(); // @pause(500)
		expect(received).toHaveLength(1);
		expect(received[0].name).toBe('pause');

		stepper.step(); // A = point(0, 0)
		expect(received).toHaveLength(1); // no new directive

		stepper.step(); // @instrument("regle")
		expect(received).toHaveLength(2);
		expect(received[1].name).toBe('instrument');
		expect(received[1].args[0]).toEqual({ type: 'string', value: 'regle' });
	});
});

// ─── Reset ───────────────────────────────────────────────────

describe('stepper — reset', () => {
	it('reset() starts over with a fresh figure', () => {
		const script = 'A = point(0, 0)\nB = point(1, 1)';
		const program = parse(script);
		const stepper = createStepper(program);

		stepper.step();
		stepper.step();
		expect(stepper.figure.size).toBe(2);
		expect(stepper.currentIndex).toBe(1);

		stepper.reset();
		expect(stepper.figure.size).toBe(0);
		expect(stepper.currentIndex).toBe(-1);
		expect(stepper.symbols.get('A')).toBeUndefined();

		// Can step again after reset
		stepper.step();
		expect(stepper.figure.size).toBe(1);
		expect(stepper.currentIndex).toBe(0);
	});
});

// ─── Regression: createStepper forwards program.source to the interpreter ──

describe('stepper — mathAST routing source forwarding', () => {
	it('routes \\pi correctly when stepping (regression for createStepper without source)', () => {
		const program = parse('r = \\pi');
		const stepper = createStepper(program);
		stepper.step();
		expect(stepper.symbols.get('r')?.value).toBeCloseTo(Math.PI, 10);
	});

	it('routes math functions like sqrt and exp via parseCustom', () => {
		const program = parse('a = sqrt(2)\nb = exp(1)');
		const stepper = createStepper(program);
		stepper.step();
		stepper.step();
		expect(stepper.symbols.get('a')?.value).toBeCloseTo(Math.SQRT2, 10);
		expect(stepper.symbols.get('b')?.value).toBeCloseTo(Math.E, 10);
	});

	it('preserves routing across reset()', () => {
		const program = parse('r = 2 * \\pi');
		const stepper = createStepper(program);
		stepper.step();
		expect(stepper.symbols.get('r')?.value).toBeCloseTo(2 * Math.PI, 10);
		stepper.reset();
		stepper.step();
		expect(stepper.symbols.get('r')?.value).toBeCloseTo(2 * Math.PI, 10);
	});
});
