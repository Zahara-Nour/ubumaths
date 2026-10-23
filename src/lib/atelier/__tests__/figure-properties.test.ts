/**
 * Le panneau « Propriétés » d'un objet de la figure (point, courbe) : ce que
 * `figurePropertiesOf` rend, ligne par ligne — étiquette, valeur exacte en
 * texte (lecture d'écran) et en LaTeX, valeur approchée quand l'exacte n'est
 * pas un décimal simple.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { figurePropertiesOf, type PropertyRow } from '../figure-properties';

// =============================================================================
// Outils
// =============================================================================

/** A(0 ; 1), B(1 ; 3), O(0 ; 0), C(2 ; 0), puis les lignes données. */
function plane(...lines: string[]): CalcSession {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
	for (const line of ['A = (0 ; 1)', 'B = (1 ; 3)', 'O = (0 ; 0)', 'C = (2 ; 0)', ...lines]) {
		const done = runInput(s, line);
		if (done.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(done)}`);
	}
	return s;
}

/** Les lignes en `étiquette : texte` (et `[≈ …]` si une valeur approchée suit). */
function rows(s: CalcSession, name: string): string[] {
	return figurePropertiesOf(s.atelier, name).map(
		(row: PropertyRow) =>
			`${row.label} : ${row.text}${row.approximate === undefined ? '' : ` [${row.approximate}]`}`
	);
}

function row(s: CalcSession, name: string, label: string): PropertyRow | undefined {
	return figurePropertiesOf(s.atelier, name).find((r) => r.label === label);
}

// =============================================================================
// Points
// =============================================================================

describe('figurePropertiesOf : un point', () => {
	it('un point par coordonnées', () => {
		const s = plane();
		expect(rows(s, 'A')).toEqual(['Nature : point par coordonnées', 'Coordonnées : (0 ; 1)']);
		expect(row(s, 'A', 'Coordonnées')?.latex).toBe('\\left(0\\,;\\,1\\right)');
	});

	it('`point(…)` est aussi un point par coordonnées', () => {
		const s = plane('P = point(1/2 ; 3)');
		expect(rows(s, 'P')).toEqual(['Nature : point par coordonnées', 'Coordonnées : (1/2 ; 3)']);
	});

	it('un milieu, coordonnées exactes', () => {
		const s = plane('I = milieu(A, B)');
		expect(rows(s, 'I')).toEqual(['Nature : milieu', 'Coordonnées : (1/2 ; 2)']);
		expect(row(s, 'I', 'Coordonnées')?.latex).toBe('\\left(\\dfrac{1}{2}\\,;\\,2\\right)');
	});

	it('un projeté orthogonal', () => {
		const s = plane('d = (AB)', 'H = projection(O ; axe=d)');
		expect(rows(s, 'H')[0]).toBe('Nature : projeté orthogonal');
	});

	it('un point sur un objet', () => {
		const s = plane('s = [AB]', 'M = point_sur(s ; 0,5)');
		expect(rows(s, 'M')[0]).toBe('Nature : point sur un objet');
	});

	it('un point d’intersection approché : « ≈ (… ; …) »', () => {
		const s = plane('f(x) = x^3 + x - 1', 'u : y = 0', 'E = intersection(u, f)');
		expect(rows(s, 'E')).toEqual(['Nature : point d’intersection', 'Coordonnées : ≈ (0,6823 ; 0)']);
		expect(row(s, 'E', 'Coordonnées')?.latex).toBe('\\approx\\left(0{,}6823\\,;\\,0\\right)');
	});

	it('un point d’intersection exact irrationnel : sa valeur approchée suit', () => {
		const s = plane('k : x^2/4 + y^2 = 1', 'u : y = x', 'E = intersection(u, k, 1)');
		expect(rows(s, 'E')[1]).toMatch(
			/^Coordonnées : \(.*√5 ; .*√5\) \[≈ \(-?0,8944 ; -?0,8944\)\]$/
		);
	});

	it('un point qui cite un curseur : calculé à la valeur du moment', () => {
		const s = plane('a = 1', 'M = (a ; 0)');
		expect(rows(s, 'M')[1]).toBe('Coordonnées : (1 ; 0)');
		s.atelier.slideTo('a', 4);
		expect(rows(s, 'M')[1]).toBe('Coordonnées : (4 ; 0)');
	});
});

// =============================================================================
// Segment, demi-droite
// =============================================================================

describe('figurePropertiesOf : segment et demi-droite', () => {
	it('le segment [AB] : longueur √5 ≈ 2,2361, extrémités, milieu', () => {
		const s = plane('s = [AB]');
		expect(rows(s, 's')).toEqual([
			'Nature : segment',
			'Longueur : √5 [≈ 2,2361]',
			'Extrémités : (0 ; 1) et (1 ; 3)',
			'Milieu : (1/2 ; 2)'
		]);
		expect(row(s, 's', 'Longueur')?.latex).toBe('\\sqrt{5}');
	});

	it('une longueur entière n’a pas de valeur approchée', () => {
		const s = plane('s = [OC]');
		expect(rows(s, 's')[1]).toBe('Longueur : 2');
	});

	it('la demi-droite [AB) : origine, droite support, vecteur directeur dans son sens', () => {
		const s = plane('r = [BA)');
		expect(rows(s, 'r')).toEqual([
			'Nature : demi-droite',
			'Origine : (1 ; 3)',
			'Droite support : y = 2x + 1',
			'Vecteur directeur : (-1 ; -2)'
		]);
	});
});

// =============================================================================
// Droites
// =============================================================================

describe('figurePropertiesOf : une droite', () => {
	// Revue de #1630 : `h : 2y = 3` donnait (-2 ; 0), juste mais pas ce qu'écrit un élève
	it('une horizontale : vecteur directeur (1 ; 0)', () => {
		const s = plane('h : 2y = 3');
		expect(row(s, 'h', 'Vecteur directeur')?.text).toBe('(1 ; 0)');
	});

	it('le vecteur directeur est réduit, première composante positive', () => {
		const s = plane('d : 4x + 2y = 6');
		expect(row(s, 'd', 'Vecteur directeur')?.text).toBe('(1 ; -2)');
	});

	// Revue de #1630 : `√2x - √2y = 0`, juste, mais un élève écrit `x - y = 0`
	it('des coefficients irrationnels proportionnels se réduisent', () => {
		const s = plane('R = (sqrt(2) ; sqrt(2))', 'd = (OR)');
		expect(row(s, 'd', 'Équation cartésienne')?.text).toBe('x - y = 0');
		expect(row(s, 'd', 'Vecteur directeur')?.text).toBe('(1 ; 1)');
	});

	it('des coefficients vraiment irrationnels restent tels quels', () => {
		const s = plane('R = (1 ; sqrt(2))', 'd = (OR)');
		expect(row(s, 'd', 'Équation réduite')?.text).toBe('y = √2x');
	});

	it('la droite (AB)', () => {
		const s = plane('d = (AB)');
		expect(rows(s, 'd')).toEqual([
			'Nature : droite',
			'Équation réduite : y = 2x + 1',
			'Équation cartésienne : 2x - y + 1 = 0',
			'Coefficient directeur : 2',
			'Ordonnée à l’origine : 1',
			'Vecteur directeur : (1 ; 2)'
		]);
		expect(row(s, 'd', 'Équation cartésienne')?.latex).toBe('2 x - y + 1 = 0');
	});

	it('une droite verticale', () => {
		const s = plane('D = (2 ; 5)', 'v = (CD)');
		expect(rows(s, 'v')).toEqual([
			'Nature : droite',
			'Équation réduite : x = 2',
			'Équation cartésienne : x - 2 = 0',
			'Coefficient directeur : aucun (droite verticale)',
			'Ordonnée à l’origine : aucun (droite verticale)',
			'Vecteur directeur : (0 ; 1)'
		]);
	});

	it('une droite par équation réduite `y = 3x - 2`', () => {
		const s = plane('d : y = 3x - 2');
		expect(rows(s, 'd')).toEqual([
			'Nature : droite',
			'Équation réduite : y = 3x - 2',
			'Équation cartésienne : 3x - y - 2 = 0',
			'Coefficient directeur : 3',
			'Ordonnée à l’origine : -2',
			'Vecteur directeur : (1 ; 3)'
		]);
	});

	it('une droite par équation cartésienne `2x + 4y = 6` : coefficients premiers entre eux', () => {
		const s = plane('d : 2x + 4y = 6');
		expect(rows(s, 'd')).toEqual([
			'Nature : droite',
			'Équation réduite : y = -(1/2)x + 3/2',
			'Équation cartésienne : x + 2y - 3 = 0',
			'Coefficient directeur : -1/2',
			'Ordonnée à l’origine : 3/2',
			'Vecteur directeur : (2 ; -1)'
		]);
	});

	it('une parallèle', () => {
		const s = plane('d = (AB)', 'p = parallele(O, d)');
		expect(rows(s, 'p').slice(0, 3)).toEqual([
			'Nature : droite',
			'Équation réduite : y = 2x',
			'Équation cartésienne : 2x - y = 0'
		]);
	});
});

// =============================================================================
// Cercles
// =============================================================================

describe('figurePropertiesOf : un cercle', () => {
	// Revue de #1630 : `√(1/3)` ; au lycée, pas de racine au dénominateur
	it('3x² + 3y² = 1 : rayon √3/3, sans racine d’une fraction', () => {
		const s = plane('c : 3x^2 + 3y^2 = 1');
		const radius = row(s, 'c', 'Rayon');
		expect(radius?.text).toBe('√3/3');
		expect(radius?.latex).toBe('\\dfrac{\\sqrt{3}}{3}');
		expect(radius?.approximate).toBe('≈ 0,5774');
	});

	it('un segment de longueur √(1/2) se dit √2/2', () => {
		const s = plane('P = (1/2 ; 1/2)', 's = [OP]');
		expect(row(s, 's', 'Longueur')?.text).toBe('√2/2');
	});

	it('cercle(O ; 3) : périmètre 6π, aire 9π', () => {
		const s = plane('c = cercle(O ; 3)');
		expect(rows(s, 'c')).toEqual([
			'Nature : cercle',
			'Centre : (0 ; 0)',
			'Rayon : 3',
			'Équation : x^2 + y^2 = 9',
			'Périmètre : 6π [≈ 18,8496]',
			'Aire : 9π [≈ 28,2743]'
		]);
		expect(row(s, 'c', 'Périmètre')?.latex).toBe('6 \\pi');
	});

	it('cercle de centre A passant par B : rayon √5', () => {
		const s = plane('c = cercle(A, passant=B)');
		expect(rows(s, 'c').slice(1, 3)).toEqual(['Centre : (0 ; 1)', 'Rayon : √5 [≈ 2,2361]']);
		expect(row(s, 'c', 'Aire')?.text).toBe('5π');
		expect(row(s, 'c', 'Périmètre')?.text).toBe('2π√5');
	});

	it('rayon √3/3 : périmètre 2π√3/3 et aire π/3, comme au cahier', () => {
		const s = plane('c : 3x^2+3y^2=1');
		expect(row(s, 'c', 'Périmètre')?.text).toBe('2π√3/3');
		expect(row(s, 'c', 'Aire')?.text).toBe('π/3');
	});

	it('rayon √5/3 : périmètre 2π√5/3 et aire 5π/9', () => {
		const s = plane('c : 9x^2+9y^2=5');
		expect(row(s, 'c', 'Périmètre')?.text).toBe('2π√5/3');
		expect(row(s, 'c', 'Aire')?.text).toBe('5π/9');
	});

	it('rayon 2√5/3 : le texte se lit sans parenthèses, 2√5/3', () => {
		const s = plane('c : 9x^2+9y^2=20');
		expect(row(s, 'c', 'Rayon')?.text).toBe('2√5/3');
		expect(row(s, 'c', 'Périmètre')?.text).toBe('4π√5/3');
		expect(row(s, 'c', 'Aire')?.text).toBe('20π/9');
	});

	it('rayon 1,234567 : l’aire garde ses chiffres exacts (au-delà de 2^53)', () => {
		const s = plane('c = cercle(O ; 1.234567)');
		const area = row(s, 'c', 'Aire')?.text ?? '';
		expect(area).toContain('90846757739126688');
		expect(area).toContain('59604644775390625');
	});

	it('rayon 1/2 : périmètre π et aire π/4', () => {
		const s = plane('c : 4x^2+4y^2=1');
		expect(row(s, 'c', 'Périmètre')?.text).toBe('π');
		expect(row(s, 'c', 'Aire')?.text).toBe('π/4');
	});

	it('cercle par équation `x^2+y^2-2x=3` : centre (1 ; 0), rayon 2', () => {
		const s = plane('c : x^2+y^2-2x=3');
		expect(rows(s, 'c')).toEqual([
			'Nature : cercle',
			'Centre : (1 ; 0)',
			'Rayon : 2',
			'Équation : (x - 1)^2 + y^2 = 4',
			'Périmètre : 4π [≈ 12,5664]',
			'Aire : 4π [≈ 12,5664]'
		]);
	});

	it('cercle par équation `x^2 + y^2 = 4`', () => {
		const s = plane('c : x^2 + y^2 = 4');
		expect(rows(s, 'c').slice(1, 3)).toEqual(['Centre : (0 ; 0)', 'Rayon : 2']);
	});
});

// =============================================================================
// Autres courbes, cas vides
// =============================================================================

describe('figurePropertiesOf : autres courbes et objets sans propriétés', () => {
	it('une ellipse : la nature seule', () => {
		const s = plane('k : x^2/4 + y^2 = 1');
		expect(rows(s, 'k')).toEqual(['Nature : ellipse']);
	});

	it('une parabole : la nature seule', () => {
		const s = plane('p : y = x^2');
		expect(rows(s, 'p')).toEqual(['Nature : parabole']);
	});

	it('un objet en attente : rien', () => {
		const s = plane();
		const result = runInput(s, 'I = milieu(A, Z)');
		expect(result.kind).toBe('definition');
		expect(s.atelier.get('I')?.status).toBe('pending');
		expect(figurePropertiesOf(s.atelier, 'I')).toEqual([]);
	});

	it('un objet absent, une valeur : rien', () => {
		const s = plane('a = 2');
		expect(figurePropertiesOf(s.atelier, 'inconnu')).toEqual([]);
		expect(figurePropertiesOf(s.atelier, 'a')).toEqual([]);
	});
});
