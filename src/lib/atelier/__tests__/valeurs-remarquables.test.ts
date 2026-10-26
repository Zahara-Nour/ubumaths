/**
 * `.simplifier` et les valeurs remarquables (chantier valeurs-remarquables,
 * phase 0 validée par David le 2026-10-26).
 *
 * Décision S4 de simplify-carte : une identité enseignée — ici `cos(π/3) = 1/2` —
 * se fait dans `réduire` avec une étape nommée, jamais en silence. Mesuré avant :
 * `x cos(π/3)` restait, `cos(π/3)/x` → `1/(2x)` sans étape (repli sur le moteur),
 * `x cos(60°)` → `x/2` sous « On met chaque terme au propre ».
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';

// =============================================================================
// Helpers
// =============================================================================

/** La ligne affichée (`latex`) et les titres des étapes. */
function line(input: string): { latex: string; titles: string[] } {
	const result = runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, input);
	if (result.kind !== 'commande' && result.kind !== 'calcul') {
		throw new Error(`pas une ligne de calcul : ${JSON.stringify(result)}`);
	}
	return {
		latex: result.latex ?? '',
		titles: (result.steps ?? []).map((step) => step.title)
	};
}

const COS_PI_3 = String.raw`$\cos\left( \dfrac{\pi}{3} \right) = \dfrac{1}{2}$`;

// =============================================================================
// Tests
// =============================================================================

describe('.simplifier — valeurs remarquables, avec une étape', () => {
	it.each([
		['.simplifier x cos(π/3)', String.raw`\dfrac{x}{2}`],
		['.simplifier cos(π/3)/x', String.raw`\dfrac{1}{2 x}`],
		['.simplifier cos(π/3)', String.raw`\dfrac{1}{2}`]
	])('%s → %s, l’étape dit cos(π/3) = 1/2', (input, expected) => {
		const { latex, titles } = line(input);
		expect(latex).toBe(expected);
		expect(titles).toContain(`On utilise une valeur remarquable : ${COS_PI_3}`);
	});

	it.each([
		['.simplifier 2sin(π/6)+x', 'x + 1', String.raw`\sin\left( \dfrac{\pi}{6} \right)`],
		[
			'.simplifier sin(π/4)x',
			String.raw`\dfrac{\sqrt{2} x}{2}`,
			String.raw`\sin\left( \dfrac{\pi}{4} \right)`
		],
		['.simplifier tan(π/4)x', 'x', String.raw`\tan\left( \dfrac{\pi}{4} \right)`],
		['.simplifier cos(0)x', 'x', String.raw`\cos\left( 0 \right)`],
		['.simplifier sin(π)x+1', '1', String.raw`\sin\left( \pi \right)`]
	])('%s → %s, avec l’étape (plus de calcul silencieux)', (input, expected, written) => {
		const { latex, titles } = line(input);
		expect(latex).toBe(expected);
		expect(
			titles.some((t) => t.startsWith(`On utilise une valeur remarquable : $${written} =`))
		).toBe(true);
	});

	it('sin(−π/6) : la parité, puis la valeur', () => {
		const { latex, titles } = line('.simplifier sin(-π/6)x');
		expect(latex).toBe(String.raw`-\dfrac{x}{2}`);
		expect(titles[0]).toBe('sin est impaire : sin(-x) = -sin(x)');
		expect(titles).toContain(
			String.raw`On utilise une valeur remarquable : $\sin\left( \dfrac{\pi}{6} \right) = \dfrac{1}{2}$`
		);
	});

	it('cos(7π/3) : la période, puis la valeur', () => {
		const { latex, titles } = line('.simplifier cos(7π/3)x');
		expect(latex).toBe(String.raw`\dfrac{x}{2}`);
		expect(titles[0]).toBe('cos est 2π-périodique');
		expect(titles).toContain(`On utilise une valeur remarquable : ${COS_PI_3}`);
	});

	it('en degrés : cos(60°) = 1/2, même étape', () => {
		const { latex, titles } = line('.simplifier x cos(60°)');
		expect(latex).toBe(String.raw`\dfrac{x}{2}`);
		expect(titles[0]).toBe(
			String.raw`On utilise une valeur remarquable : $\cos\left( 60{}^{\circ} \right) = \dfrac{1}{2}$`
		);
	});

	it.each([
		[
			'.simplifier cos(-60°)x',
			String.raw`\dfrac{x}{2}`,
			String.raw`$\cos\left( -60{}^{\circ} \right) = \dfrac{1}{2}$`
		],
		[
			'.simplifier cos(420°)',
			String.raw`\dfrac{1}{2}`,
			String.raw`$\cos\left( 60{}^{\circ} \right) = \dfrac{1}{2}$`
		]
	])('en degrés : %s → %s', (input, expected, value) => {
		const { latex, titles } = line(input);
		expect(latex).toBe(expected);
		expect(titles).toContain(`On utilise une valeur remarquable : ${value}`);
	});

	it('un angle en degrés hors table reste en degrés, signe collé', () => {
		expect(line('.simplifier cos(20°)x').latex).toBe(String.raw`\cos\left( 20{}^{\circ} \right) x`);
	});

	it('deux valeurs dans la ligne : une seule étape qui les liste', () => {
		const { latex, titles } = line('.simplifier sin(π/6)+cos(π/3)');
		expect(latex).toBe('1');
		expect(titles[0]).toBe(
			String.raw`On utilise des valeurs remarquables : $\sin\left( \dfrac{\pi}{6} \right) = \dfrac{1}{2}$ et ${COS_PI_3}`
		);
	});
});

describe('.simplifier — ce qui reste écrit', () => {
	it.each([
		['.simplifier cos(π/5)x', String.raw`\cos\left( \dfrac{\pi}{5} \right) x`],
		['.simplifier sin(π/12)x', String.raw`\sin\left( \dfrac{\pi}{12} \right) x`],
		['.simplifier tan(π/2)x', String.raw`\tan\left( \dfrac{\pi}{2} \right) x`]
	])('%s : angle hors table ou valeur non définie, gardé', (input, expected) => {
		const { latex, titles } = line(input);
		expect(latex).toBe(expected);
		expect(titles.some((t) => t.includes('valeur remarquable'))).toBe(false);
	});

	it('cos(x + π/3) : pas une constante, gardé', () => {
		const { titles } = line('.simplifier cos(x+π/3)');
		expect(titles.some((t) => t.includes('valeur remarquable'))).toBe(false);
	});

	it('une ligne tapée seule garde l’écriture (tidy, S4)', () => {
		expect(line('x+cos(π/3)').latex).toBe(String.raw`x + \cos\left( \dfrac{\pi}{3} \right)`);
	});
});
