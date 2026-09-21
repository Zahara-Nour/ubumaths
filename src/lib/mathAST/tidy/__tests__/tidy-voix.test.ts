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
import { tidy } from '../index';
import { TidyStepRecorder } from '../step-recorder';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';

interface EtapeLue {
	readonly regle: string;
	readonly avant: string;
	readonly apres: string;
}

function raconte(source: string): { resultat: string; etapes: EtapeLue[] } {
	const recorder = new TidyStepRecorder();
	const resultat = tidy(parseCustom(source), { recorder });
	return {
		resultat: toCustom(resultat),
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
		expect(raconte('3x+2x-x')).toEqual({
			resultat: '4x',
			etapes: [{ regle: 'tidy-collect-like-terms', avant: '3x+2x-x', apres: '4x' }]
		});
	});

	it('range par degré décroissant', () => {
		expect(raconte('2+x^2+x')).toEqual({
			resultat: 'x^2+x+2',
			etapes: [{ regle: 'tidy-sort-terms', avant: '2+x^2+x', apres: 'x^2+x+2' }]
		});
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
	'(x+1)^2'
];

describe('tidy raconte — les invariants', () => {
	it.each(PANEL)('la chaîne part de l’entrée et recolle sur tidy() — %s', (source) => {
		const entree = parseCustom(source);
		const { etapes, resultat } = raconte(source);
		expect(resultat).toBe(toCustom(tidy(entree)));
		if (etapes.length === 0) return;
		expect(etapes[0].avant).toBe(toCustom(entree));
		expect(etapes[etapes.length - 1].apres).toBe(resultat);
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
