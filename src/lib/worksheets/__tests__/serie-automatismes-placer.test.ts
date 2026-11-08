/**
 * Série d'automatismes : points à placer (chantier automatismes-1spe, lot « Géométrie et repérage »)
 * ================================================================================================
 *
 * Phase 0 validée le 2026-11-08 : comme la droite à tracer, le geste est figé.
 * - Droite graduée à placer (```line à `placer:`) : à l'énoncé, la droite seule (lignes
 *   `placer:` et `case:` retirées) ; au corrigé, les points attendus posés en vert
 *   (ligne `points:`). Un point sans nom (`placer: 13/10`) prend la première lettre libre.
 * - Repère à points à placer (```courbe à `placer:`) : à l'énoncé, le repère sans les
 *   points à placer ; au corrigé, les points attendus ajoutés aux `points:` du repère.
 * Une case par point à placer. Refusé, message à l'appui : bloc en retrait ou cité.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { buildSerie } from '../serie-automatismes';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import type { CourbeNode } from '$lib/ubumark/types/courbe';
import type { NumberLineNode } from '$lib/ubumark/types/number-line';
import { numVal } from '$lib/ubumark/utils/number-line-render';

/** Un modèle d'une variation, énoncé donné, variables a = 2 et b = -3 */
function modele(id: string, statement: string, blanks?: { expectedAnswer: string }[]) {
	return {
		id,
		title: 't',
		grades: ['5'],
		level: 1,
		status: 'draft',
		variations: [
			{
				statement,
				variables: [
					{ name: 'a', expression: '2' },
					{ name: 'b', expression: '-3' }
				],
				...(blanks && { blanks })
			}
		]
	} as unknown as QuestionTemplate;
}

const droite = (...lignes: string[]) =>
	['```line', 'start: -2', 'end: 2', 'step: 1/10', 'major: 10', ...lignes, '```'].join('\n');
const repere = (...lignes: string[]) =>
	['```courbe', 'x: -5 ; 5', 'y: -5 ; 5', 'grille: 1 ; 1', ...lignes, '```'].join('\n');

const droiteSansNom = modele('droite-sans-nom', `Place $1{,}3$.\n\n${droite('placer: 13/10')}`);
const droiteDeuxPoints = modele(
	'droite-deux-points',
	`Place $A$ et $B$.\n\n${droite('placer: A=-7/10 ; B={{a}}/10')}`
);
const droiteAvecCase = modele(
	'droite-avec-case',
	`Calcule $1+{{a}}=?$, puis place le point.\n\n${droite('placer: M=13/10')}`,
	[{ expectedAnswer: '3' }]
);
const droiteEnRetrait = modele(
	'droite-en-retrait',
	`Place le point.\n\n> ${droite('placer: 13/10').split('\n').join('\n> ')}`
);
const reperePoint = modele(
	'repere-point',
	`Place le point $A({{a}} ; {{b}})$.\n\n${repere('placer: A=({{a}} ; {{b}})')}`
);
const repereAvecPoints = modele(
	'repere-avec-points',
	`Place $C$ et $D$.\n\n${repere('points: A(1 ; 1), B(-1 ; 2)', 'placer: C=(3 ; -2) ; D=(-4 ; 0)')}`
);
const repereSansNom = modele(
	'repere-sans-nom',
	`Place le point de coordonnées $(2 ; 1)$.\n\n${repere('points: A(1 ; 1)', 'placer: (2 ; 1)')}`
);
const repereEnRetrait = modele(
	'repere-en-retrait',
	`Place le point.\n\n> ${repere('placer: A=(2 ; 3)').split('\n').join('\n> ')}`
);

const modeles = new Map(
	[
		droiteSansNom,
		droiteDeuxPoints,
		droiteAvecCase,
		droiteEnRetrait,
		reperePoint,
		repereAvecPoints,
		repereSansNom,
		repereEnRetrait
	].map((t) => [t.id, t])
);

/** Corps du premier bloc ```<type> d'un texte (retrait de la liste numérotée retiré) */
function corps(texte: string, type: 'line' | 'courbe'): string {
	const m = new RegExp('```' + type + '\\n([\\s\\S]*?)\\n\\s*```').exec(texte);
	if (!m) throw new Error(`pas de bloc ${type}`);
	return m[1]
		.split('\n')
		.map((l) => l.replace(/^ {3}/, ''))
		.join('\n');
}

function ligne(texte: string): NumberLineNode {
	const r = parseNumberLineContent(corps(texte, 'line').split('\n'));
	expect(r.errors).toEqual([]);
	if (!r.node) throw new Error('droite illisible');
	return r.node;
}

