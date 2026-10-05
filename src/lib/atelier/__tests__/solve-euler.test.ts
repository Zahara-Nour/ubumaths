/**
 * `.résoudre e^x=e` (atelier) et `.solve e^x=e` (moteur) — chemin complet.
 *
 * ⚠️ Réponse fausse et assurée relevée en revue : « Pas de solution :
 * l'équation est contradictoire » au lieu de x = 1, y compris tapée
 * directement. La cause est dans `solve` (le `e` seul restait une variable) ;
 * ces tests gardent ce que l'élève LIT, pas seulement la fonction.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

/** Dernière ligne non vide : la conclusion. */
function conclusion(output: string): string {
	const lines = output.split('\n').filter((l) => l.trim() !== '');
	return lines[lines.length - 1].trim();
}

describe('`.solve` du moteur — la constante e hors d’un exposant', () => {
	it.each([
		['e^x=e', 'x = 1'],
		['e^{2x}=e', 'x = 1/2'],
		['2e^x=2e', 'x = 1'],
		['e^x=e^{-x}', 'x = 0'],
		['e^x=e^2', 'x = 2'],
		['e^{x+1}=e^3', 'x = 2'],
		['e^x=1', 'x = 0']
	])('%s conclut %s', (input, expected) => {
		const result = new WebReplEngine().execute(`.solve ${input}`);
		expect(result.success).toBe(true);
		expect(conclusion(result.output)).toBe(expected);
	});
});

describe('`.résoudre` de l’atelier — la constante e hors d’un exposant', () => {
	it('e^x=e tapée directement conclut x = 1', () => {
		const result = runInput(session(), '.résoudre e^x=e');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.output).not.toContain('contradictoire');
		expect(conclusion(result.output)).toBe('x = 1');
	});

	it('après f(x)=e^x, `.résoudre f(x)=e` conclut x = 1', () => {
		const s = session();
		runInput(s, 'f(x)=e^x');

		const result = runInput(s, '.résoudre f(x)=e');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.output).not.toContain('contradictoire');
		expect(conclusion(result.output)).toBe('x = 1');
	});
});

describe('`.solve` du moteur — e seul sans exponentielle : inchangé', () => {
	it('ax+e=0 x garde la lettre e', () => {
		const result = new WebReplEngine().execute('.solve ax+e=0 x');
		expect(result.success).toBe(true);
		expect(conclusion(result.output)).toBe('x = {-e}/a');
	});
});
