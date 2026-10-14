/**
 * Une ligne du mode texte passe au champ MathLive, puis revient au moteur :
 * même réponse. Dans le VRAI champ (Chromium), pas sur la chaîne intermédiaire.
 *
 * Revue du 2026-10-14 : `\text{simuler}\,L M 100` était juste en chaîne, mais
 * MathLive range « LM100 » (il ignore l'espace entre deux atomes) — le test
 * qui composait `calcTextOf(fieldLatexFromText(…))` sans MathLive ne le voyait
 * pas. C'est le chemin des commandes préparées par une carte, de la bascule
 * depuis le mode texte et de ↑ / ↓.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import 'mathlive';
import type { MathfieldElement } from 'mathlive';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { runInput, type CalcResult } from '$lib/atelier/calcul';
import { commandCatalog } from '$lib/atelier/commands';
import { calcTextOf, commandWords, fieldLatexFromText } from '$lib/atelier/natural-input';

// =============================================================================
// Décor
// =============================================================================

const words = commandWords(commandCatalog(new WebReplEngine()));

/** Un dé (L, M) et deux listes qualitatives (G, R), pour les commandes à listes. */
const LISTS: Record<string, string> = {
	L: '1;2;3;4;5;6',
	M: '1/6;1/6;1/6;1/6;1/6;1/6',
	G: 'fille;garçon;fille;garçon',
	R: 'oui;non;non;oui'
};

let field: MathfieldElement;

beforeAll(() => {
	field = document.createElement('math-field') as MathfieldElement;
	document.body.append(field);
});

function shown(result: CalcResult): string {
	if (result.kind === 'calcul' || result.kind === 'commande') return result.latex ?? result.output;
	if (result.kind === 'refus') return `refus : ${result.message}`;
	if (result.kind === 'definition') return `définition ${result.name}`;
	return result.kind;
}

/** La première ligne de la réponse (`.équivalent` répète l'expression, espaces compris). */
function answer(input: string): string {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(LISTS)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return shown(runInput({ atelier, engine: new WebReplEngine(), seed: () => 4821 }, input)).split(
		'\n'
	)[0];
}

/** Le texte → le champ, tel que MathLive le range → le texte envoyé. */
function throughField(text: string): string | null {
	field.value = fieldLatexFromText(text, words);
	const back = calcTextOf(field.value, words);
	return back.ok ? back.text : null;
}

// =============================================================================
// Tests
// =============================================================================

describe('le texte passe par le champ MathLive sans perdre de sens', () => {
	it.each([
		// Les commandes préparées par une carte (`desk.svelte.ts`)
		'.simuler L M 100',
		'.croiser G R',
		'.comparer L M',
		'.filtrer G = fille et R = oui',
		'.binomiale X 10 0,3',
		'.mode décimal',
		'.résoudre x^2=4',
		'.résoudre x^2 = 4',
		'.intégrer x^2 de 0 à 1',
		'5 km + 300 m',
		'1/4+1/3'
	])('%s', (text) => {
		const back = throughField(text);
		expect(back).not.toBeNull();
		if (back === null) return;
		expect(answer(back)).toBe(answer(text));
	});

	it('l’exemple de chaque commande du catalogue', () => {
		const examples = commandCatalog(new WebReplEngine()).flatMap((c) => c.example ?? []);
		const lost = examples.filter((example) => {
			const back = throughField(example);
			return back === null || answer(back) !== answer(example);
		});
		expect(examples.length).toBeGreaterThan(20);
		expect(lost).toEqual([]);
	});
});
