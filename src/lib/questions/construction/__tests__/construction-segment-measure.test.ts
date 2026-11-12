/**
 * Case « figure » : mesurer un segment en posant la règle graduée
 * (`verifier: mesure AB`, n° 26 de `outils-manquants.md`, CP-035, CE1-044 ;
 * phase 0 validée par David le 2026-11-12, `docs/wip/amelioration-progress.md`
 * § N° 26).
 *
 * Le segment [AB] est tracé ; l'élève pose la règle (jamais notée) et tape la
 * longueur sous la figure (`mesure(6)`, en dernier dans la réponse). La longueur
 * attendue est calculée sur la figure (1 unité = 1 cm, ADR 0036) ; juste =
 * exacte. Règle posée le long de [AB] sans son 0 en A (ni en B) et lecture du
 * bout : « Le 0 de la règle doit être sur A ».
 */
import { describe, it, expect } from 'vitest';
import '../positions-setup';
import { constructionExpected, constructionPositions, constructionShapes } from '../positions';
import { ConstructionAuthorError, assertConstructionChecks, judgeConstruction } from '../judge';
import {
	missingSegmentMeasureFeedback,
	segmentMeasureZeroFeedback,
	wrongSegmentMeasureFeedback
} from '../segment-measure';
import { solutionLines, solutionRuler, solutionSegmentMeasure } from '../drawing';
import { serializeMeasuredAnswer, type DrawnObject, type DrawnRegle } from '../answer';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';

function checksOf(source: string) {
	const { spec, errors } = readConstructionHeader(source);
	expect(errors).toEqual([]);
	return spec.checks;
}

