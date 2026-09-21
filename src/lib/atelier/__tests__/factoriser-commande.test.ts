/**
 * `.factoriser` — une commande que l'atelier sert LUI-MÊME.
 *
 * ⚠️ C'est la première : toutes les autres passent par `engine.execute`. Le
 * registre du moteur n'a **aucune** commande de factorisation — mesuré, les 34
 * commandes du catalogue ne contiennent ni `factor` ni `expand`. L'intention
 * `factoriser` de `pedagogical-simplify` n'était donc atteignable depuis
 * aucune interface, et la règle de facteur commun livrée en #372 était du code
 * mort de fait.
 *
 * ⚠️ **Sans moteur, il n'y a pas de repli.** Là où `.simplifier` garde la
 * sortie du moteur quand le module ne sait rien dire, `.factoriser` n'a que ce
 * que le module lui donne : le cas « je n'ai pas su » doit donc se DIRE, pas
 * se taire ni renvoyer l'entrée comme si c'était une réponse.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { factorSteps } from '../factor-steps';

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function run(input: string) {
	return runInput(session(), input);
}

function commande(input: string) {
	const result = run(input);
	expect(result.kind, `« ${input} » n'a pas rendu une commande`).toBe('commande');
	return result.kind === 'commande' ? result : null!;
}

describe('la commande existe et se découvre', () => {
	it('elle est au catalogue, juste après « simplifier »', () => {
		const catalog = commandCatalog(new WebReplEngine());
		const index = catalog.findIndex((c) => c.french === 'factoriser');

		expect(index, '« factoriser » absente du catalogue').toBeGreaterThan(-1);
		expect(catalog[index - 1].french).toBe('simplifier');
		expect(catalog[index].unavailable).toBeUndefined();
	});

	it('son exemple marche vraiment', () => {
		// ⚠️ Un exemple de catalogue qui échoue est pire que pas d'exemple :
		// l'élève le recopie et reçoit une erreur.
		const command = commandCatalog(new WebReplEngine()).find((c) => c.french === 'factoriser')!;

		expect(command.example).toBeDefined();
		expect(commande(command.example!).steps).toBeDefined();
	});

	it('elle n’est PAS envoyée au moteur, qui ne la connaît pas', () => {
		// Le moteur répondrait « Unknown command » en anglais.
		const result = commande('.factoriser x^2-4');

		expect(result.output).not.toContain('Unknown');
		expect(result.output).not.toContain('Error');
	});
});

describe('ce que `.factoriser` sait faire', () => {
	it('la différence de deux carrés', () => {
		const result = commande('.factoriser x^2-4');

		expect(result.latex).toBe('\\left( x + 2 \\right) \\left( x - 2 \\right)');
		expect(result.steps![0].title).toBe('On factorise avec a² - b² = (a+b)(a-b)');
	});

	it('le trinôme carré parfait', () => {
		expect(commande('.factoriser x^2-6x+9').latex).toBe('\\left( x - 3 \\right)^2');
	});

	it('le facteur commun — la règle qui n’avait aucun appelant', () => {
		const result = commande('.factoriser exp(x)+x*exp(x)');

		// ⚠️ L'ordre est celui de la FACTORISATION, pas celui de `tidy`.
		// `tidy`, branché sur cette intention pour mettre au propre les
		// coefficients, range les facteurs dans son ordre canonique et aurait
		// écrit `e^x(x+1)`. Les deux écritures sont justes, mais c'est
		// `(x+1)e^x` qu'on écrit au tableau pour une dérivée, et l'ordre vient
		// d'une factorisation que l'élève vient de suivre : le moteur n'a pas à
		// la rebattre. Décision de David, 2026-09-21.
		expect(result.latex).toBe('\\left( x + 1 \\right) \\exp\\left( x \\right)');
		expect(result.steps![0].title).toBe('On met le facteur commun en évidence');
	});

	it('le nom moteur mène au même endroit', () => {
		// Comme toutes les autres commandes, elle accepte son nom anglais.
		expect(commande('.factor x^2-4').latex).toBe(commande('.factoriser x^2-4').latex);
	});

	it('une faute de frappe est rattrapée, pas ignorée', () => {
		const result = run('.factorise x^2-4');

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toContain('factoriser');
	});

	it('les noms d’objets sont substitués avant de factoriser', () => {
		const s = session();
		s.atelier.create({ kind: 'function', name: 'f', definition: 'x^2-4' });
		const result = runInput(s, '.factoriser f(x)');

		// ⚠️ **Pas de parenthèses en trop autour de toute la réponse.** La
		// substitution écrit `(x^2-4)` — parenthèses nécessaires à la relecture
		// — et factoriser, contrairement à dériver, ne remplace pas le nœud
		// racine : l'enveloppe restait, et la ligne affichait `((x+2)(x-2))`.
		expect(result.kind === 'commande' && result.latex).toBe(
			'\\left( x + 2 \\right) \\left( x - 2 \\right)'
		);
	});

	it('une expression entièrement parenthésée à la main, pareil', () => {
		expect(commande('.factoriser (x^2-4)').latex).toBe(
			'\\left( x + 2 \\right) \\left( x - 2 \\right)'
		);
	});
});

describe('quand elle ne sait pas, elle le DIT', () => {
	it('une somme qu’elle n’a pas su factoriser', () => {
		// ⚠️ Ce test utilisait `3x + 6`, et son commentaire disait lui-même que
		// le module « ne sait pas extraire un facteur commun NUMÉRIQUE » et que
		// « `3x + 6` devrait donner `3(x + 2)` ». Il enregistrait donc la
		// limitation. Elle est levée depuis le 2026-09-21, et il faut une somme
		// qui n'a réellement aucun facteur commun pour continuer à éprouver le
		// chemin « je ne sais pas ».
		const result = commande('.factoriser 2x+3y');

		expect(result.latex).toBeUndefined();
		expect(result.steps).toBeUndefined();
		expect(result.output).toContain('ne sais pas factoriser');
	});

	it('et ce qu’elle sait maintenant, elle le dit', () => {
		expect(commande('.factoriser 3x+6').latex).toBe('3 \\left( x + 2 \\right)');
	});

	it('une expression qui n’est pas une somme n’a rien à factoriser', () => {
		const result = commande('.factoriser (x+1)(x-1)');

		expect(result.output).toContain('n’est pas une somme');
		expect(result.latex).toBeUndefined();
	});

	it('et ce n’est pas une erreur rouge', () => {
		// « Je ne sais pas » est une réponse, pas un refus de l'atelier.
		expect(run('.factoriser 3x+6').kind).toBe('commande');
		expect(run('.factoriser (x+1)(x-1)').kind).toBe('commande');
	});
});

describe('les refus, en français', () => {
	it('sans expression', () => {
		const result = run('.factoriser');

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toContain('factoriser');
	});

	it('une saisie illisible', () => {
		const result = run('.factoriser ###');

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).toContain('expression valide');
	});

	it('une inéquation sort du périmètre du module', () => {
		const result = run('.factoriser 2x+1<7');

		expect(result.kind).toBe('refus');
		expect(result.kind === 'refus' && result.message).not.toContain('Error');
	});
});

describe('la fonction, hors de la commande', () => {
	it('elle ne jette jamais', () => {
		for (const entree of ['', '   ', '###', '2x+1<7', 'x=3', 'n’importe quoi', '(((']) {
			expect(() => factorSteps(entree), entree).not.toThrow();
		}
	});
});
