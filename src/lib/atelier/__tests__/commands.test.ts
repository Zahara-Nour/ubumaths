/**
 * Les commandes deviennent découvrables — §5, et Q3 tranchée le 2026-09-16.
 *
 * Aujourd'hui `/calc` propose 8 commandes écrites en dur sur 36 réelles, toutes
 * décrites en anglais sauf deux. Un élève ne peut pas savoir que `.variations`
 * existe.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import {
	commandCatalog,
	commandBeingWritten,
	resolveCommand,
	suggestFor,
	ATELIER_ONLY_COMMANDS,
	ENGINE_COMMANDS_LEFT_OUT,
	stageExampleSetup
} from '../commands';
import { Atelier } from '../atelier.svelte';
import { runInput } from '../calcul';
import { CalcDesk } from '../desk.svelte';

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
	// Seules les commandes laissées dehors EXPRÈS (`ENGINE_COMMANDS_LEFT_OUT`) y échappent.
	it('ne laisse aucune commande du registre sans traduction', () => {
		const engine = new WebReplEngine();

		const traduites = new Set(commandCatalog(engine).map((c) => c.name));
		const oubliees = engine
			.getCommands()
			.filter((c) => !traduites.has(c.name) && !ENGINE_COMMANDS_LEFT_OUT.has(c.name));

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
			if (command.example === undefined) continue;

			// ⚠️ **Une garde ne protège que ce qui passe par elle.** Les
			// commandes servies par l'atelier ne vont jamais au moteur : les
			// faire passer ici les accuserait à tort, et les SAUTER laisserait
			// leur exemple sans garde. On les juge donc sur LEUR chemin, celui
			// que l'élève emprunte — et une commande de l'atelier ajoutée
			// demain hérite de la garde sans que personne y pense.
			//
			// ⚠️ La barre est le LATEX, pas l'absence de refus : « .factoriser
			// 3x+6 » rend bien une ligne, mais cette ligne dit « je ne sais pas
			// factoriser ». Un exemple doit MONTRER ce que la commande fait.
			if (ATELIER_ONLY_COMMANDS.has(command.name)) {
				// Q79 : un exemple qui cite des listes se joue dans un atelier
				// qui les contient ; il doit alors CRÉER quelque chose (`.simuler`
				// range ses effectifs dans une liste) ou afficher une formule
				const atelier = new Atelier();
				stageExampleSetup(atelier, command.exampleSetup);
				const before = atelier.objects.length;
				const result = runInput({ atelier, engine: new WebReplEngine() }, command.example);
				const latex = result.kind === 'commande' ? result.latex : undefined;
				// « Crée un objet » ou « dessine un graphique » (simulations, Q80)
				// ne valent que pour un exemple à décor déclaré
				const staged = command.exampleSetup !== undefined;
				const created = staged && atelier.objects.length > before;
				const drawn = staged && result.kind === 'commande' && result.chart !== undefined;
				// `.filtrer` compte des individus : la réponse EST la ligne (Q90). Pour
				// elle seule, et sous sa forme de comptage (revue : « une ligne non
				// vide » valait pour toutes les commandes à décor)
				const answered =
					command.name === 'filter' &&
					result.kind === 'commande' &&
					/^\d+ individus? sur \d+ /.test(result.output);
				// `.tabuler` écrit dans la grille (tableur, lot 3) : la réponse est le tableau
				const tabulated = staged && command.name === 'tabulate' && atelier.cell(1, 1) !== '';
				expect(
					{
						commande: command.french,
						kind: result.kind,
						repond: latex !== undefined || created || drawn || answered || tabulated
					},
					`l'exemple de « .${command.french} » ne montre pas ce qu'elle fait`
				).toMatchObject({ kind: 'commande', repond: true });
				continue;
			}

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

			// ⚠️ « Réussit » ne suffit pas : `.stats 12 15 9` réussit en ne lisant
			// QUE « 12 » et en annonçant « n=1 ». Un exemple qui donne plusieurs
			// valeurs doit les compter toutes, sinon il enseigne une écriture
			// fausse — et le test le laisserait passer.
			if (command.name === 'stats') {
				const valeurs = command.example.slice(command.example.indexOf(' ')).split(/[;,]/).length;
				expect(result.output, `« .${command.french} » n'a pas lu toutes ses valeurs`).toContain(
					`Effectif : ${valeurs}`
				);
			}
		}
	});

	/**
	 * ⚠️ Q1 option B : **l'atelier détient les noms.** Une commande qui écrit
	 * dans l'`EvalState` fabrique un nom que le panneau ignore, et les deux
	 * divergent en silence — mesuré le 2026-09-16, puis le 2026-10-13 alors
	 * qu'elles étaient « indisponibles » (grisées, mais exécutées une fois
	 * tapées). Décision de David (2026-10-13) : elles n'existent pas ici.
	 * Le comportement tapé est vérifié dans `commandes-inexistantes.svelte.test.ts`.
	 */
	it('ne met au catalogue aucune commande qui écrirait dans le moteur', () => {
		const catalog = commandCatalog(new WebReplEngine());

		for (const name of ['let', 'def', 'unset', 'undef', 'clear', 'inv', "def'", 'auto']) {
			expect(
				catalog.find((c) => c.name === name),
				name
			).toBeUndefined();
		}
	});

	// Celles qui LISENT seulement restent au catalogue : elles ne mentent jamais.
	it('garde les commandes qui ne font que lire', () => {
		const catalog = commandCatalog(new WebReplEngine());

		for (const name of ['vars', 'fns', 'simplify', 'diff', 'solve', 'variations']) {
			expect(
				catalog.find((c) => c.name === name),
				name
			).toBeDefined();
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

/**
 * Le modèle affiché sous le champ une fois la commande choisie (phase 0
 * `docs/wip/atelier-cas-phase0.md`, PR 1, décision de David du 2026-10-11).
 */
describe('la commande en cours d’écriture', () => {
	const catalog = commandCatalog(new WebReplEngine());
	const written = (draft: string) => commandBeingWritten(catalog, draft)?.french ?? null;

	it('reconnaît la commande dès l’espace qui suit son nom', () => {
		expect(written('.taylor ')).toBe('taylor');
		expect(written('.taylor sin(x) ordre')).toBe('taylor');
	});

	it('reconnaît un nom sans accent ou un raccourci, sous son nom français', () => {
		expect(written('.deriver x^2')).toBe('dériver');
		expect(written('.diff x^2')).toBe('dériver');
	});

	it('ne reconnaît rien tant que le nom n’est pas suivi d’un espace', () => {
		expect(written('.taylor')).toBeNull();
	});

	it('ne reconnaît rien sans point, ni pour une commande inconnue', () => {
		expect(written('taylor sin(x)')).toBeNull();
		expect(written('.zz x')).toBeNull();
		expect(written('')).toBeNull();
	});

	// Le modèle est l'EXEMPLE : une commande d'élève sans exemple n'aurait que
	// sa description sous le champ, qui ne dit pas comment écrire la suite
	it('chaque commande d’élève disponible a un exemple', () => {
		const missing = catalog
			.filter((c) => c.section !== undefined)
			.filter((c) => c.example === undefined)
			.map((c) => c.french);

		expect(missing).toEqual([]);
	});
});

/**
 * Les commandes qui se lancent sans argument (décision de David, 2026-10-11) :
 * tapées en entier, une seule Entrée les lance — la liste ne les « choisit » pas.
 */
describe('les commandes qui se lancent seules', () => {
	const catalog = commandCatalog(new WebReplEngine());
	const alone = catalog.filter((c) => c.runsAlone === true);

	it('sont celles qu’on attend', () => {
		expect(alone.map((c) => c.french).sort()).toEqual(
			['aide', 'décimal', 'exact', 'exporter', 'fonctions', 'valeurs'].sort()
		);
	});

	// Sinon une seule Entrée enverrait une commande incomplète. Par le PUPITRE,
	// le chemin de l'élève : `.exporter` n'y passe pas par le moteur, il
	// télécharge l'historique (ou dit qu'il n'y a rien) sans écrire de ligne
	it('répondent vraiment, tapées seules', () => {
		for (const command of alone) {
			const desk = new CalcDesk(new Atelier());
			const downloads: string[] = [];
			desk.download = (_entries, format) => downloads.push(format);
			desk.submit('1+1');
			desk.submit(`.${command.french}`);
			const answer = desk.entries.length === 2 ? desk.entries[1] : null;
			expect({
				commande: command.french,
				answered: answer === null ? downloads.length === 1 : !answer.failed
			}).toEqual({ commande: command.french, answered: true });
		}
	});
});
