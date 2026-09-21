/**
 * `tidy` raconte ce qu'il fait — lot 1.
 *
 * Spécification : `docs/wip/tidy-voix-phase0.md`, validée par David le
 * 2026-09-21. Les attendus sont en syntaxe maison, telle que `toCustom`
 * l'imprime — même convention que `tidy.test.ts`.
 *
 * ⚠️ Le lot 1 matérialise un AST **entre les stages** du pipeline de somme.
 * Le travail fait terme par terme (nombres, radicaux, facteurs, signes) vit
 * dans la décomposition et sort ici en **une** étape grossière,
 * `tidy-terms` — que le lot 2 remplacera par ses quatre gestes. Sans elle, la
 * chaîne ne partirait pas de l'entrée : `sqrt(12)+sqrt(3)` commencerait à
 * `2sqrt(3)+sqrt(3)`, qui tomberait du ciel.
 */

import { describe, it, expect } from 'vitest';
import type { MathNode } from '../../types';
import { tidy } from '../index';
import { TidyStepRecorder } from '../step-recorder';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { nodesEqual } from '../../normal/hash';

interface EtapeLue {
	readonly regle: string;
	readonly avant: string;
	readonly apres: string;
}

function raconte(source: string): { resultat: string; noeud: MathNode; etapes: EtapeLue[] } {
	const recorder = new TidyStepRecorder();
	const noeud = tidy(parseCustom(source), { recorder });
	return {
		resultat: toCustom(noeud),
		noeud,
		etapes: recorder.getSteps().map((s) => ({
			regle: s.rule,
			avant: toCustom(s.before),
			apres: toCustom(s.after)
		}))
	};
}

// =============================================================================
// Les trois gestes du lot 1
// =============================================================================

describe('tidy raconte — les gestes', () => {
	it('regroupe les termes semblables', () => {
		const { resultat, etapes } = raconte('3x+2x-x');
		expect(resultat).toBe('4x');
		expect(etapes).toEqual([{ regle: 'tidy-collect-like-terms', avant: '3x+2x-x', apres: '4x' }]);
	});

	it('range par degré décroissant', () => {
		const { resultat, etapes } = raconte('2+x^2+x');
		expect(resultat).toBe('x^2+x+2');
		expect(etapes).toEqual([{ regle: 'tidy-sort-terms', avant: '2+x^2+x', apres: 'x^2+x+2' }]);
	});

	it('met chaque terme au propre avant de regrouper', () => {
		const { resultat, etapes } = raconte('sqrt(12)+sqrt(3)');
		expect(resultat).toBe('3sqrt(3)');
		expect(etapes.map((e) => e.regle)).toEqual(['tidy-terms', 'tidy-collect-like-terms']);
		expect(etapes[0].avant).toBe('sqrt(12)+sqrt(3)');
		expect(etapes[1].apres).toBe('3sqrt(3)');
	});
});

// =============================================================================
// Un geste qui ne change pas l'écriture n'est pas une étape
// =============================================================================

describe('tidy raconte — ce qu’il tait', () => {
	it.each([
		['une somme déjà rangée et sans termes semblables', 'x+y'],
		['un terme unique', '5x'],
		['une expression déjà au propre', 'x^2+x+2']
	])('ne dit rien sur %s', (_cas, source) => {
		expect(raconte(source).etapes).toEqual([]);
	});
});

// =============================================================================
// Lot 2 — les quatre gestes du niveau du facteur
// =============================================================================

/**
 * Le lot 1 sortait tout le travail fait terme par terme en UN geste grossier,
 * `tidy-terms`. Le lot 2 le remplace par les gestes que l'élève nomme.
 *
 * ⚠️ **Une étape = une FAMILLE, pas une occurrence** (spécification validée) :
 * `√8 + √12` rend UNE étape « on extrait les carrés parfaits », appliquée
 * partout, pas une par radical.
 */
