/**
 * Ciblé sur la chorégraphie `transporte @euclide` (Euclide I.23).
 *
 * Le fichier `transporte.ts` (~430 LoC) est complexe (21 scalaires hidden,
 * 6 sub-steps, intersection LC avec sélection d'index par probe). Cette suite
 * couvre les 4 modes de direction + 2 cas dégénérés identifiés dans la
 * code-review consolidée (B-A1-1).
 */

import { describe, it, expect } from 'vitest';
import { ConstructionExecutor } from '../executor';

function run(script: string): ConstructionExecutor {
	const exec = new ConstructionExecutor();
	exec.load(script);
	return exec;
}

describe('transporte @euclide — 4 modes de direction', () => {
	it('default direction (axe Ox) produit 7 sub-steps', () => {
		const exec = run(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'al = angle(A, V, B)',
				'Vp = point(5, 0)',
				'be = transporte(al, Vp) @euclide'
			].join('\n')
		);
		// 5 statements + 7 sub-steps = 12 entries.
		expect(exec.totalSteps).toBe(12);
	});

	it('direction par point P (3e arg positionnel) produit 7 sub-steps', () => {
		const exec = run(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'al = angle(A, V, B)',
				'Vp = point(5, 0)',
				'P = point(6, 1)',
				'be = transporte(al, Vp, P) @euclide'
			].join('\n')
		);
		expect(exec.totalSteps).toBe(13); // 6 stmts + 7 sub-steps
	});

	it('direction par vecteur (vec=u) produit 7 sub-steps', () => {
		const exec = run(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'al = angle(A, V, B)',
				'Vp = point(5, 0)',
				'O = point(0, 0)',
				'D = point(1, 1)',
				'u = vecteur(O, D)',
				'be = transporte(al, Vp, vec=u) @euclide'
			].join('\n')
		);
		expect(exec.totalSteps).toBe(15); // 8 stmts + 7 sub-steps
	});

	it('direction par angle scalaire (angle=θ) produit 7 sub-steps', () => {
		const exec = run(
			[
				'A = point(3, 0)',
				'V = point(0, 0)',
				'B = point(0, 3)',
				'al = angle(A, V, B)',
				'Vp = point(5, 0)',
				'be = transporte(al, Vp, angle=0.5) @euclide'
			].join('\n')
		);
		expect(exec.totalSteps).toBe(12);
	});
});

describe('transporte @euclide — cas dégénérés', () => {
	it("α plat (mesure ≈ π) : pas d'erreur, animation cohérente même si arc dégénéré", () => {
		// α = angle plat (180°). |A'B'| ≈ 2 (corde max du cercle r=1), B'' calculé.
		const exec = run(
			[
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(-1, 0)',
				'al = angle(A, V, B)',
				'Vp = point(5, 0)',
				'P = point(6, 1)',
				'be = transporte(al, Vp, P) @euclide'
			].join('\n')
		);
		// La chorégraphie ne doit pas lever. totalSteps déterministe.
		expect(exec.totalSteps).toBe(13);
		expect(exec.loadError).toBeNull();
	});

	it('α aigu (mesure ≈ 30°) : 7 sub-steps tous présents', () => {
		const exec = run(
			[
				'A = point(2, 0)',
				'V = point(0, 0)',
				// B at 30° from x-axis: (cos(π/6), sin(π/6)) ≈ (0.866, 0.5)
				'B = point(1.732, 1)',
				'al = angle(A, V, B)',
				'Vp = point(4, -2)',
				'be = transporte(al, Vp) @euclide'
			].join('\n')
		);
		expect(exec.totalSteps).toBe(12);
		// Avancer jusqu'aux 7 sub-steps et vérifier la séquence.
		for (let i = 0; i < 5; i++) exec.step();
		const kinds: string[] = [];
		for (let i = 0; i < 7; i++) {
			exec.step();
			kinds.push(exec.currentSubStep?.kind ?? 'null');
		}
		expect(kinds).toEqual([
			'compass-draw',
			'compass-draw',
			'point-fade-in',
			'compass-measure',
			'compass-draw',
			'point-fade-in',
			'ruler-trace'
		]);
	});
});

describe('transporte @euclide — mesure préservée post-animation', () => {
	it('mesure(β) ≈ mesure(α) pour angle 60°', () => {
		const exec = run(
			[
				'A = point(2, 0)',
				'V = point(0, 0)',
				// B at 60°
				'B = point(1, 1.732)',
				'al = angle(A, V, B)',
				'Vp = point(5, 0)',
				'P = point(6, 0)',
				'be = transporte(al, Vp, P) @euclide'
			].join('\n')
		);
		exec.executeAll();
		// Find the 2 angles
		const angles = exec.figure
			.getAllElements()
			.filter((el) => el.type === 'angle' && (el.label === 'al' || el.label === 'be'));
		const alpha = angles.find((el) => el.label === 'al') as {
			p1Id: string;
			vertexId: string;
			p2Id: string;
		};
		const beta = angles.find((el) => el.label === 'be') as {
			p1Id: string;
			vertexId: string;
			p2Id: string;
		};
		expect(alpha).toBeDefined();
		expect(beta).toBeDefined();
		const measureAl = exec.figure.createScalarAngleMeasure(alpha.p1Id, alpha.vertexId, alpha.p2Id);
		const measureBe = exec.figure.createScalarAngleMeasure(beta.p1Id, beta.vertexId, beta.p2Id);
		expect(exec.figure.getScalarValue(measureBe)).toBeCloseTo(
			exec.figure.getScalarValue(measureAl)!,
			4
		);
	});
});
