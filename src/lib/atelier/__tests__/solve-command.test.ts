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

describe('la ligne corrige le moteur au lieu de le suivre', () => {
	/**
	 * ⚠️ **Divergence VOULUE, et c'est l'inverse d'un défaut.** Le moteur
	 * applique des conventions de terminal qui lui font résoudre une autre
	 * équation que celle qui est écrite : il ampute le `x` final de
	 * `3x+5=14 x` (« x = 3 ») et lit le `-v` de `3-v=1` comme un drapeau
	 * (« contradictoire »).
	 *
	 * L'élève, lui, écrit des mathématiques — et le parseur les lit comme
	 * telles : `3x+5=14 x` EST l'équation `3x+5=14x`. La ligne affiche donc la
	 * réponse des étapes, qui est la bonne ; la sortie du moteur reste en
	 * repli, invisible tant que le LaTeX se compose.
	 */
	it('un x en fin d’équation reste dans l’équation', () => {
		const result = runInput(session(), '.résoudre 3x+5=14 x');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.latex).toBe('x = \\dfrac{5}{11}');
		// Le moteur, lui, répond « x = 3 » — c'est LUI qui se trompe.
		expect(result.output).toContain('3');
	});

	it('un « -v » reste une soustraction', () => {
		const result = runInput(session(), '.résoudre 3-v=1');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.latex).toBe('v = 2');
	});
});

describe('`.résoudre` se replie sans rien perdre', () => {
	it('L1 : un degré 3 garde la sortie actuelle du moteur', () => {
		const result = runInput(session(), '.résoudre x^3-x=0');

		// Le `kind` est asserté AVANT de lire la suite : sans ça, un `refus`
		// ferait échouer le test sur un `TypeError` qui ne dit pas ce qui s'est
		// passé.
		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.steps).toBeUndefined();
		// ⚠️ **La réponse ne disparaît jamais.** C'est la seule façon dont ce lot
		// pourrait rendre l'atelier pire qu'avant.
		expect(result.output.length).toBeGreaterThan(0);
	});

	it('L3 : une équation à paramètre garde la sortie actuelle', () => {
		const s = session();
		runInput(s, 'k(x) = b*x');

		const result = runInput(s, '.résoudre b*x+5=14');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.steps).toBeUndefined();
		expect(result.output.length).toBeGreaterThan(0);
	});

	it('les autres commandes ne portent pas d’étapes', () => {
		// ⚠️ Ce test a déjà changé de commande DEUX fois : `.dériver` porte des
		// étapes depuis le lot `pedagogical-differentiation`, `.simplifier`
		// depuis le lot `pedagogical-simplify`. Son intention n'a pas bougé —
		// une commande sans raisonnement à montrer n'invente pas d'étapes — il
		// lui faut seulement une commande qui le reste. `.équivalent` répond
		// oui ou non : il n'y a rien à dérouler derrière.
		const result = runInput(session(), '.équivalent (x+1)^2 x^2+2x+1');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.steps).toBeUndefined();
		expect(result.output.length).toBeGreaterThan(0);
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

describe('`.résoudre` sur une inéquation', () => {
	/**
	 * ⚠️ **Ici les étapes ne remplacent rien : elles sont TOUT.** Mesuré avant
	 * ce lot, `.résoudre 2x+1<7` rendait une ligne entièrement vide — pas une
	 * erreur, pas un message. Le moteur n'a rien pour les inéquations, d'où le
	 * fait qu'on n'attende pas son succès pour produire les étapes.
	 */
	it('la ligne porte la forme résolue là où le moteur ne rend rien', () => {
		const result = runInput(session(), '.résoudre 2x+1<7');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.latex).toBe('x < 3');
		expect(result.steps).toBeDefined();
		// Le moteur, lui, n'a rien produit : c'est le trou que ce lot comble.
		expect(result.output).toBe('');
	});

	it('une inéquation du second degré rend son ensemble de solutions', () => {
		const result = runInput(session(), '.résoudre x^2-4>=0');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.latex).toBe('S = ]-\\infty ; -2] \\cup [2 ; +\\infty[');
	});

	it('l’inéquation peut citer un objet de l’atelier', () => {
		const s = session();
		runInput(s, 'f(x) = x^2 - 4');

		const result = runInput(s, '.résoudre f(x)>=0');

		expect(result.kind).toBe('commande');
		if (result.kind !== 'commande') return;
		expect(result.steps).toBeDefined();
		expect(result.latex).toBe('S = ]-\\infty ; -2] \\cup [2 ; +\\infty[');
	});
});
