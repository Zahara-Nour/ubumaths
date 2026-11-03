/**
 * Bloc ```solide + `tracer: vecteur …` — analyse, réponse attendue, juge, phrases,
 * correction et PDF (chantier `solide-vecteur`, lot 2 ; spécification :
 * `docs/wip/solide-vecteur-progress.md`, Phase 0, points 2 à 5)
 *
 * Cube de côté 2 : A(0,0,0) B(2,0,0) C(2,0,2) D(0,0,2) E(0,2,0) F(2,2,0)
 * G(2,2,2) H(0,2,2) — AB vers la droite, AD vers le fond, AE vers le haut.
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '$lib/ubumark/generators/espace-typst';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { SolideSpec } from '$lib/ubumark/types/espace';
import { buildSolideScene, solideArrowBetween } from '$lib/ubumark/utils/espace-solides';
import {
	BOTH_MISSING,
	END_MISSING,
	SAME_POINT,
	WRONG_DIRECTION,
	WRONG_ORIGIN,
	combinationLatex,
	expectedSolideAnswer,
	isSolideAnswerCorrect,
	readSolideAnswer,
	solideAnswer,
	solideClickablePoints,
	solidePointAt,
	solideSolutionVector,
	solideVectorMistake
} from '$lib/ubumark/utils/solide-gestes';

const CUBE = ['forme: cube 2', 'sommets: A B C D E F G H'];

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};
const errors = (...lines: string[]) => read(...lines).errors.join(' | ');
const expectedOf = (...lines: string[]) => expectedSolideAnswer(spec(...lines));

describe('```solide — tracer: (analyse)', () => {
	it('somme de vecteurs, origine imposée', () => {
		expect(spec(...CUBE, 'tracer: vecteur AB + AD + AE depuis A').task).toEqual({
			kind: 'vecteur',
			terms: [
				{ coef: 1, from: 0, to: 1 },
				{ coef: 1, from: 0, to: 3 },
				{ coef: 1, from: 0, to: 4 }
			],
			origin: 0
		});
	});

	it('origine libre : `depuis` facultatif', () => {
		expect(spec(...CUBE, 'tracer: vecteur AB').task).toEqual({
			kind: 'vecteur',
			terms: [{ coef: 1, from: 0, to: 1 }],
			origin: null
		});
	});

	it('coefficients entiers et demis, signes, points déclarés', () => {
		const s = spec(
			...CUBE,
			'points: I milieu AE, K milieu CG',
			'tracer: vecteur AB + AD - 1/2 AE depuis E'
		);
		expect(s.task?.terms).toEqual([
			{ coef: 1, from: 0, to: 1 },
			{ coef: 1, from: 0, to: 3 },
			{ coef: -0.5, from: 0, to: 4 }
		]);
		expect(
			spec(...CUBE, 'points: I milieu AE', 'tracer: vecteur 2 AI depuis A').task?.terms
		).toEqual([{ coef: 2, from: 0, to: 8 }]);
		expect(spec(...CUBE, 'tracer: vecteur -AB + AD depuis B').task?.terms).toEqual([
			{ coef: -1, from: 0, to: 1 },
			{ coef: 1, from: 0, to: 3 }
		]);
		// Coefficient collé au nom, 3/2
		expect(
			spec(...CUBE, 'points: I milieu AE', 'tracer: vecteur 3/2AI + 1/2 AI depuis A').task?.terms
		).toEqual([
			{ coef: 1.5, from: 0, to: 8 },
			{ coef: 0.5, from: 0, to: 8 }
		]);
	});

	it('vecteurs: et tracer: vont ensemble', () => {
		const s = spec(...CUBE, 'vecteurs: AB, AD', 'tracer: vecteur AB + AD');
		expect(s.vectors).toHaveLength(2);
		expect(s.task?.terms).toHaveLength(2);
	});

	it('refusé : solide rond, sans sommets:', () => {
		expect(errors('forme: cylindre 2 5', "sommets: O O'", "tracer: vecteur OO'")).toMatch(
			/polyèdres seulement/
		);
		expect(errors('forme: cube 2', 'tracer: vecteur AB')).toMatch(/nomme les sommets/);
	});

	it('refusé : nom inconnu, `depuis` sur un point inconnu', () => {
		expect(errors(...CUBE, 'tracer: vecteur AZ')).toMatch(/aucun point ne s’appelle Z/);
		expect(errors(...CUBE, 'tracer: vecteur AB depuis Z')).toMatch(/aucun point ne s’appelle Z/);
	});

	it('refusé : vecteur nul (un terme, ou la somme)', () => {
		expect(errors(...CUBE, 'tracer: vecteur AA')).toMatch(/vecteur nul/);
		expect(errors(...CUBE, 'tracer: vecteur AB - AB')).toMatch(/vecteur nul/);
		expect(errors(...CUBE, 'tracer: vecteur AB + BA')).toMatch(/vecteur nul/);
	});

	it('refusé : l’extrémité ne tombe sur aucun point cliquable', () => {
		// Depuis l'origine imposée : A + 2 AB sort du cube
		expect(errors(...CUBE, 'tracer: vecteur 2 AB depuis A')).toMatch(
			/depuis A, l’extrémité ne tombe sur aucun point/
		);
		// Origine libre : aucun représentant entre deux points du solide
		expect(errors(...CUBE, 'tracer: vecteur 2 AB')).toMatch(/aucun point/);
		expect(errors(...CUBE, 'tracer: vecteur 1/2 AB')).toMatch(/aucun point/);
	});

	it('refusé : coefficient ni entier ni demi, coefficient nul, écriture non comprise', () => {
		expect(errors(...CUBE, 'tracer: vecteur 1/3 AB')).toMatch(/entiers ou demis/);
		expect(errors(...CUBE, 'tracer: vecteur 0 AB + AD')).toMatch(/coefficient nul/);
		expect(errors(...CUBE, 'tracer: AB + AD')).toMatch(/tracer: vecteur AB \+ AD/);
		expect(errors(...CUBE, 'tracer: vecteur AB AD')).toMatch(/non compris/);
		expect(errors(...CUBE, 'tracer: vecteur A')).toMatch(/deux points/);
	});

	it('refusé : deux lignes tracer:', () => {
		expect(errors(...CUBE, 'tracer: vecteur AB', 'tracer: vecteur AD')).toMatch(
			/« tracer » déjà donnée ligne 3/
		);
	});

	it('case: posée par le générateur ; sans tracer:, refusée', () => {
		expect(read('case: 2', ...CUBE, 'tracer: vecteur AB').caseIndex).toBe(2);
		expect(errors('case: 2', ...CUBE)).toMatch(/case: sans objet sans tracer:/);
	});
});

describe('points cliquables', () => {
	it('sommets nommés, puis points déclarés, avec leurs indices', () => {
		const s = spec('forme: cube 2', 'sommets: A B C D - - - -', 'points: I milieu AC');
		expect(solideClickablePoints(s).map((p) => [p.index, p.name])).toEqual([
			[0, 'A'],
			[1, 'B'],
			[2, 'C'],
			[3, 'D'],
			[8, 'I']
		]);
	});

	it('leur position à l’écran : celle de la scène', () => {
		const s = spec(...CUBE, 'points: I milieu AE');
		const scene = buildSolideScene(s);
		expect(solidePointAt(scene, 6)).toEqual(scene.vertices[6]);
		expect(solidePointAt(scene, 8)).toEqual(scene.points[0]);
	});
});

describe('réponse attendue et juge', () => {
	it('origine imposée : un seul couple', () => {
		expect(expectedOf(...CUBE, 'tracer: vecteur AB + AD + AE depuis A')).toBe('A/G');
		expect(expectedOf(...CUBE, 'tracer: vecteur AB depuis D')).toBe('D/C');
	});

	it('origine libre : depuis le premier point du premier vecteur, puis tout représentant', () => {
		const expected = expectedOf(...CUBE, 'tracer: vecteur AB');
		expect(expected.split('|')[0]).toBe('A/B');
		expect(expected.split('|').sort()).toEqual(['A/B', 'D/C', 'E/F', 'H/G']);
		expect(isSolideAnswerCorrect('H/G', expected)).toBe(true);
		expect(isSolideAnswerCorrect('B/A', expected)).toBe(false);
	});

	it('origine libre, avec des points déclarés (½ AE)', () => {
		const expected = expectedOf(
			...CUBE,
			'points: I milieu AE, J milieu BF',
			'tracer: vecteur 1/2 AE'
		);
		expect(expected.split('|')[0]).toBe('A/I');
		expect(expected.split('|').sort()).toEqual(['A/I', 'B/J', 'I/E', 'J/F']);
	});

	it('origine libre, le premier point ne porte pas le vecteur : le premier couple qui tombe', () => {
		// Depuis B : B + BA + ½ AE = milieu de [AE], non déclaré ; depuis J (milieu de [BF]) : E
		const s = spec(...CUBE, 'points: J milieu BF', 'tracer: vecteur BA + 1/2 AE');
		expect(expectedSolideAnswer(s)).toBe('J/E');
		expect(solideSolutionVector(s)).toEqual({ from: 8, to: 4 });
	});

	it('juge : extrémité − origine = la combinaison, origine imposée exigée', () => {
		const expected = expectedOf(...CUBE, 'tracer: vecteur AB + AD + AE depuis A');
		expect(isSolideAnswerCorrect('A/G', expected)).toBe(true);
		expect(isSolideAnswerCorrect(' A/G ', expected)).toBe(true);
		expect(isSolideAnswerCorrect('A/C', expected)).toBe(false);
		expect(isSolideAnswerCorrect('', expected)).toBe(false);
		expect(isSolideAnswerCorrect('A/', expected)).toBe(false);
		const imposed = expectedOf(...CUBE, 'tracer: vecteur AB depuis A');
		expect(isSolideAnswerCorrect('D/C', imposed)).toBe(false);
	});

	it('réponse : deux noms séparés par /', () => {
		expect(solideAnswer('A', 'G')).toBe('A/G');
		expect(solideAnswer("A'", null)).toBe("A'/");
		expect(readSolideAnswer('A/G')).toEqual({ from: 'A', to: 'G' });
		expect(readSolideAnswer('A/')).toEqual({ from: 'A', to: null });
		expect(readSolideAnswer('')).toEqual({ from: null, to: null });
	});
});

describe('phrases de la correction', () => {
	const sum = spec(...CUBE, 'tracer: vecteur AB + AD + AE');

	it('juste : aucune phrase', () => {
		expect(solideVectorMistake('A/G', sum)).toBeNull();
	});

	it('rien posé ; origine imposée, extrémité manquante', () => {
		expect(solideVectorMistake('', sum)).toEqual({ text: BOTH_MISSING });
		expect(BOTH_MISSING).toBe('Il faut placer l’origine et l’extrémité.');
		const imposed = spec(...CUBE, 'tracer: vecteur AB depuis A');
		expect(solideVectorMistake('A/', imposed)).toEqual({ text: END_MISSING });
	});

	it('origine libre posée, extrémité manquante : seule l’extrémité est demandée', () => {
		expect(solideVectorMistake('A/', sum)).toEqual({ text: END_MISSING });
	});

	it('même point', () => {
		expect(solideVectorMistake('A/A', sum)).toEqual({ text: SAME_POINT });
		expect(SAME_POINT).toBe('Ton origine et ton extrémité sont au même endroit.');
	});

	it('sens inversé', () => {
		expect(solideVectorMistake('G/A', sum)).toEqual({ text: WRONG_DIRECTION });
		expect(WRONG_DIRECTION).toBe('Ta flèche va dans le mauvais sens.');
	});

	it('origine imposée, bon vecteur ailleurs', () => {
		const imposed = spec(...CUBE, 'tracer: vecteur AB depuis A');
		expect(solideVectorMistake('D/C', imposed)).toEqual({ text: WRONG_ORIGIN });
	});

	it('autre vecteur : la flèche tracée et la combinaison, en LaTeX propre', () => {
		expect(solideVectorMistake('A/C', sum)).toEqual({
			text: 'Ta flèche représente $\\overrightarrow{AC}$, pas $\\overrightarrow{AB}+\\overrightarrow{AD}+\\overrightarrow{AE}$.'
		});
		const half = spec(...CUBE, 'points: K milieu CG', 'tracer: vecteur AB + AD - 1/2 AE depuis E');
		expect(solideVectorMistake('E/C', half)?.text).toBe(
			'Ta flèche représente $\\overrightarrow{EC}$, pas $\\overrightarrow{AB}+\\overrightarrow{AD}-\\frac{1}{2}\\overrightarrow{AE}$.'
		);
	});

	it('LaTeX de la combinaison : pas de 1 devant, signes, demis', () => {
		const s = spec(
			...CUBE,
			'points: I milieu AE',
			'tracer: vecteur -AB + 2 AI + 3/2 AI - 1/2 AI - AI'
		);
		expect(combinationLatex(s)).toBe(
			'-\\overrightarrow{AB}+2\\overrightarrow{AI}+\\frac{3}{2}\\overrightarrow{AI}-\\frac{1}{2}\\overrightarrow{AI}-\\overrightarrow{AI}'
		);
	});
});

describe('correction : la flèche juste', () => {
	it('depuis l’origine imposée', () => {
		expect(solideSolutionVector(spec(...CUBE, 'tracer: vecteur AB depuis H'))).toEqual({
			from: 7,
			to: 6
		});
	});

	it('origine libre : depuis le premier point du premier vecteur', () => {
		expect(solideSolutionVector(spec(...CUBE, 'tracer: vecteur AB + AD + AE'))).toEqual({
			from: 0,
			to: 6
		});
		expect(solideSolutionVector(spec(...CUBE, 'tracer: vecteur DC'))).toEqual({ from: 3, to: 2 });
	});
});

describe('PDF', () => {
	it('le solide seul ; `solved` dessine la flèche juste', () => {
		const plain = generateEspaceTypst(read(...CUBE));
		const task = generateEspaceTypst(read(...CUBE, 'tracer: vecteur AB + AD + AE'));
		expect(task).toBe(plain);
		const solved = generateEspaceTypst(read(...CUBE, 'tracer: vecteur AB + AD + AE'), {
			solved: true
		});
		expect(solved.split('polygon(fill: black').length - 1).toBe(1);
		expect(plain.split('polygon(fill: black').length - 1).toBe(0);
	});
});

describe('flèche de l’élève à l’écran', () => {
	it('même dessin qu’un vecteur donné', () => {
		const s = spec(...CUBE, 'vecteurs: AG');
		const scene = buildSolideScene(s);
		const arrow = solideArrowBetween(solidePointAt(scene, 0), solidePointAt(scene, 6));
		const given = scene.arrows[0];
		const points = (a: typeof arrow) => [...a.shaft, ...a.head].flatMap((p) => [p.x, p.y]);
		points(arrow).forEach((v, i) => expect(v).toBeCloseTo(points(given)[i], 9));
		expect(arrow.small).toBe(false);
	});
});
