/**
 * Le bouton « Résoudre » du panneau et la commande `.résoudre` doivent dire la
 * MÊME chose.
 *
 * ⚠️ **Deux chemins, deux réponses — le défaut que ce lot ferme.** Depuis que
 * `.résoudre` passe par `pedagogical-solve`, l'élève qui TAPE la commande reçoit
 * le raisonnement en français ; celui qui CLIQUE le bouton recevait encore le
 * bloc de terminal (« Equation quadratique », « Delta », « sqrt(5) »). Le même
 * geste, deux résultats.
 *
 * C'est la forme exacte du défaut que `substituteNames` documente déjà dans
 * `calcul.ts` : « Deux chemins, deux réponses, dont une fausse et silencieuse. »
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, runAction, type CalcSession } from '../calcul';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

describe('le bouton et la commande s’accordent', () => {
	it('sur une fonction du second degré', () => {
		const s = session();
		runInput(s, 'f(x) = x^2 - 3x + 2');

		const clic = runAction(s, 'solve', 'f');
		const frappe = runInput(s, '.résoudre x^2-3x+2=0');

		expect(clic.ok).toBe(true);
		if (!clic.ok || frappe.kind !== 'commande') return;

		// La même réponse, et les mêmes étapes.
		expect(clic.latex).toBe(frappe.latex);
		expect(clic.steps?.map((st) => st.title)).toEqual(frappe.steps?.map((st) => st.title));
	});

	it('sur une fonction du premier degré', () => {
		const s = session();
		runInput(s, 'g(x) = 3x - 9');

		const clic = runAction(s, 'solve', 'g');

		expect(clic.ok).toBe(true);
		if (!clic.ok) return;
		expect(clic.latex).toBe('x = 3');
		expect(clic.steps?.[0].title).toBe('Équation du premier degré');
	});

	it('plus une trace du formateur de terminal', () => {
		const s = session();
		runInput(s, 'f(x) = x^2 - 3x + 2');

		const clic = runAction(s, 'solve', 'f');

		expect(clic.ok).toBe(true);
		if (!clic.ok) return;
		const titres = (clic.steps ?? []).map((st) => st.title).join(' ');
		// « Equation quadratique » sans accent, c'était la sortie du terminal.
		expect(titres).toContain('Équation du second degré');
		expect(titres).not.toContain('Equation quadratique');
	});
});

describe('la ligne d’historique reçoit les étapes', () => {
	/**
	 * ⚠️ `runAction` peut très bien produire les étapes sans que la LIGNE les
	 * reçoive : c'est exactement ce qui s'est passé sur ce chantier avec les
	 * actions du panneau — fonction verte, geste mort (#339).
	 */
	it('cliquer « Résoudre » pousse une entrée qui porte les étapes', () => {
		const desk = new CalcDesk(new Atelier());
		desk.atelier.create({ kind: 'function', name: 'f', definition: 'x^2 - 3x + 2' });

		desk.runFromPanel('solve', 'f');

		expect(desk.entries.length).toBe(1);
		expect(desk.entries[0].steps).toBeDefined();
		expect(desk.entries[0].latex).toBe('S = \\left\\{ 1 \\,;\\, 2 \\right\\}');
	});
});

describe('le repli du bouton', () => {
	it('un objet que le module ne sait pas résoudre garde la sortie du moteur', () => {
		const s = session();
		runInput(s, 'h(x) = x^3 - x');

		const clic = runAction(s, 'solve', 'h');

		expect(clic.ok).toBe(true);
		if (!clic.ok) return;
		// Degré 3 : repli. La réponse ne disparaît pas.
		expect(clic.steps).toBeUndefined();
		expect(clic.output.length).toBeGreaterThan(0);
	});
});