describe('tidy raconte — les gestes du facteur', () => {
	it('calcule les nombres', () => {
		const { resultat, etapes } = raconte('2*3*x');
		expect(resultat).toBe('6x');
		expect(etapes).toEqual([{ regle: 'tidy-fold-numbers', avant: '2*3*x', apres: '6x' }]);
	});

	it('extrait les carrés parfaits du radical', () => {
		const { resultat, etapes } = raconte('sqrt(8)');
		expect(resultat).toBe('2sqrt(2)');
		expect(etapes).toEqual([
			{ regle: 'tidy-extract-radicals', avant: 'sqrt(8)', apres: '2sqrt(2)' }
		]);
	});

	it('regroupe les facteurs de même base', () => {
		const { resultat, etapes } = raconte('x*x*x');
		expect(resultat).toBe('x^3');
		expect(etapes).toEqual([{ regle: 'tidy-merge-factors', avant: 'x*x*x', apres: 'x^3' }]);
	});

	it('simplifie les signes', () => {
		const { resultat, etapes } = raconte('-(-x)');
		expect(resultat).toBe('x');
		expect(etapes).toEqual([{ regle: 'tidy-simplify-signs', avant: '-(-x)', apres: 'x' }]);
	});

	it('applique une famille partout, en une seule étape', () => {
		const { resultat, etapes } = raconte('sqrt(8)+sqrt(12)');
		expect(resultat).toBe('2sqrt(2)+2sqrt(3)');
		expect(etapes).toEqual([
			{
				regle: 'tidy-extract-radicals',
				avant: 'sqrt(8)+sqrt(12)',
				apres: '2sqrt(2)+2sqrt(3)'
			}
		]);
	});

	it('met les fractions au même dénominateur, et le dit', () => {
		const { resultat, etapes } = raconte('2/6+1/4');
		expect(resultat).toBe('7/12');
		expect(etapes).toEqual([
			{ regle: 'tidy-fold-numbers', avant: '2/6+1/4', apres: '1/3+1/4' },
			{ regle: 'tidy-add-fractions', avant: '1/3+1/4', apres: '7/12' }
		]);
	});

	it('porte les phrases françaises du lot 2', () => {
		const recorder = new TidyStepRecorder();
		tidy(parseCustom('sqrt(8)'), { recorder });
		expect(recorder.getSteps().map((s) => s.description)).toEqual([
			'On extrait du radical les facteurs qui sont des carrés parfaits'
		]);
	});

	it('ne laisse plus le geste grossier du lot 1 sur ces cas', () => {
		const grossiers = ['2*3*x', 'sqrt(8)', 'x*x*x', '-(-x)', 'sqrt(8)+sqrt(12)', '2/6+1/4']
			.flatMap((source) => raconte(source).etapes)
			.filter((e) => e.regle === 'tidy-terms');
		expect(grossiers).toEqual([]);
	});
});

// =============================================================================
// Ce que la revue a trouvé — aucune écriture inventée, aucun silence trompeur
// =============================================================================

describe('tidy raconte — n’invente aucune écriture', () => {
	it('ne montre jamais une grandeur en fraction', () => {
		const { resultat, etapes } = raconte('0.005[m]');
		expect(resultat).toBe('5[mm]');
		expect(etapes).toEqual([{ regle: 'tidy-choose-unit', avant: '0.005[m]', apres: '5[mm]' }]);
	});

	it('convertit les unités en un seul geste', () => {
		const { resultat, etapes } = raconte('12[km]+500[m]');
		expect(resultat).toBe('12.5[km]');
		expect(etapes).toEqual([
			{ regle: 'tidy-choose-unit', avant: '12[km]+500[m]', apres: '12.5[km]' }
		]);
	});

	it('choisit l’unité adaptée d’un terme seul', () => {
		const { resultat, etapes } = raconte('3600[s]');
		expect(resultat).toBe('1[h]');
		expect(etapes).toEqual([{ regle: 'tidy-choose-unit', avant: '3600[s]', apres: '1[h]' }]);
	});

	it('regroupe des grandeurs de même unité sans parler de conversion', () => {
		const etapes = raconte('2[km]+3[km]').etapes;
		expect(etapes.map((e) => e.regle)).toEqual(['tidy-collect-like-terms']);
	});

	it('ne fabrique pas un terme de coefficient nul', () => {
		const { resultat, etapes } = raconte('x*0');
		expect(resultat).toBe('0');
		expect(etapes.map((e) => e.apres)).toEqual(['0']);
	});

	it('part de ce que l’élève a écrit, parenthèses comprises', () => {
		const etapes = raconte('(3x+2x)').etapes;
		expect(etapes[0]?.avant).toBe('(3x+2x)');
	});
});

