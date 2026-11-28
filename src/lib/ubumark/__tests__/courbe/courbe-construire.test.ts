/**
 * Bloc ```courbe — escalier à construire (`construire N` sur la ligne d'une suite
 * récurrente) : analyse, réponse, juge, phrases, corrigé
 *
 * Spécification validée par David le 2026-11-28 (`docs/wip/outil-escalier-suite-progress.md`,
 * outil 48) : l'élève touche l'axe des abscisses pour u₁…u_N ; chaque terme est une case,
 * jugé depuis le terme précédent DE L'ÉLÈVE (u₀ pour le premier), marge = 3 % de la largeur.
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent, hasCourbeToPlace } from '../../parser/courbe-parser';
import { isCourbeAnswerCorrect } from '../../utils/courbe-tracer';
import {
	isStaircaseTermCorrect,
	readStaircaseAnswer,
	readStaircaseExpected,
	snapAbscissa,
	staircaseAnswer,
	staircaseExpected,
	staircaseMistake,
	studentCobweb
} from '../../utils/courbe-construire';
import { buildCourbeScene } from '../../utils/courbe-scene';
import { solvedOverlay } from '../../utils/courbe-solution';
import type { CourbeNode } from '../../types/courbe';

const WINDOW = ['x: 0 ; 4', 'y: 0 ; 4'];
const RACINE = 'u(0) = 0 ; u(n+1) = sqrt(2*u(n)+3) pour n de 0 à 3 construire 3';
const SPIRALE = 'u(0) = 0 ; u(n+1) = -0.5*u(n)+3 pour n de 0 à 4 construire 4';
const block = (...lines: string[]) => parseCourbeContent(lines.join('\n'));

function spec(node: CourbeNode) {
	expect(node.errors).toEqual([]);
	expect(node.spec).not.toBeNull();
	return node.spec!;
}

function errorsOf(node: CourbeNode): string {
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message).join(' | ');
}

describe('construire N — lecture du bloc', () => {
	it('f croissante : les vrais termes, la relation en x, la marge (3 % de la largeur)', () => {
		const s = spec(block(...WINDOW, RACINE));
		const build = s.construire!;
		expect(build).toMatchObject({
			sequenceName: 'u',
			firstIndex: 0,
			start: 0,
			relation: 'sqrt(2*(x)+3)',
			line: 3
		});
		expect(build.margin).toBeCloseTo(0.12, 12);
		expect(build.terms.map((t) => Number(t.toFixed(3)))).toEqual([1.732, 2.542, 2.843]);
	});

	it('les termes vrais ne sont pas dans la suite dessinée : u₀ seul, étiquette u_0', () => {
		const s = spec(block(...WINDOW, RACINE));
		expect(s.sequences[0].terms).toEqual([{ n: 0, value: 0 }]);
		expect(s.sequences[0].staircase).toMatchObject({ showTerms: true });
		const scene = buildCourbeScene(s);
		const st = scene.sequences[0].staircase!;
		expect(st.steps).toEqual([]);
		expect(st.termLabels).toEqual([{ n: 0, x: 0 }]);
		expect(st.curve.length).toBeGreaterThan(0);
		expect(st.diagonal.length).toBe(1);
		expect(st.start).toEqual({ x: 0, y: 0 });
	});

	it('options de couleur et de nom après construire N', () => {
		const s = spec(
			block(...WINDOW, 'u(0) = 0 ; u(n+1) = sqrt(2*u(n)+3) pour n de 0 à 3 construire 3 rouge')
		);
		expect(s.sequences[0].color).toBe('rouge');
		expect(s.construire?.terms).toHaveLength(3);
	});

	it('spirale (f décroissante) : même lecture', () => {
		const s = spec(block(...WINDOW, SPIRALE));
		expect(s.construire!.terms).toEqual([3, 1.5, 2.25, 1.875]);
	});

	it('repère à geste : hasCourbeToPlace le voit', () => {
		expect(hasCourbeToPlace(['```courbe', ...WINDOW, RACINE, '```'].join('\n'))).toBe(true);
		const escalier = 'u(0) = 0 ; u(n+1) = sqrt(2*u(n)+3) pour n de 0 à 3 escalier';
		expect(hasCourbeToPlace(['```courbe', ...WINDOW, escalier, '```'].join('\n'))).toBe(false);
	});

	it('case: acceptée avec construire', () => {
		const node = block('case: 2', ...WINDOW, RACINE);
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(2);
	});

	it('solution: oui acceptée : le vrai escalier en corrigé', () => {
		const s = spec(block(...WINDOW, RACINE, 'solution: oui'));
		const { traces } = solvedOverlay(s);
		// u₀ → (u₀ ; u₁) → (u₁ ; u₁) → (u₁ ; 0) … : trois traits par terme
		expect(traces).toHaveLength(9);
		expect(traces[0].from).toEqual({ x: 0, y: 0 });
		expect(traces[0].to.x).toBe(0);
		expect(traces[0].to.y).toBeCloseTo(Math.sqrt(3), 9);
	});
});

describe('construire N — refus d’auteur', () => {
	const line = (rest: string) => `u(0) = 0 ; u(n+1) = sqrt(2*u(n)+3) ${rest}`;

	it('avec escalier sur la même ligne', () => {
		expect(errorsOf(block(...WINDOW, line('pour n de 0 à 3 escalier construire 3')))).toMatch(
			/Ligne 3 : .*construire.*escalier/
		);
	});

	it('N hors de 1..6, ou pas un entier, ou absent', () => {
		expect(errorsOf(block(...WINDOW, line('pour n de 0 à 7 construire 7')))).toMatch(
			/Ligne 3 : .*de 1 à 6/
		);
		expect(errorsOf(block(...WINDOW, line('pour n de 0 à 3 construire 0')))).toMatch(/de 1 à 6/);
		expect(errorsOf(block(...WINDOW, line('pour n de 0 à 3 construire 2.5')))).toMatch(/de 1 à 6/);
		expect(errorsOf(block(...WINDOW, line('pour n de 0 à 3 construire')))).toMatch(
			/construire attend/
		);
	});

	it('rangs qui ne couvrent pas N termes', () => {
		expect(errorsOf(block(...WINDOW, line('pour n de 0 à 2 construire 3')))).toMatch(
			/Ligne 3 : .*pour n de 0 à 3/
		);
	});

	it('premier rang dessiné après le premier terme', () => {
		expect(
			errorsOf(block(...WINDOW, 'u(0) = 0 ; u(n+1) = sqrt(2*u(n)+3) pour n de 1 à 4 construire 3'))
		).toMatch(/Ligne 3 : .*premier terme/);
	});

	it('relation qui dépend de n, suite explicite, fonction', () => {
		expect(
			errorsOf(block(...WINDOW, 'u(0) = 0 ; u(n+1) = u(n)+n pour n de 0 à 3 construire 3'))
		).toMatch(/sans n/);
		expect(errorsOf(block(...WINDOW, 'u(n) = n pour n de 0 à 3 construire 3'))).toMatch(
			/récurrente/
		);
		expect(errorsOf(block(...WINDOW, 'f(x) = x construire 3'))).toMatch(/suite récurrente/);
	});

	it('deux suites à construire dans un repère', () => {
		expect(
			errorsOf(
				block(...WINDOW, RACINE, 'v(0) = 0 ; v(n+1) = -0.5*v(n)+3 pour n de 0 à 3 construire 3')
			)
		).toMatch(/Ligne 4 : .*une seule suite/);
	});

	it('avec placer:, tracer:, données: dans le même repère', () => {
		expect(errorsOf(block(...WINDOW, 'grille: 1', RACINE, 'placer: A=(1 ; 1)'))).toMatch(
			/Ligne 4 : .*placer:/
		);
		expect(errorsOf(block(...WINDOW, 'grille: 1', RACINE, 'tracer: y = x'))).toMatch(
			/Ligne 4 : .*tracer:/
		);
		expect(errorsOf(block(...WINDOW, RACINE, 'données: (1 ; 1) ; (2 ; 2)'))).toMatch(
			/Ligne 3 : .*données:/
		);
	});

	it('un vrai terme hors de la fenêtre (le coin doit être visible)', () => {
		expect(errorsOf(block('x: 0 ; 4', 'y: 0 ; 2', RACINE))).toMatch(
			/Ligne 3 : .*u₂ .*hors de la fenêtre/
		);
		expect(errorsOf(block('x: 0.5 ; 4', 'y: 0 ; 4', RACINE))).toMatch(/u₀ .*hors de la fenêtre/);
	});

	it('deux termes consécutifs trop proches (moins de deux marges)', () => {
		expect(
			errorsOf(block(...WINDOW, 'u(0) = 0 ; u(n+1) = sqrt(2*u(n)+3) pour n de 0 à 4 construire 4'))
		).toMatch(/Ligne 3 : .*u₃ et u₄ .*trop proches/);
	});
});

describe('construire N — réponse et juge', () => {
	const expected = (k: number) =>
		staircaseExpected({ k, start: 0, margin: 0.12, relation: 'sqrt(2*(x)+3)' });

	it('réponse attendue lisible, relue par une regex stricte', () => {
		expect(expected(2)).toBe('escalier k=2 ; u0=0 ; marge=0.12 ; f=sqrt(2*(x)+3)');
		expect(readStaircaseExpected(expected(2))).toEqual({
			k: 2,
			start: 0,
			margin: 0.12,
			relation: 'sqrt(2*(x)+3)'
		});
		expect(readStaircaseExpected('escalier k=2 ; u0=0 ; f=x')).toBeNull();
		expect(readStaircaseExpected('escalier k=x ; u0=0 ; marge=0.1 ; f=x')).toBeNull();
	});

	it('réponse de la case k : la chaîne des termes de l’élève jusqu’à k', () => {
		expect(staircaseAnswer([1.73, 2.54, 2.8], 3)).toBe('1.73;2.54;2.8');
		expect(staircaseAnswer([1.73, 2.54, 2.8], 1)).toBe('1.73');
		expect(staircaseAnswer([1.73, null, 2.8], 3)).toBe('1.73;;2.8');
		expect(staircaseAnswer([null, null], 2)).toBe('');
		expect(readStaircaseAnswer('1.73;;2.8')).toEqual([1.73, null, 2.8]);
		expect(readStaircaseAnswer('')).toEqual([]);
	});

	it('nominal : chaque terme proche de f(terme précédent) est juste', () => {
		expect(isStaircaseTermCorrect('1.73', expected(1))).toBe(true);
		expect(isStaircaseTermCorrect('1.73;2.54', expected(2))).toBe(true);
		expect(isCourbeAnswerCorrect('1.73;2.54;2.84', expected(3))).toBe(true);
	});

	it('marge : 0,12 de part et d’autre', () => {
		expect(isStaircaseTermCorrect('1.85', expected(1))).toBe(true);
		expect(isStaircaseTermCorrect('1.86', expected(1))).toBe(false);
		expect(isStaircaseTermCorrect('1.62', expected(1))).toBe(true);
		expect(isStaircaseTermCorrect('1.61', expected(1))).toBe(false);
	});

	it('erreur sur u₁, u₂ juste depuis le u₁ de l’élève', () => {
		// u₁ = 1 (faux) ; f(1) = √5 ≈ 2,236
		expect(isStaircaseTermCorrect('1', expected(1))).toBe(false);
		expect(isStaircaseTermCorrect('1;2.24', expected(2))).toBe(true);
		expect(isStaircaseTermCorrect('1;2.54', expected(2))).toBe(false);
	});

	it('terme absent, terme précédent absent, chaîne illisible : faux', () => {
		expect(isStaircaseTermCorrect('', expected(1))).toBe(false);
		expect(isStaircaseTermCorrect('1.73;', expected(2))).toBe(false);
		expect(isStaircaseTermCorrect(';2.54', expected(2))).toBe(false);
		expect(isStaircaseTermCorrect('1.73;abc', expected(2))).toBe(false);
		expect(isStaircaseTermCorrect('1.73', expected(2))).toBe(false);
		expect(isStaircaseTermCorrect('1.73', 'escalier illisible')).toBe(false);
	});

	it('f hors de son domaine depuis le terme de l’élève : faux', () => {
		const e = staircaseExpected({ k: 2, start: 4, margin: 0.3, relation: 'sqrt((x)-3)' });
		expect(isStaircaseTermCorrect('1;0', e)).toBe(false);
	});

	it('spirale : même juge', () => {
		const e = (k: number) =>
			staircaseExpected({ k, start: 0, margin: 0.12, relation: '-0.5*(x)+3' });
		expect(isStaircaseTermCorrect('3', e(1))).toBe(true);
		expect(isStaircaseTermCorrect('3;1.5', e(2))).toBe(true);
		expect(isStaircaseTermCorrect('3;1.5;2.2', e(3))).toBe(true);
		expect(isStaircaseTermCorrect('3;1.5;2.5', e(3))).toBe(false);
	});
});

describe('construire N — geste et phrases', () => {
	it('le toucher arrondi au centième de la largeur (ou plus fin), dans la fenêtre', () => {
		const w = { xMin: 0, xMax: 4, yMin: 0, yMax: 4 };
		expect(snapAbscissa(w, 1.73456)).toBe(1.73);
		expect(snapAbscissa(w, -0.3)).toBe(0);
		expect(snapAbscissa(w, 4.2)).toBe(4);
		expect(snapAbscissa({ xMin: 0, xMax: 40, yMin: 0, yMax: 40 }, 17.345)).toBe(17.3);
	});

	it('la marche de l’élève : monter, aller à y = x, descendre ; arrêt au premier terme absent', () => {
		expect(studentCobweb(0, [1.7, null, 2.8], 0)).toEqual([
			{ from: { x: 0, y: 0 }, to: { x: 0, y: 1.7 } },
			{ from: { x: 0, y: 1.7 }, to: { x: 1.7, y: 1.7 } },
			{ from: { x: 1.7, y: 1.7 }, to: { x: 1.7, y: 0 } }
		]);
		expect(studentCobweb(0, [], 0)).toEqual([]);
	});

	it('phrases : terme faux, terme absent, terme précédent absent', () => {
		const build = {
			sequenceName: 'u',
			firstIndex: 0,
			start: 0,
			relation: 'sqrt(2*(x)+3)',
			margin: 0.12
		};
		expect(staircaseMistake(build, 1, '1')).toBe('Depuis u₀, la construction mène à u₁ ≈ 1,73.');
		expect(staircaseMistake(build, 2, '1;3')).toBe(
			'Depuis ton u₁, la construction mène à u₂ ≈ 2,24.'
		);
		expect(staircaseMistake(build, 2, '1;2.24')).toBeNull();
		expect(staircaseMistake(build, 2, '1.73;')).toBe('Il faut placer u₂.');
		expect(staircaseMistake(build, 2, ';2.5')).toBe(
			'Place d’abord u₁ : u₂ se construit depuis lui.'
		);
	});
});