function judge(source: string, objects: DrawnObject[], typed: number | null) {
	return judgeConstruction(
		checksOf(source),
		constructionPositions(source),
		serializeMeasuredAnswer(objects, typed),
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

function figure(
	body: string[],
	{
		header = [],
		verifier = 'mesure AB',
		window = '0 ; 12 ; 0 ; 6'
	}: { header?: string[]; verifier?: string; window?: string } = {}
): string {
	return [`fenetre: ${window}`, ...header, `verifier: ${verifier}`, '---', ...body].join('\n');
}

/** [AB] horizontal, de A(2 ; 3) à B(2 + length ; 3) */
function body(length: number): string[] {
	return ['A = point(2, 3)', `B = point(${2 + length}, 3)`, 's = segment(A, B)'];
}

const SOURCE = figure(body(6));

/** Règle posée : le 0 en (ox ; 3), graduations vers la droite (ou la gauche si `toward` < ox) */
function ruler(ox: number, toward = 11): DrawnRegle {
	return { kind: 'regle', ox, oy: 3, bx: toward, by: 3, sens: 1 };
}

describe('Lecture de « verifier: mesure AB »', () => {
	it('lit les deux bouts ; en cm par défaut ; palette déduite : la règle graduée seule', () => {
		const { spec, errors } = readConstructionHeader(SOURCE);
		expect(errors).toEqual([]);
		expect(spec.checks).toEqual([
			{ kind: 'mesure_segment', points: ['A', 'B'], unit: 'cm', line: 2 }
		]);
		expect(spec.tools).toEqual(['regle']);
	});

	it('« mesure AB en mm » : en millimètres ; « en cm » permis', () => {
		const mm = readConstructionHeader(figure(body(6), { verifier: 'mesure AB en mm' }));
		expect(mm.errors).toEqual([]);
		expect(mm.spec.checks[0]).toMatchObject({ kind: 'mesure_segment', unit: 'mm' });
		const cm = readConstructionHeader(figure(body(6), { verifier: 'mesure AB en cm' }));
		expect(cm.spec.checks[0]).toMatchObject({ kind: 'mesure_segment', unit: 'cm' });
	});

	it('« mesure AOB » reste l’angle', () => {
		const { spec } = readConstructionHeader(
			['fenetre: 0 ; 10 ; 0 ; 8', 'verifier: mesure AOB', '---', 'O = point(4, 3)'].join('\n')
		);
		expect(spec.checks[0]).toMatchObject({ kind: 'mesure', points: ['A', 'O', 'B'] });
	});

	it.each([
		['mesure AA', 'deux points différents'],
		['mesure AB en km', 'en cm ou en mm'],
		['mesure AB, règle posée', 'en cm ou en mm'],
		['mesure A', 'mesure AB']
	])('« %s » : refusé', (verifier, message) => {
		const { errors } = readConstructionHeader(figure(body(6), { verifier }));
		expect(errors.map((e) => e.message).join()).toContain(message);
	});

	it('« verifier: mesure_segment AB » : inconnu (on écrit « mesure AB »)', () => {
		const { errors } = readConstructionHeader(figure(body(6), { verifier: 'mesure_segment AB' }));
		expect(errors.map((e) => e.message).join()).toContain('mesure AB');
	});

	it('refuse un autre outil, un quadrillage, une autre vérification', () => {
		const tool = readConstructionHeader(figure(body(6), { header: ['outils: regle, segment'] }));
		expect(tool.errors.map((e) => e.message).join()).toContain('outil segment hors de la palette');
		const grid = readConstructionHeader(figure(body(6), { header: ['grille: 1'] }));
		expect(grid.errors.map((e) => e.message).join()).toContain('papier uni');
		const mixed = readConstructionHeader(
			figure(body(6), { header: ['outils: regle', 'verifier: droite_par A ; B'] })
		);
		expect(mixed.errors.map((e) => e.message).join()).toContain('ne se mêle pas');
	});

	it('la règle graduée refusée ailleurs dit aussi « mesure AB »', () => {
		const { errors } = readConstructionHeader(
			[
				'fenetre: 0 ; 12 ; 0 ; 6',
				'outils: regle',
				'verifier: droite_par A ; B',
				'---',
				...body(6)
			].join('\n')
		);
		expect(errors.map((e) => e.message).join()).toContain('mesure AB');
	});
});

describe('Juge : mesurer un segment', () => {
	it('nominal : 6 → juste, règle posée au 0 en A, ou en B vers A, ou sans règle', () => {
		expect(judge(SOURCE, [ruler(2)], 6)).toEqual({ status: 'correct' });
		expect(judge(SOURCE, [ruler(8, 0)], 6)).toEqual({ status: 'correct' });
		expect(judge(SOURCE, [], 6)).toEqual({ status: 'correct' });
		// Plusieurs règles posées : aucune incidence
		expect(judge(SOURCE, [ruler(1), ruler(2)], 6)).toEqual({ status: 'correct' });
	});

	it('autre longueur : faux, la longueur de la figure dite', () => {
		expect(judge(SOURCE, [ruler(2)], 5)).toEqual({
			status: 'incorrect',
			feedback: wrongSegmentMeasureFeedback('AB', 5, 6, 'cm')
		});
		expect(wrongSegmentMeasureFeedback('AB', 5, 6, 'cm')).toBe(
			'Le segment [AB] mesure 6 cm, pas 5 cm.'
		);
	});

	it('règle posée le 0 avant A, lecture en B : « le 0 doit être sur A »', () => {
		// 0 en x = 1 : A est à 1 cm, B à 7 cm ; l'élève lit 7
		expect(judge(SOURCE, [ruler(1)], 7)).toEqual({
			status: 'incorrect',
			feedback: segmentMeasureZeroFeedback('AB', 7, 6, 'cm')
		});
		expect(segmentMeasureZeroFeedback('AB', 7, 6, 'cm')).toBe(
			'Le 0 de la règle doit être sur A : le segment [AB] mesure 6 cm, pas 7 cm.'
		);
		// Lu à l'œil, au cm près (0 à 0,4 cm avant A : B à 6,4 → 6 serait juste, 7 non)
		expect(judge(SOURCE, [ruler(0.4)], 8)).toEqual({
			status: 'incorrect',
			feedback: segmentMeasureZeroFeedback('AB', 8, 6, 'cm')
		});
	});

	it('règle posée depuis B, le 0 un peu après B : « le 0 doit être sur B » (revue)', () => {
		// 0 en x = 9, graduations vers la gauche : B à 1 cm, A à 7 cm ; l'élève lit 7
		expect(judge(SOURCE, [ruler(9, 0)], 7)).toEqual({
			status: 'incorrect',
			feedback: segmentMeasureZeroFeedback('AB', 7, 6, 'cm', 'B')
		});
		expect(segmentMeasureZeroFeedback('AB', 7, 6, 'cm', 'B')).toBe(
			'Le 0 de la règle doit être sur B : le segment [AB] mesure 6 cm, pas 7 cm.'
		);
	});

	it('règle qui ne longe pas [AB] : message ordinaire', () => {
		const away: DrawnRegle = { kind: 'regle', ox: 1, oy: 5, bx: 11, by: 5, sens: 1 };
		expect(judge(SOURCE, [away], 7)).toEqual({
			status: 'incorrect',
			feedback: wrongSegmentMeasureFeedback('AB', 7, 6, 'cm')
		});
	});

	it('en mm : 53 mm juste ; 0 avant A → « le 0 doit être sur A »', () => {
		const source = figure(body(5.3), { verifier: 'mesure AB en mm' });
		expect(judge(source, [ruler(2)], 53)).toEqual({ status: 'correct' });
		expect(judge(source, [ruler(1)], 63)).toEqual({
			status: 'incorrect',
			feedback: segmentMeasureZeroFeedback('AB', 63, 53, 'mm')
		});
		expect(judge(source, [ruler(2)], 5)).toEqual({
			status: 'incorrect',
			feedback: wrongSegmentMeasureFeedback('AB', 5, 53, 'mm')
		});
	});

	it('rien : vide ; une règle sans longueur : faux, avec la consigne', () => {
		expect(judge(SOURCE, [], null)).toEqual({ status: 'empty' });
		expect(judge(SOURCE, [ruler(2)], null)).toEqual({
			status: 'incorrect',
			feedback: missingSegmentMeasureFeedback('AB', 'cm')
		});
		expect(missingSegmentMeasureFeedback('AB', 'cm')).toBe(
			'Tape la longueur du segment [AB], en cm.'
		);
	});

	it('un trait, un repère ou une réponse forgée : faux sans message', () => {
		const segment: DrawnObject = { kind: 'segment', x1: 2, y1: 3, x2: 8, y2: 3 };
		expect(judge(SOURCE, [segment], 6)).toEqual({ status: 'incorrect' });
		const mark: DrawnObject = {
			kind: 'repere',
			vx: 2,
			vy: 3,
			ax: 8,
			ay: 3,
			r: 2,
			deg: 10,
			sens: 1
		};
		expect(judge(SOURCE, [mark], 6)).toEqual({ status: 'incorrect' });
		const forged = judgeConstruction(
			checksOf(SOURCE),
			constructionPositions(SOURCE),
			'mesure(6)|mesure(6)',
			constructionShapes(SOURCE)
		);
		expect(forged).toEqual({ status: 'incorrect' });
	});
});

describe('Erreurs d’auteur', () => {
	it('figure qui se mesure : rien', () => {
		expect(() => assertChecks(SOURCE)).not.toThrow();
		expect(() => assertChecks(figure(body(5.3), { verifier: 'mesure AB en mm' }))).not.toThrow();
	});

	it('longueur pas entière dans l’unité de la case', () => {
		expect(() => assertChecks(figure(body(5.3)))).toThrow(ConstructionAuthorError);
		expect(() => assertChecks(figure(body(5.3)))).toThrow(/nombre entier de cm.*mesure AB en mm/);
		expect(() => assertChecks(figure(body(5.35), { verifier: 'mesure AB en mm' }))).toThrow(
			/nombre entier de mm/
		);
	});

	it('[AB] non tracé, ou tracé en partie', () => {
		const untraced = figure(['A = point(2, 3)', 'B = point(8, 3)']);
		expect(() => assertChecks(untraced)).toThrow(/\[AB\] n’est pas tracé/);
		const partial = figure([
			'A = point(2, 3)',
			'B = point(8, 3)',
			'C = point(5, 3)',
			's = segment(A, C)'
		]);
		expect(() => assertChecks(partial)).toThrow(/\[AB\] n’est pas tracé/);
	});

	it('[AB] porté par une droite : se mesure', () => {
		const line = figure(['A = point(2, 3)', 'B = point(8, 3)', 'd = droite(A, B)']);
		expect(() => assertChecks(line)).not.toThrow();
	});

	it('point absent, invisible, hors de la fenêtre', () => {
		expect(() => assertChecks(figure(['A = point(2, 3)']))).toThrow(/B n’existe pas/);
		const hidden = figure([
			'A = point(2, 3)',
			'B = point(8, 3, visible=faux)',
			's = segment(A, B)'
		]);
		expect(() => assertChecks(hidden)).toThrow(/B n’est pas visible/);
		const outside = figure(body(6), { window: '0 ; 7 ; 0 ; 6' });
		expect(() => assertChecks(outside)).toThrow(/hors de la fenêtre/);
	});

	it('segment plus long que la règle', () => {
		// Règle de 12 cm (fenêtre de 12,5 cm), segment de 13 cm en diagonale
		const long = figure(['A = point(0.25, 0.5)', 'B = point(12.25, 5.5)', 's = segment(A, B)'], {
			window: '0 ; 12.5 ; 0 ; 6.5'
		});
		expect(() => assertChecks(long)).toThrow(/plus long que la règle \(12 cm :/);
	});
});

describe('Correction', () => {
	it('la règle posée au 0 en A le long de [AB], la longueur écrite ; aucun trait', () => {
		const checks = checksOf(SOURCE);
		const points = constructionPositions(SOURCE);
		const shapes = constructionShapes(SOURCE);
		const good = solutionRuler(checks, points, shapes, []);
		expect(good).toMatchObject({ kind: 'regle', ox: 2, oy: 3, by: 3 });
		expect(good && good.bx > 2).toBe(true);
		expect(solutionLines(checks, points, [], shapes)).toEqual([]);
		expect(solutionSegmentMeasure(checks, points, shapes)).toEqual({
			from: { x: 2, y: 3 },
			to: { x: 8, y: 3 },
			text: '6 cm'
		});
		const mm = figure(body(5.3), { verifier: 'mesure AB en mm' });
		expect(
			solutionSegmentMeasure(checksOf(mm), constructionPositions(mm), constructionShapes(mm))?.text
		).toBe('53 mm');
	});
});
