/**
 * Série d'automatismes : droite à tracer (chantier automatismes-1spe, lot « Droites »)
 * ==================================================================================
 *
 * Phase 0 validée le 2026-11-03 : à l'énoncé, le repère reste vide (ligne `tracer:`
 * retirée) ; au corrigé, la droite y est dessinée. Le tracé compte pour une case.
 * Refusés, message à l'appui : droite verticale, vecteur à tracer, points à placer,
 * droite masquée (`tracer: ?`), repère en retrait ou cité.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { buildSerie } from '../serie-automatismes';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';
import { compile } from '$lib/mathAST/eval/compile';
import type { CourbeNode } from '$lib/ubumark/types/courbe';

/** Un modèle d'une variation, énoncé donné, variables m = 2 et p = -1 */
function modele(id: string, statement: string): QuestionTemplate {
	return {
		id,
		title: 't',
		grades: ['2'],
		theme: 'T',
		domain: 'D',
		level: 1,
		status: 'draft',
		variations: [
			{
				statement,
				variables: [
					{ name: 'm', expression: '2' },
					{ name: 'p', expression: '-1' }
				]
			}
		]
	} as unknown as QuestionTemplate;
}

const repere = (...lignes: string[]) =>
	['```courbe', 'x: -6 ; 6', 'y: -6 ; 6', 'grille: 1 ; 1', ...lignes, '```'].join('\n');

const reduite = modele(
	'reduite',
	`Trace la droite $d$ d'équation $y={{m}}x{{p;+}}$.\n\n${repere('tracer: y = {{m}}x + {{p}}')}`
);
const cartesienne = modele(
	'cartesienne',
	`Trace la droite.\n\n${repere('tracer: 2x + 3y - 6 = 0')}`
);
const avecF = modele(
	'avec-f',
	`Trace la droite.\n\n${repere('f(x) = x^2   bleu', 'tracer: y = {{m}}x + {{p}}')}`
);
const avecCase = {
	...reduite,
	id: 'avec-case',
	variations: [
		{
			...reduite.variations[0],
			statement: `Calcule $1+{{m}}=?$.\n\n${repere('tracer: y = {{m}}x + {{p}}')}`,
			blanks: [{ expectedAnswer: '3' }]
		}
	]
} as unknown as QuestionTemplate;
const fraction = modele('fraction', `Trace la droite.\n\n${repere('tracer: y = 1/3x - 1')}`);
const cartesienneTiers = modele(
	'cartesienne-tiers',
	`Trace la droite.\n\n${repere('tracer: x - 3y - 3 = 0')}`
);
const verticale = modele('verticale', `Trace la droite.\n\n${repere('tracer: x = 3')}`);
const vecteur = modele('vecteur', `Trace le vecteur.\n\n${repere('tracer: vecteur (3 ; -2)')}`);
const placer = modele('placer', `Place le point.\n\n${repere('placer: A=(2 ; 3)')}`);
const deuxReperes = modele(
	'deux-reperes',
	`Trace $d$.\n\n${repere('tracer: y = {{m}}x + {{p}}')}\n\nTrace $d'$.\n\n${repere('tracer: y = -x + 4')}`
);

const modeles = new Map(
	[
		reduite,
		cartesienne,
		fraction,
		cartesienneTiers,
		avecF,
		avecCase,
		verticale,
		vecteur,
		placer,
		deuxReperes
	].map((t) => [t.id, t])
);

/** Le premier bloc ```courbe d'un texte, analysé */
function bloc(texte: string): CourbeNode {
	const m = /```courbe\n([\s\S]*?)\n\s*```/.exec(texte);
	if (!m) throw new Error('pas de repère');
	return parseCourbeContent(
		m[1]
			.split('\n')
			.map((l) => l.replace(/^ {3}/, ''))
			.join('\n')
	);
}

/** Valeur en x de la fonction `nom` d'un repère */
function valeur(node: CourbeNode, nom: string, x: number): number {
	const fn = node.spec?.functions.find((f) => f.name === nom);
	if (!fn) throw new Error(`pas de fonction ${nom}`);
	return compile(fn.ast)({ x });
}