describe('tidy raconte — il ne se tait pas quand le résultat change', () => {
	it('raconte une relation entière, pas un membre', () => {
		const { resultat, etapes } = raconte('3x+2x=5');
		expect(resultat).toBe('5x=5');
		expect(etapes).toEqual([{ regle: 'tidy-collect-like-terms', avant: '3x+2x=5', apres: '5x=5' }]);
	});

	it('raconte une soustraction de températures', () => {
		const { resultat, etapes } = raconte('30[°C]-20[°C]');
		expect(resultat).toBe('10[K]');
		expect(etapes.length).toBeGreaterThan(0);
		expect(etapes[etapes.length - 1].apres).toBe('10[K]');
	});
});

// =============================================================================
// Les invariants de la spécification
// =============================================================================

const PANEL = [
	'3x+2x-x',
	'2+x^2+x',
	'sqrt(12)+sqrt(3)',
	'2*3*x',
	'x*x*x',
	'-(-x)',
	'x+y',
	'5x',
	'2x+3-x+1',
	'2/6+1/4',
	'x+x',
	'sqrt(8)',
	'2*(x+1)^2+3*(x+1)^2',
	'x*(x+1)',
	'(x+1)^2',
	// Les quatre classes que l'ancien panel ignorait, et où la revue a trouvé
	// les défauts : grandeurs, relation, parenthèses superflues, terme annulé.
	'0.005[m]',
	'12[km]+500[m]',
	'3600[s]',
	'2[km]+3[km]',
	'3x+2x=5',
	'(3x+2x)',
	'x*0',
	'30[°C]-20[°C]',
	// Lot 2 — les quatre familles du niveau du facteur.
	'sqrt(8)+sqrt(12)',
	'2*3*x*(x^2+1)^2',
	'x^2/x',
	'-(-x)/(-y)'
];

describe('tidy raconte — les invariants', () => {
	it.each(PANEL)('la chaîne part de l’entrée et recolle sur tidy() — %s', (source) => {
		const entree = parseCustom(source);
		const { etapes, resultat, noeud } = raconte(source);
		expect(resultat).toBe(toCustom(tidy(entree)));
		if (etapes.length > 0) {
			expect(etapes[0].avant).toBe(toCustom(entree));
			expect(etapes[etapes.length - 1].apres).toBe(resultat);
		} else {
			// ⚠️ Pas d'échappatoire ici. L'ancienne version sortait par le haut
			// quand il n'y avait aucune étape — et c'est exactement la forme des
			// défauts trouvés en revue : le résultat change, la chaîne est vide.
			//
			// La comparaison est STRUCTURELLE : `x*(x+1)` s'imprime `x(x+1)`, mais
			// le `×` implicite est une convention de `toCustom`, pas un geste de
			// `tidy`. Le silence doit vouloir dire « rien n'a bougé », pas
			// « rien ne s'imprime pareil ».
			expect(nodesEqual(entree, noeud)).toBe(true);
		}
	});

	it.each(PANEL)('chaque étape enchaîne sur la suivante — %s', (source) => {
		const etapes = raconte(source).etapes;
		// Le « avant » de chacune, sauf la première, est le « après » de la
		// précédente. Écrit en comparant deux listes pour asserter même quand
		// il n'y a aucune étape.
		expect(etapes.slice(1).map((e) => e.avant)).toEqual(etapes.slice(0, -1).map((e) => e.apres));
	});

	it.each(PANEL)('aucune étape ne tourne à vide — %s', (source) => {
		expect(raconte(source).etapes.filter((e) => e.avant === e.apres)).toEqual([]);
	});

	it.each(PANEL)('le résultat ne bouge pas quand personne n’écoute — %s', (source) => {
		expect(toCustom(tidy(parseCustom(source)))).toBe(raconte(source).resultat);
	});

	it('chaque étape porte sa phrase française', () => {
		const recorder = new TidyStepRecorder();
		tidy(parseCustom('sqrt(12)+sqrt(3)'), { recorder });
		expect(recorder.getSteps().map((s) => s.description)).toEqual([
			'On met chaque terme au propre',
			'On regroupe les termes semblables'
		]);
	});
});
