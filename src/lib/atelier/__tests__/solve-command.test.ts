/**
 * `.résoudre` branché sur le module pédagogique — §2 et §3 de la Phase 0.
 *
 * ⚠️ Ce qui est gardé ici, c'est le CHEMIN COMPLET, pas la fonction en
 * isolation : `solve-steps.test.ts` prouve que les étapes se calculent, ces
 * tests-ci prouvent que la commande de l'élève les reçoit. Deux moitiés vertes
 * ne font pas un geste vivant — 14 tests sont déjà passés au vert sur ce
 * chantier pendant qu'une action était morte (#339).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { CalcDesk } from '../desk.svelte';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

describe('`.résoudre` rend les étapes pédagogiques', () => {
	it('N1 : une équation du premier degré tapée à la main', () => {
		const result = runInput(session(), '.résoudre 3x+5=14');

		expect(result.kind).toBe('commande');
		const steps = result.kind === 'commande' ? result.steps : undefined;
		expect(steps).toBeDefined();
		expect(steps![0].title).toBe('Équation du premier degré');
	});

	it('N1 bis : la ligne porte la réponse, pas le bloc du terminal', () => {
		const result = runInput(session(), '.résoudre 3x+5=14');

		// La ligne montre `x = 3` en mathématiques ; les étapes se déplient
		// dessous (décision Q1).
		expect(result.kind === 'commande' && result.latex).toBe('x = 3');
	});

	it('N2 : plus aucune trace du formateur de terminal', () => {
		const result = runInput(session(), '.résoudre x^2-3x+1=0');
		const steps = result.kind === 'commande' ? result.steps : undefined;

		const latex = steps!.map((s) => s.expressionLatex ?? '').join(' ');
		expect(latex).not.toContain('sqrt(');
		// Le fragment cassé que rendait `solve.command.ts` : accolades orphelines.
		expect(latex).not.toContain('{1/2}');
	});

	it('N4 : l’équation peut citer un objet de l’atelier', () => {
		const s = session();
		runInput(s, 'f(x) = x^2 - 3x + 1');

		const result = runInput(s, '.résoudre f(x)=0');

		// ⚠️ Sans la substitution du §6 bis, mathAST prend `f` pour l'inconnue.
		const steps = result.kind === 'commande' ? result.steps : undefined;
		expect(steps).toBeDefined();
		expect(steps![0].title).toBe('Équation du second degré');
	});
});

describe('`.résoudre` se replie sans rien perdre', () => {
	it('L1 : un degré 3 garde la sortie actuelle du moteur', () => {
		const result = runInput(session(), '.résoudre x^3-x=0');

		expect(result.kind).toBe('commande');
		const commande = result as Extract<typeof result, { kind: 'commande' }>;
		expect(commande.steps).toBeUndefined();
		// ⚠️ **La réponse ne disparaît jamais.** C'est la seule façon dont ce lot
		// pourrait rendre l'atelier pire qu'avant.
		expect(commande.output.length).toBeGreaterThan(0);
	});

	it('L3 : une équation à paramètre garde la sortie actuelle', () => {
		const s = session();
		runInput(s, 'k(x) = b*x');

		const result = runInput(s, '.résoudre b*x+5=14');

		const commande = result as Extract<typeof result, { kind: 'commande' }>;
		expect(commande.steps).toBeUndefined();
		expect(commande.output.length).toBeGreaterThan(0);
	});

	it('les autres commandes ne portent pas d’étapes', () => {
		const result = runInput(session(), '.dériver x^2');

		const commande = result as Extract<typeof result, { kind: 'commande' }>;
		expect(commande.steps).toBeUndefined();
		expect(commande.output.length).toBeGreaterThan(0);
	});
});

describe('la ligne d’historique porte les étapes', () => {
	/**
	 * ⚠️ Le maillon que ce test garde : `runInput` peut très bien produire les
	 * étapes sans que la LIGNE les reçoive. C'est exactement ce qui s'est passé
	 * sur ce chantier avec les actions du panneau — fonction verte, geste mort.
	 */
	it('les étapes arrivent jusqu’à l’entrée affichée', () => {
		const desk = new CalcDesk(new Atelier());

		desk.submit('.résoudre 3x+5=14');

		expect(desk.entries.length).toBe(1);
		expect(desk.entries[0].steps).toBeDefined();
		expect(desk.entries[0].steps![0].title).toBe('Équation du premier degré');
		expect(desk.entries[0].latex).toBe('x = 3');
	});

	it('une commande sans étapes n’en invente pas', () => {
		const desk = new CalcDesk(new Atelier());

		desk.submit('.résoudre x^3-x=0');

		expect(desk.entries[0].steps).toBeUndefined();
		expect(desk.entries[0].text.length).toBeGreaterThan(0);
	});
});
