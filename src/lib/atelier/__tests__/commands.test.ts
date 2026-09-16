/**
 * Les commandes deviennent découvrables — §5, et Q3 tranchée le 2026-09-16.
 *
 * Aujourd'hui `/calc` propose 8 commandes écrites en dur sur 36 réelles, toutes
 * décrites en anglais sauf deux. Un élève ne peut pas savoir que `.variations`
 * existe.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { commandCatalog, resolveCommand, suggestFor } from '../commands';

describe('le catalogue des commandes', () => {
	it('vient du registre, pas d’une liste écrite en dur', () => {
		const engine = new WebReplEngine();

		const catalog = commandCatalog(engine);

		// Le défaut d'aujourd'hui : 8 commandes en dur dans UnifiedInput.svelte
		expect(catalog.length).toBeGreaterThan(8);
		expect(catalog.map((c) => c.name)).toContain('variations');
	});

	it('décrit chaque commande en français', () => {
		const engine = new WebReplEngine();

		for (const command of commandCatalog(engine)) {
			// Les verbes anglais du registre : « Differentiate », « Compute the
			// domain of definition »… (24 des 26 descriptions, mesuré le 2026-09-16)
			expect(command.description).not.toMatch(
				/\b(Compute|Display|Evaluate|Solve|Define|Remove|List|Check|Output|Parse|Set|Clear|Integrate|Differentiate|Simplify|the|of|all|and)\b/
			);
			expect(command.description.trim()).not.toBe('');
		}
	});

	it('porte un exemple, pour montrer à quoi ça ressemble', () => {
		const engine = new WebReplEngine();

		const derive = commandCatalog(engine).find((c) => c.name === 'diff');

		expect(derive?.example).toBeTruthy();
	});

	// §5 L2 : elles restent tapables, mais ne s'affichent pas en premier
	it('relègue les commandes de développeur', () => {
		const engine = new WebReplEngine();

		const catalog = commandCatalog(engine);
		const rank = (name: string) => catalog.findIndex((c) => c.name === name);

		expect(catalog.find((c) => c.name === 'hash')?.advanced).toBe(true);
		expect(catalog.find((c) => c.name === 'variations')?.advanced).not.toBe(true);

		// ⚠️ Le cas qui mord : `convert` est branché en dur, donc ajouté APRÈS les
		// commandes du registre — `hash` comprise. Sans la relégation finale,
		// « convertir », qui sert au collège, s'afficherait après « empreinte ».
		expect(rank('convert')).toBeLessThan(rank('hash'));

		// L'invariant, énoncé une fois pour toutes plutôt que paire par paire
		const firstAdvanced = catalog.findIndex((c) => c.advanced === true);
		const lastPlain = catalog.map((c) => c.advanced === true).lastIndexOf(false);
		expect(firstAdvanced).toBeGreaterThan(lastPlain);
	});

	// ⚠️ Mesuré le 2026-09-16 : `.help` et `.hash` déclarent tous deux l'alias
	// `h`. Invisible aujourd'hui puisque aucune des deux n'est proposée.
	it('ne rend jamais deux commandes pour un même alias', () => {
		const engine = new WebReplEngine();

		const seen = new Map<string, string>();
		for (const command of commandCatalog(engine)) {
			for (const alias of command.aliases) {
				expect(seen.has(alias)).toBe(false);
				seen.set(alias, command.name);
			}
		}
	});

	// L'invariant qui compte : une commande ajoutée au moteur ne doit pas rester
	// en anglais dans l'atelier. Sans ce test, elle passerait inaperçue.
	it('ne laisse aucune commande du registre sans traduction', () => {
		const engine = new WebReplEngine();

		const traduites = new Set(commandCatalog(engine).map((c) => c.name));
		const oubliees = engine.getCommands().filter((c) => !traduites.has(c.name));

		expect(oubliees.map((c) => c.name)).toEqual([]);
	});

	/**
	 * ⚠️ Un exemple qui ne marche pas est pire que pas d'exemple : l'élève
	 * conclut que c'est lui qui se trompe.
	 *
	 * Mesuré le 2026-09-16 : mon premier exemple pour `.évaluer` était
	 * `.évaluer x^2 x=3`, que le moteur accepte en rendant « Result: false ».
	 * Un succès apparent, un résultat absurde — invisible sans ce test.
	 */
	it('ne propose que des exemples qui s’exécutent vraiment', () => {
		for (const command of commandCatalog(new WebReplEngine())) {
			if (command.example === undefined || command.unavailable !== undefined) continue;
			// Un moteur neuf par exemple : aucun ne doit dépendre d'un autre.
			// Le décor passe par `resolveCommand` comme le ferait la vue — sans
			// quoi c'est le DÉCOR qui échoue, et l'exemple est accusé à tort.
			const engine = new WebReplEngine();
			engine.execute(resolveCommand('.poser a = 3'));
			engine.execute(resolveCommand('.définir f(x) = x^2'));
			// `.convertir` agit sur le DERNIER résultat : sans grandeur calculée
			// avant, elle n'a rien à convertir. Le décor ressemble donc à un
			// atelier où l'élève a déjà travaillé, pas à un moteur vierge.
			engine.execute('1200[m]');
			const result = engine.execute(resolveCommand(command.example));
			expect(
				{ commande: command.french, sortie: result.output.slice(0, 80), ok: result.success },
				`l'exemple de « .${command.french} » n'aboutit pas`
			).toMatchObject({ ok: true });
		}
	});

	// Une commande indisponible doit dire pourquoi, et ne pas porter d'exemple
	// qui laisserait croire qu'elle marche.
	it('donne une raison à toute commande indisponible', () => {
		for (const command of commandCatalog(new WebReplEngine())) {
			if (command.unavailable === undefined) continue;
			expect(command.unavailable.trim()).not.toBe('');
			expect(command.example).toBeUndefined();
		}
	});

	/**
	 * ⚠️ Q1 option B : **l'atelier détient les noms.** Une commande qui écrit
	 * dans l'`EvalState` fabrique un nom que le panneau ignore, et les deux
	 * divergent en silence — mesuré le 2026-09-16, dans les deux sens :
	 *
	 * - `.effacer` vide les liaisons du moteur ; le panneau affiche toujours
	 *   `a = 3`, mais `a + 1` rend « a+1 » avec `success: true` ;
	 * - `.poser b = 5` marche, puis la première modification d'un objet du
	 *   panneau détruit `b` sans un mot — `syncEngine` repose tout.
	 */
	it('rend indisponible toute commande qui écrirait dans le moteur', () => {
		const catalog = commandCatalog(new WebReplEngine());

		for (const name of ['let', 'def', 'unset', 'undef', 'clear', 'inv', "def'"]) {
			const command = catalog.find((c) => c.name === name);
			expect(command, name).toBeDefined();
			expect(command?.unavailable, name).toBeTruthy();
		}
	});

	// Celles qui LISENT seulement restent utilisables : elles ne mentent jamais.
	it('laisse utilisables les commandes qui ne font que lire', () => {
		const catalog = commandCatalog(new WebReplEngine());

		for (const name of ['vars', 'fns', 'simplify', 'diff', 'solve', 'variations']) {
			expect(catalog.find((c) => c.name === name)?.unavailable, name).toBeUndefined();
		}
	});

	it('est stable d’un appel à l’autre', () => {
		const engine = new WebReplEngine();

		const a = commandCatalog(engine).map((c) => c.name);
		const b = commandCatalog(engine).map((c) => c.name);

		expect(a).toEqual(b);
	});
});

