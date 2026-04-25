import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';

// ─── Loading ─────────────────────────────────────────────────

describe('executor — loading', () => {
	it('loads a DSL script and creates a stepper', () => {
		const executor = new ConstructionExecutor();
		executor.load('A = point(0, 0)\nB = point(1, 1)');
		expect(executor.totalSteps).toBe(2);
		expect(executor.currentStepIndex).toBe(-1);
	});

	it('produces a figure after stepping through all steps', () => {
		const executor = new ConstructionExecutor();
		executor.load('A = point(3, 4)\nB = point(5, 6)\nsegment(A, B)');
		executor.executeAll();
		expect(executor.figure.size).toBe(3); // 2 points + 1 segment
	});

	it('step() advances one step', () => {
		const executor = new ConstructionExecutor();
		executor.load('A = point(0, 0)\nB = point(1, 1)');
		expect(executor.step()).toBe(true);
		expect(executor.currentStepIndex).toBe(0);
		expect(executor.figure.size).toBe(1);
	});
});

// ─── Directives ──────────────────────────────────────────────

describe('executor — directive handling', () => {
	it('@pause(500) sets step duration to 500ms', () => {
		const executor = new ConstructionExecutor();
		executor.load('A = point(0, 0)\n@pause(500)\nB = point(1, 1)');
		expect(executor.stepDurations[1]).toBe(500);
	});

	it('@pause without argument uses default duration', () => {
		const executor = new ConstructionExecutor();
		executor.load('@pause');
		expect(executor.stepDurations[0]).toBe(300); // DEFAULT_PAUSE_DURATION
	});

	it('@instrument("regle") updates instrumentStates', () => {
		const executor = new ConstructionExecutor();
		executor.load('@instrument("regle")\nA = point(0, 0)');
		executor.step(); // @instrument
		expect(executor.instrumentStates.get('ruler')?.visible).toBe(true);
	});

	it('@instruction("texte") updates currentInstruction', () => {
		const executor = new ConstructionExecutor();
		executor.load('@instruction("Tracer le segment")\nA = point(0, 0)');
		executor.step(); // @instruction
		expect(executor.currentInstruction).toBe('Tracer le segment');
	});

	it('@vitesse(2) multiplies speed factor', () => {
		const executor = new ConstructionExecutor();
		executor.load('A = point(0, 0)\n@vitesse(2)\nB = point(1, 1)');
		// Step 0 has default duration, step 2 has duration / 2
		const durationBefore = executor.stepDurations[0];
		const durationAfter = executor.stepDurations[2];
		expect(durationAfter).toBeLessThan(durationBefore);
	});

	it('@cacher hides instruments', () => {
		const executor = new ConstructionExecutor();
		executor.load('@instrument("regle")\n@cacher');
		executor.step(); // @instrument — shows ruler
		executor.step(); // @cacher — hides all
		// All instruments should be hidden
		for (const [, state] of executor.instrumentStates) {
			expect(state.visible).toBe(false);
		}
	});

	it('@montrer("regle") shows specific instrument', () => {
		const executor = new ConstructionExecutor();
		executor.load('@montrer("regle")');
		executor.step();
		expect(executor.instrumentStates.get('ruler')?.visible).toBe(true);
	});
});

// ─── Step durations ──────────────────────────────────────────

describe('executor — step durations', () => {
	it('geometric steps have default duration', () => {
		const executor = new ConstructionExecutor();
		executor.load('A = point(0, 0)');
		expect(executor.stepDurations[0]).toBeGreaterThan(0);
	});

	it('directive steps (non-pause) have zero duration', () => {
		const executor = new ConstructionExecutor();
		executor.load('@instrument("regle")');
		expect(executor.stepDurations[0]).toBe(0);
	});
});

// ─── Instrument movement consistency ────────────────────────

describe('executor — instrument movement from last position', () => {
	it('ruler slides from previous segment position, not from default (-8, 6)', () => {
		const executor = new ConstructionExecutor();
		// Two segments: first at (0,0)→(3,0), second at (5,0)→(8,0)
		executor.load(
			'A = point(0, 0)\nB = point(3, 0)\nsegment(A, B)\nC = point(5, 0)\nD = point(8, 0)\nsegment(C, D)'
		);
		// Step through: A, B, segment(A,B), C, D, segment(C,D)
		executor.step(); // A
		executor.step(); // B
		executor.step(); // segment(A,B) — ruler auto-shown

		const move1 = executor.instrumentMoves.get('ruler');
		expect(move1).toBeDefined();
		// First appearance: starts from default (-8, 6)
		expect(move1!.fromX).toBe(-8);
		expect(move1!.fromY).toBe(6);

		executor.step(); // C — hideAutoInstruments runs, ruler hidden
		executor.step(); // D
		executor.step(); // segment(C,D) — ruler auto-shown again

		const move2 = executor.instrumentMoves.get('ruler');
		expect(move2).toBeDefined();
		// Second appearance: should start from segment(A,B) ruler position, NOT (-8, 6)
		expect(move2!.fromX).not.toBe(-8);
		expect(move2!.fromY).not.toBe(6);
	});

	it('compass slides from previous arc center, not from default', () => {
		const executor = new ConstructionExecutor();
		executor.load(
			'O1 = point(0, 0)\narc(O1, rayon=2, debut=0, fin=180)\nO2 = point(5, 0)\narc(O2, rayon=1, debut=0, fin=90)'
		);
		// Step through: O1, arc1, O2, arc2
		executor.step(); // O1
		executor.step(); // arc(O1,...) — compass auto-shown

		const move1 = executor.instrumentMoves.get('compass');
		expect(move1).toBeDefined();
		expect(move1!.fromX).toBe(-8); // first appearance

		executor.step(); // O2
		executor.step(); // arc(O2,...) — compass auto-shown again

		const move2 = executor.instrumentMoves.get('compass');
		expect(move2).toBeDefined();
		// Should start from O1 (0,0), not default (-8,6)
		expect(move2!.fromX).toBe(0);
		expect(move2!.fromY).toBe(0);
	});
});

// ─── Reset ───────────────────────────────────────────────────

describe('executor — reset and re-use', () => {
	it('reset() restarts from scratch', () => {
		const executor = new ConstructionExecutor();
		executor.load('A = point(0, 0)\nB = point(1, 1)');
		executor.executeAll();
		expect(executor.figure.size).toBe(2);

		executor.reset();
		expect(executor.figure.size).toBe(0);
		expect(executor.currentStepIndex).toBe(-1);
		expect(executor.currentInstruction).toBeNull();
	});

	it('load() called twice resets all state', () => {
		const executor = new ConstructionExecutor();
		executor.load('@instrument("regle")\nA = point(0, 0)');
		executor.step();
		executor.step();
		expect(executor.instrumentStates.get('ruler')?.visible).toBe(true);

		executor.load('B = point(1, 1)');
		expect(executor.currentStepIndex).toBe(-1);
		expect(executor.instrumentStates.size).toBe(0);
		expect(executor.totalSteps).toBe(1);
	});
});
