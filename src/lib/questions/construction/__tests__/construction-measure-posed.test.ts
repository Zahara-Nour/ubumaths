/**
 * Case « figure » : mesurer un angle, rapporteur déjà posé
 * (`verifier: mesure AOB, rapporteur posé`, chantier `controles-figure`, lot 8,
 * phase 0 validée par David le 2026-11-03, `docs/archive/wip/controles-figure-progress.md` § 23).
 *
 * Le rapporteur apparaît posé en O, base sur le PREMIER côté nommé ([OA) pour
 * `AOB`), corps du côté de l'autre ; il est figé, l'élève n'a aucun outil et tape
 * seulement la mesure. Le juge est celui du lot 6.
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import { measureWrongScaleFeedback, posedProtractorOf, wrongMeasureFeedback } from '../measure';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';
import type { MeasureCheck } from '$lib/ubumark/types/construction';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function judge(source: string, answer: string) {
	return judgeConstruction(
		checksOf(source),
		constructionPositions(source),
		answer,
		constructionShapes(source),
		constructionExpected(source)
	);
}

function assertChecks(source: string) {
	assertConstructionChecks(
		checksOf(source),
		constructionPositions(source),
		constructionShapes(source),
		constructionExpected(source)
	);
}

function figure(body: string[], verifier = 'mesure AOB, rapporteur posé', header: string[] = []) {
	return ['fenetre: 0 ; 10 ; 0 ; 8', ...header, `verifier: ${verifier}`, '---', ...body].join('\n');
}

/** Angle AOB de `measure` degrés, sommet O(4 ; 3), [OA) horizontal */
function body(measure: number): string[] {
	return [
		'O = point(4, 3)',
		'A = point(7, 3)',
		`B = rotation(A, angle=${measure}, centre=O)`,
		'x = demidroite(O, A)',
		'y = demidroite(O, B)'
	];
}

const SOURCE = figure(body(50));

function posedOf(source: string) {
	const check = checksOf(source)[0] as MeasureCheck;
	return posedProtractorOf(check, constructionPositions(source), constructionShapes(source));
}

describe('Lecture de « verifier: mesure AOB, rapporteur posé »', () => {
	it('lit la pose ; la palette reste le rapporteur (figé à l’écran)', () => {
		const { spec, errors } = readConstructionHeader(SOURCE);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'mesure', points: ['A', 'O', 'B'], posed: true, line: 2 }
		]);
		expect(spec.tools).toEqual(['rapporteur']);
	});

	it('« pose » sans accent, espaces libres : admis', () => {
		const { spec, errors } = readConstructionHeader(
			figure(body(50), 'mesure AOB ,  rapporteur pose')
		);
		expect(errors).toEqual([]);
		expect(spec.checks[0]).toMatchObject({ posed: true });
	});

	it('sans la pose : rien de changé (lot 6)', () => {
		const { spec } = readConstructionHeader(figure(body(50), 'mesure AOB'));
		expect(spec.checks[0]).not.toHaveProperty('posed');
	});

	it.each([['mesure AOB, rapporteur'], ['mesure AOB, posé'], ['mesure AOB rapporteur posé']])(
		'« %s » : refusé, la forme dite',
		(verifier) => {
			const { errors } = readConstructionHeader(figure(body(50), verifier));
			expect(errors.map((e) => e.message).join()).toContain('« mesure AOB, rapporteur posé »');
		}
	);

	it('avec outils: refusé (rien à tracer)', () => {
		const { errors } = readConstructionHeader(
			figure(body(50), 'mesure AOB, rapporteur posé', ['outils: rapporteur'])
		);
		expect(errors.map((e) => e.message).join()).toContain('rapporteur posé');
		expect(errors.map((e) => e.message).join()).toContain('outils:');
	});
});

describe('La pose', () => {
	it('AOB : centre O, base sur [OA), corps vers B (sens trigonométrique)', () => {
		const posed = posedOf(SOURCE);
		expect(posed?.center).toEqual({ x: 4, y: 3 });
		expect(posed?.base).toEqual({ x: 7, y: 3 });
		expect(posed?.sens).toBe(1);
		// 0,35 du plus petit côté de la fenêtre (§ 18)
		expect(posed?.radius).toBeCloseTo(2.8);
	});

	it('BOA : base sur [OB), corps vers A', () => {
		const posed = posedOf(figure(body(50), 'mesure BOA, rapporteur posé'));
		expect(posed?.base.x).toBeCloseTo(4 + 3 * Math.cos((50 * Math.PI) / 180));
		expect(posed?.sens).toBe(-1);
	});

	it('sans « rapporteur posé » : aucune pose', () => {
		expect(posedOf(figure(body(50), 'mesure AOB'))).toBeNull();
	});
});

describe('Juge : celui du lot 6', () => {
	it('50 juste ; 130 mauvaise graduation ; 45 la mesure lue', () => {
		expect(judge(SOURCE, 'mesure(50)').status).toBe('correct');
		expect(judge(SOURCE, 'mesure(130)').feedback).toBe(measureWrongScaleFeedback(130, 50));
		expect(judge(SOURCE, 'mesure(45)').feedback).toBe(wrongMeasureFeedback(45, 50));
	});

	it('angle obtus, base sur [OB) : juste', () => {
		const source = figure(body(130), 'mesure BOA, rapporteur posé');
		expect(judge(source, 'mesure(130)').status).toBe('correct');
	});
});

describe('Erreurs d’auteur', () => {
	// O près du bord gauche : posé sur [OA) (horizontal), corps vers B, il sort à gauche ;
	// posé sur [OB) (à 80°), corps vers A, il tient
	const nearEdge = [
		'O = point(1, 4)',
		'A = point(4, 4)',
		'B = rotation(A, angle=80, centre=O)',
		'x = demidroite(O, A)',
		'y = demidroite(O, B)'
	];

	it('la pose demandée sort de la figure, l’autre tient : écrire BOA', () => {
		const source = figure(nearEdge);
		expect(() => assertChecks(source)).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(source)).toThrow(
			/rapporteur posé sur \[OA\) sort de la figure.*« mesure BOA, rapporteur posé »/
		);
		expect(() => assertChecks(figure(nearEdge, 'mesure BOA, rapporteur posé'))).not.toThrow();
		expect(posedOf(source)).toBeNull();
	});

	it('aucune pose ne tient : le message du lot 6', () => {
		const source = figure([
			'O = point(0.5, 0.5)',
			'A = point(3, 0.5)',
			'B = rotation(A, angle=60, centre=O)',
			'x = demidroite(O, A)',
			'y = demidroite(O, B)'
		]);
		expect(() => assertChecks(source)).toThrow(/sur \[OA\) comme sur \[OB\)/);
	});

	it('les erreurs du lot 6 restent (angle non entier)', () => {
		const odd = figure([
			'O = point(4, 3)',
			'A = point(7, 3)',
			'B = point(6, 6)',
			'x = demidroite(O, A)',
			'y = demidroite(O, B)'
		]);
		expect(() => assertChecks(odd)).toThrow(/pas un nombre entier de degrés/);
	});
});