describe('les alias français', () => {
	it('traduit « .dériver » vers la commande du moteur', () => {
		expect(resolveCommand('.dériver x^2')).toBe('.diff x^2');
	});

	it('accepte la graphie sans accent', () => {
		expect(resolveCommand('.deriver x^2')).toBe('.diff x^2');
	});

	it('traduit « .résoudre »', () => {
		expect(resolveCommand('.résoudre x^2=1')).toBe('.solve x^2=1');
	});

	// Q3 : les anglaises continuent de marcher, le CLI ne bouge pas
	it('laisse passer les commandes anglaises', () => {
		expect(resolveCommand('.diff x^2')).toBe('.diff x^2');
	});

	it('laisse passer ce qui n’est pas une commande', () => {
		expect(resolveCommand('2 + 3')).toBe('2 + 3');
	});

	it('n’invente rien pour une commande inconnue', () => {
		expect(resolveCommand('.dériiver x^2')).toBe('.dériiver x^2');
	});
});

describe('quand la commande n’existe pas', () => {
	// §2 E2 : nommer les deux plus proches, pas « unknown command »
	it('propose les commandes les plus proches', () => {
		const engine = new WebReplEngine();

		const suggestions = suggestFor(engine, 'dériiver');

		expect(suggestions).toContain('dériver');
	});

	it('propose aussi sur une faute en anglais', () => {
		const engine = new WebReplEngine();

		expect(suggestFor(engine, 'simplfy')).toContain('simplifier');
	});

	it('ne propose rien quand rien n’est proche', () => {
		const engine = new WebReplEngine();

		expect(suggestFor(engine, 'xyzzy')).toEqual([]);
	});

	it('en propose deux au plus — une liste longue n’aide personne', () => {
		const engine = new WebReplEngine();

		expect(suggestFor(engine, 'd').length).toBeLessThanOrEqual(2);
	});
});
