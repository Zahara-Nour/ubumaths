/**
 * `seekTo` (écart L56) : le lecteur ne rejoue plus toute la construction à
 * chaque pas. En avant, seuls les pas manquants sont joués ; en arrière, la
 * lecture repart du début sans refaire la pré-simulation. L'état obtenu doit
 * être exactement celui d'une relecture depuis le début.
 */

import { describe, it, expect, vi } from 'vitest';
import { ConstructionExecutor } from '../executor';
import { numeric } from '#lib/geometry-core/types/geo-value.ts';

const SCRIPT = [
	'@instruction("On trace la médiatrice")',
	'A = point(0, 0)',
	'B = point(6.4, 0)',
	'@pause(300)',
	'd = mediatrice(A, B) @mesure',
	'C = point(2, 3)',
	'p = perpendiculaire(C, A, B) @equerre'
].join('\n');

/**
 * Ce que le lecteur lit de l'exécuteur après un déplacement, en données
 * seules : les fonctions de calcul des éléments (`compute`) sont des
 * fermetures neuves à chaque relecture, jamais égales entre deux exécuteurs.
 */
function snapshot(exec: ConstructionExecutor): unknown {
	return JSON.parse(JSON.stringify(rawSnapshot(exec)));
}

function rawSnapshot(exec: ConstructionExecutor) {
	return {
		index: exec.currentStepIndex,
		elements: exec.figure.getAllElements(),
		instruments: [...exec.instrumentStates],
		instruction: exec.currentInstruction,
		subStep: exec.currentSubStep,
		newElements: exec.lastStepNewElementIds,
		newPoints: exec.lastStepNewPointIds,
		newLines: exec.lastStepNewLineIds,
		auto: [...exec.autoInstruments],
		moves: [...exec.instrumentMoves],
		held: [...exec.heldInstruments],
		endPoses: [...exec.instrumentEndPoses],
		phases: [exec.movePhaseEnd, exec.drawPhaseStart, exec.drawPhaseEnd, exec.pausePhaseStart],
		radii: [exec.compassPrevRadius, exec.compassCurRadius]
	};
}

/** Relecture depuis le début, comme le faisait le lecteur avant L56. */
function replay(stepIndex: number): unknown {
	const exec = new ConstructionExecutor();
	exec.load(SCRIPT);
	for (let i = 0; i <= stepIndex; i++) exec.step();
	return snapshot(exec);
}

describe('seekTo', () => {
	it('pas à pas en avant : même état qu’une relecture depuis le début', () => {
		const exec = new ConstructionExecutor();
		exec.load(SCRIPT);
		expect(exec.loadError).toBeNull();
		expect(exec.totalSteps).toBeGreaterThan(10);
		for (let k = 0; k < exec.totalSteps; k++) {
			exec.seekTo(k);
			expect(snapshot(exec)).toEqual(replay(k));
		}
	});

	it('en arrière et par sauts : même état qu’une relecture depuis le début', () => {
		const exec = new ConstructionExecutor();
		exec.load(SCRIPT);
		const last = exec.totalSteps - 1;
		for (const k of [last, 3, 3, 8, 0, last, 5]) {
			exec.seekTo(k);
			expect(snapshot(exec)).toEqual(replay(k));
		}
	});

	it('avancer d’un pas joue un seul pas, sans pré-simulation', () => {
		const exec = new ConstructionExecutor();
		exec.load(SCRIPT);
		exec.seekTo(6);
		const step = vi.spyOn(exec, 'step');
		exec.seekTo(7);
		expect(step).toHaveBeenCalledTimes(1);
	});

	it('reculer garde la frise et les durées calculées au chargement', () => {
		const exec = new ConstructionExecutor();
		exec.load(SCRIPT);
		const plan = exec.plan;
		const durations = exec.stepDurations;
		exec.seekTo(9);
		exec.seekTo(2);
		expect(exec.plan).toBe(plan);
		expect(exec.stepDurations).toBe(durations);
	});

	it('un point déplacé à la souris : le pas suivant repart du début', () => {
		const exec = new ConstructionExecutor();
		exec.load(SCRIPT);
		const last = exec.totalSteps - 1;
		exec.seekTo(last - 1);
		const C = exec.figure.getAllElements().find((el) => el.label === 'C');
		expect(C).toBeDefined();
		exec.figure.movePoint(C!.id, numeric(-4), numeric(5));
		const step = vi.spyOn(exec, 'step');
		exec.seekTo(last);
		expect(step.mock.calls.length).toBe(last + 1);
		step.mockRestore();
		expect(snapshot(exec)).toEqual(replay(last));
	});

	it('un pas qui échoue : le déplacement suivant repart du début', () => {
		const exec = new ConstructionExecutor();
		exec.load(SCRIPT);
		exec.seekTo(4);
		const realStep = exec.step.bind(exec);
		let calls = 0;
		const step = vi.spyOn(exec, 'step').mockImplementation(() => {
			calls++;
			if (calls === 2) throw new Error('pas cassé');
			return realStep();
		});
		expect(() => exec.seekTo(8)).toThrow('pas cassé');
		step.mockRestore();
		exec.seekTo(9);
		expect(snapshot(exec)).toEqual(replay(9));
	});
});