describe('buildSerie — droite à tracer', () => {
	it('énoncé : repère vide, sans tracer ni case ; corrigé : la droite dessinée', () => {
		const serie = buildSerie(modeles, [{ templateId: 'reduite', seed: 1 }]);

		const enonce = bloc(serie.statement);
		expect(enonce.errors).toEqual([]);
		expect(enonce.spec?.tracer).toBeUndefined();
		expect(enonce.spec?.functions).toEqual([]);
		expect(serie.statement).not.toMatch(/tracer:|case:/);

		const corrige = bloc(serie.solution);
		expect(corrige.errors).toEqual([]);
		expect(corrige.spec?.tracer).toBeUndefined();
		expect(corrige.spec?.functions).toHaveLength(1);
		expect(valeur(corrige, 'f', 0)).toBeCloseTo(-1);
		expect(valeur(corrige, 'f', 1)).toBeCloseTo(1);
		expect(serie.solution).not.toMatch(/tracer:|case:/);
	});

	it('équation cartésienne : la même droite, dessinée au corrigé', () => {
		const corrige = bloc(buildSerie(modeles, [{ templateId: 'cartesienne', seed: 1 }]).solution);
		expect(valeur(corrige, 'f', 0)).toBeCloseTo(2);
		expect(valeur(corrige, 'f', 3)).toBeCloseTo(0);
	});

	it('équation réduite à pente fractionnaire : membre de droite repris tel quel, sans flottant', () => {
		const serie = buildSerie(modeles, [{ templateId: 'fraction', seed: 1 }]);
		expect(serie.solution).toContain('f(x) = 1/3x - 1   vert');
		const corrige = bloc(serie.solution);
		expect(valeur(corrige, 'f', 3)).toBeCloseTo(0);
		expect(valeur(corrige, 'f', 0)).toBeCloseTo(-1);
	});

	it('équation cartésienne à coefficient non décimal : écrite sans traîne de flottant', () => {
		const serie = buildSerie(modeles, [{ templateId: 'cartesienne-tiers', seed: 1 }]);
		expect(serie.solution).not.toMatch(/\d{7,}/);
		const corrige = bloc(serie.solution);
		expect(valeur(corrige, 'f', 3)).toBeCloseTo(0);
		expect(valeur(corrige, 'f', 0)).toBeCloseTo(-1);
	});

	it('repère qui porte déjà f : la droite prend un autre nom, f reste', () => {
		const serie = buildSerie(modeles, [{ templateId: 'avec-f', seed: 1 }]);
		expect(bloc(serie.statement).spec?.functions.map((f) => f.name)).toEqual(['f']);
		const corrige = bloc(serie.solution);
		expect(corrige.spec?.functions.map((f) => f.name)).toEqual(['f', 'g']);
		expect(valeur(corrige, 'g', 0)).toBeCloseTo(-1);
	});

	it('avec une autre case : le tracé compte pour une case, la formule remplie', () => {
		const serie = buildSerie(modeles, [{ templateId: 'avec-case', seed: 1 }]);
		expect(serie.statement).toContain('\\text{……}');
		expect(serie.solution).toContain('\\mathbf{3}');
	});

	it('deux repères dans une question : deux cases, chacun garde sa droite', () => {
		const serie = buildSerie(modeles, [{ templateId: 'deux-reperes', seed: 1 }]);
		expect(serie.statement).not.toMatch(/tracer:|case:/);
		const blocs = [...serie.solution.matchAll(/```courbe\n([\s\S]*?)\n\s*```/g)].map((m) =>
			parseCourbeContent(
				m[1]
					.split('\n')
					.map((l) => l.replace(/^ {3}/, ''))
					.join('\n')
			)
		);
		expect(blocs).toHaveLength(2);
		expect(valeur(blocs[0], 'f', 0)).toBeCloseTo(-1);
		expect(valeur(blocs[1], 'f', 0)).toBeCloseTo(4);
	});

	it.each([
		['verticale', /droite verticale/],
		['vecteur', /vecteur à tracer/],
		['placer', /points à placer/]
	])('%s : refusé, message à l’appui', (id, message) => {
		expect(() => buildSerie(modeles, [{ templateId: id, seed: 1 }])).toThrow(message);
	});
});