function plan(texte: string): CourbeNode {
	const node = parseCourbeContent(corps(texte, 'courbe'));
	expect(node.errors).toEqual([]);
	return node;
}

/** Valeur numérique d'un point de droite graduée */
const valeur = (p: NumberLineNode['points'][number]) => numVal(p.value);

describe('buildSerie — droite graduée à placer', () => {
	it('énoncé : la droite seule ; corrigé : le point posé en vert, nommé par la première lettre libre', () => {
		const serie = buildSerie(modeles, [{ templateId: 'droite-sans-nom', seed: 1 }]);

		expect(serie.statement).not.toMatch(/placer:|case:/);
		const enonce = ligne(serie.statement);
		expect(enonce.placer).toBeUndefined();
		expect(enonce.points).toEqual([]);

		expect(serie.solution).not.toMatch(/placer:|case:/);
		const corrige = ligne(serie.solution);
		expect(corrige.placer).toBeUndefined();
		expect(corrige.points).toHaveLength(1);
		expect(corrige.points[0].label).toBe('A');
		expect(corrige.points[0].color).toBe('vert');
		expect(valeur(corrige.points[0])).toBeCloseTo(1.3);
	});

	it('deux points nommés : deux cases, chacun garde son nom et sa valeur', () => {
		const serie = buildSerie(modeles, [{ templateId: 'droite-deux-points', seed: 1 }]);
		const corrige = ligne(serie.solution);
		expect(corrige.points.map((p) => p.label)).toEqual(['A', 'B']);
		expect(corrige.points.map(valeur)).toEqual([-0.7, 0.2].map((v) => expect.closeTo(v)));
	});

	it('avec une autre case : le point compte pour une case, la formule remplie', () => {
		const serie = buildSerie(modeles, [{ templateId: 'droite-avec-case', seed: 1 }]);
		expect(serie.statement).toContain('\\text{……}');
		expect(serie.solution).toContain('\\mathbf{3}');
		expect(ligne(serie.solution).points.map((p) => p.label)).toEqual(['M']);
	});

	it('droite en retrait ou citée : refusée, message à l’appui', () => {
		expect(() => buildSerie(modeles, [{ templateId: 'droite-en-retrait', seed: 1 }])).toThrow(
			/droite à placer en retrait ou citée|premier niveau/
		);
	});
});

describe('buildSerie — repère à points à placer', () => {
	it('énoncé : le repère sans le point ; corrigé : le point attendu dessiné', () => {
		const serie = buildSerie(modeles, [{ templateId: 'repere-point', seed: 1 }]);

		expect(serie.statement).not.toMatch(/placer:|case:/);
		const enonce = plan(serie.statement);
		expect(enonce.spec?.placer).toBeUndefined();
		expect(enonce.spec?.points).toEqual([]);

		expect(serie.solution).not.toMatch(/placer:|case:/);
		const corrige = plan(serie.solution);
		expect(corrige.spec?.placer).toBeUndefined();
		expect(corrige.spec?.points.map(({ name, x, y }) => ({ name, x, y }))).toEqual([
			{ name: 'A', x: 2, y: -3 }
		]);
	});

	it('repère qui porte déjà des points : ils restent, les points attendus s’y ajoutent', () => {
		const serie = buildSerie(modeles, [{ templateId: 'repere-avec-points', seed: 1 }]);
		expect(plan(serie.statement).spec?.points.map((p) => p.name)).toEqual(['A', 'B']);
		const corrige = plan(serie.solution);
		expect(corrige.spec?.points.map(({ name, x, y }) => ({ name, x, y }))).toEqual([
			{ name: 'A', x: 1, y: 1 },
			{ name: 'B', x: -1, y: 2 },
			{ name: 'C', x: 3, y: -2 },
			{ name: 'D', x: -4, y: 0 }
		]);
	});

	it('point sans nom : la première lettre libre du repère', () => {
		const corrige = plan(
			buildSerie(modeles, [{ templateId: 'repere-sans-nom', seed: 1 }]).solution
		);
		expect(corrige.spec?.points.map((p) => p.name)).toEqual(['A', 'B']);
		expect(corrige.spec?.points[1]).toMatchObject({ x: 2, y: 1 });
	});

	it('repère en retrait ou cité : refusé, message à l’appui', () => {
		expect(() => buildSerie(modeles, [{ templateId: 'repere-en-retrait', seed: 1 }])).toThrow(
			/repère à compléter en retrait ou cité|premier niveau/
		);
	});
});
