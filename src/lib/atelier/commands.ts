/**
 * Atelier — les commandes, en français et découvrables
 *
 * **Q3**, tranchée le 2026-09-16 : une couche de traduction **côté atelier**,
 * pas un renommage dans `mathAST`. Le registre est partagé avec le CLI
 * (`pnpm repl`), où l'anglais a sa place ; les alias français s'ajoutent, les
 * anglais continuent de marcher.
 *
 * Le défaut que ça répare est mesuré : `/calc` propose **8 commandes écrites en
 * dur** sur 34 réelles, et 24 des 26 descriptions du registre sont en anglais.
 * Un élève ne peut pas savoir que `.variations` existe.
 *
 * @module atelier/commands
 */

import type { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

// =============================================================================
// Types
// =============================================================================

/** Une commande telle que l'atelier la présente. */
export interface AtelierCommand {
	/** Le nom que comprend le moteur (`diff`). */
	readonly name: string;
	/** Ce que l'élève tape (`dériver`), sans le point. */
	readonly french: string;
	/** Les raccourcis proposés, sans doublon entre commandes. */
	readonly aliases: readonly string[];
	/** En français, et sans vocabulaire de développeur. */
	readonly description: string;
	/** À quoi ça ressemble une fois écrit. */
	readonly example?: string;
	/** Reléguée : tapable, mais pas proposée en premier (§5 L2). */
	readonly advanced?: boolean;
	/**
	 * Pourquoi cette commande ne peut rien produire ici, si elle ne le peut pas.
	 *
	 * Même principe qu'au §3 pour les actions : **visible et désactivée avec sa
	 * raison**, jamais cachée. Un élève qui ne la voit plus conclut que l'outil
	 * ne sait pas faire ; un élève qui lit la raison sait à quoi s'en tenir.
	 */
	readonly unavailable?: string;
}

// =============================================================================
// Constantes
// =============================================================================

/** Ce que l'atelier sait dire de chaque commande, dans l'ordre d'affichage. */
interface Translation {
	readonly french: string;
	readonly description: string;
	readonly example?: string;
	readonly advanced?: boolean;
	readonly unavailable?: string;
}

/**
 * L'ordre de cette table EST l'ordre du catalogue.
 *
 * Il va du geste le plus courant au plus rare, et les commandes de développeur
 * ferment la marche. Une liste alphabétique mettrait `.ast` en tête et
 * `.variations` en queue — l'inverse de ce dont un élève a besoin.
 */
const TRANSLATIONS: ReadonlyMap<string, Translation> = new Map([
	[
		'simplify',
		{
			french: 'simplifier',
			description: 'Simplifier une expression',
			example: '.simplifier (x^2-1)/(x+1)'
		}
	],
	['diff', { french: 'dériver', description: 'Dériver une expression', example: '.dériver x^2' }],
	[
		'solve',
		{ french: 'résoudre', description: 'Résoudre une équation', example: '.résoudre x^2-3x+1=0' }
	],
	[
		'variations',
		{
			french: 'variations',
			description: 'Étudier le sens de variation',
			example: '.variations x^2-3x+1'
		}
	],
	[
		'domain',
		{ french: 'domaine', description: 'Trouver le domaine de définition', example: '.domaine 1/x' }
	],
	[
		'integrate',
		{ french: 'intégrer', description: 'Calculer une intégrale', example: '.intégrer x^2' }
	],
	[
		'eval',
		{
			french: 'évaluer',
			description: 'Évaluer une expression en remplaçant les lettres',
			example: '.évaluer x^2 x=3'
		}
	],
	[
		'equiv',
		{
			french: 'équivalent',
			description: 'Vérifier si deux écritures sont égales',
			example: '.équivalent (x+1)^2 x^2+2x+1'
		}
	],
	// Réparée le 2026-09-16 : le dispatch parsait TOUT l'argument comme une
	// expression avant d'appeler la commande, donc `.taylor sin(x) 5 0` mourait
	// sur « Unexpected token: 5 » sans que la commande soit jamais appelée. Le
	// drapeau `requiresAst` existait déjà mais n'était pas dans le contrat
	// `Command` : les deux dispatches (web ET CLI) ne pouvaient pas le voir.
	[
		'taylor',
		{
			french: 'taylor',
			description: 'Développement limité au voisinage d’un point',
			example: '.taylor sin(x) 5 0'
		}
	],
	[
		'let',
		{
			french: 'poser',
			description: 'Poser une valeur',
			unavailable:
				'Dans l’atelier, les noms se créent dans le panneau : écris « a = 3 » ou « f(x) = x^2 » sans le point.'
		}
	],
	[
		'def',
		{
			french: 'définir',
			description: 'Définir une fonction',
			unavailable:
				'Dans l’atelier, les noms se créent dans le panneau : écris « a = 3 » ou « f(x) = x^2 » sans le point.'
		}
	],
	[
		'clear',
		{
			french: 'effacer',
			description: 'Effacer toutes les valeurs',
			unavailable:
				'Dans l’atelier, les noms se créent dans le panneau : écris « a = 3 » ou « f(x) = x^2 » sans le point.'
		}
	],
	[
		'unset',
		{
			french: 'oublier',
			description: 'Oublier une valeur',
			unavailable:
				'Dans l’atelier, les noms se créent dans le panneau : écris « a = 3 » ou « f(x) = x^2 » sans le point.'
		}
	],
	[
		'undef',
		{
			french: 'oublier-fonction',
			description: 'Oublier une fonction',
			unavailable:
				'Dans l’atelier, les noms se créent dans le panneau : écris « a = 3 » ou « f(x) = x^2 » sans le point.'
		}
	],
	['vars', { french: 'valeurs', description: 'Lister les valeurs connues du moteur' }],
	['fns', { french: 'fonctions', description: 'Lister les fonctions connues du moteur' }],
	[
		'inv',
		{
			french: 'réciproque',
			description: 'Afficher ou donner la réciproque d’une fonction',
			unavailable:
				'Dans l’atelier, les noms se créent dans le panneau : écris « a = 3 » ou « f(x) = x^2 » sans le point.'
		}
	],
	[
		"def'",
		{
			french: 'dérivée-de',
			description: 'Donner soi-même la dérivée d’une fonction',
			unavailable:
				'Dans l’atelier, les noms se créent dans le panneau : écris « a = 3 » ou « f(x) = x^2 » sans le point.'
		}
	],
	[
		'mode',
		{
			french: 'mode',
			description: 'Choisir entre valeurs exactes et décimales',
			example: '.mode exact'
		}
	],
	['help', { french: 'aide', description: 'Afficher les commandes disponibles' }],
	// Avancées : elles restent tapables, mais ne s'affichent pas en premier.
	[
		'normal',
		{ french: 'forme-normale', description: 'Afficher la forme normale détaillée', advanced: true }
	],
	['latex', { french: 'latex', description: 'Écrire la réponse en LaTeX', advanced: true }],
	[
		'custom',
		{ french: 'texte', description: 'Écrire la réponse en syntaxe texte', advanced: true }
	],
	[
		'parse',
		{ french: 'analyser', description: 'Montrer comment la saisie a été comprise', advanced: true }
	],
	['tree', { french: 'arbre', description: 'Montrer l’arbre de la saisie', advanced: true }],
	[
		'hash',
		{ french: 'empreinte', description: 'Calculer l’empreinte d’une expression', advanced: true }
	]
]);

/**
 * Les commandes branchées en dur dans le moteur, absentes du registre.
 *
 * ⚠️ `getCommands()` ne les connaît pas : sans cette table, `.convertir` et
 * `.stats` resteraient invisibles alors qu'elles marchent.
 */
const OFF_REGISTRY: ReadonlyMap<string, Translation> = new Map([
	[
		'convert',
		{ french: 'convertir', description: 'Convertir dans une autre unité', example: '.convertir km' }
	],
	[
		'stats',
		{
			french: 'stats',
			description: 'Statistiques d’une série de nombres',
			example: '.stats 12 15 9'
		}
	],
	[
		'linreg',
		{
			french: 'ajustement',
			description: 'Ajustement affine de deux séries',
			example: '.ajustement 1,2,3 : 2,4,6'
		}
	],
	['exact', { french: 'exact', description: 'Passer aux valeurs exactes' }],
	['decimal', { french: 'décimal', description: 'Passer aux valeurs décimales' }],
	['auto', { french: 'auto', description: 'Laisser l’atelier deviner la syntaxe', advanced: true }],
	[
		'unitmode',
		{
			french: 'mode-unités',
			description: 'Choisir comment les unités se combinent',
			advanced: true
		}
	],
	['export', { french: 'exporter', description: 'Exporter la session', advanced: true }]
]);

/**
 * Les accents retirés, pour accepter `.deriver` comme `.dériver`.
 *
 * ⚠️ La plage est écrite en échappements (`\u0300-\u036f`) et non en caractères
 * combinants littéraux : ceux-ci sont invisibles à la relecture, et une
 * normalisation NFC du fichier les effacerait en silence — tous les alias sans
 * accent cesseraient de marcher sans qu'aucune ligne n'ait l'air modifiée.
 */
export function plain(text: string): string {
	return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les commandes à proposer, dans l'ordre d'affichage.
 *
 * ⚠️ La liste vient du **registre réel** : une commande ajoutée au moteur
 * apparaît sans qu'on touche à l'interface (§5 E1). C'est précisément ce que la
 * liste en dur de `UnifiedInput.svelte` interdit aujourd'hui.
 *
 * ⚠️ Un alias n'est donné qu'une fois. Mesuré le 2026-09-16 : `.help` et
 * `.hash` déclarent tous deux `h`. L'ordre de `TRANSLATIONS` tranche — `aide`
 * est utile à un élève, `empreinte` ne l'est pas.
 */
export function commandCatalog(engine: WebReplEngine): AtelierCommand[] {
	const fromRegistry = new Map(engine.getCommands().map((c) => [c.name, c]));
	const taken = new Set<string>();
	const catalog: AtelierCommand[] = [];

	const add = (name: string, t: Translation, sourceAliases: readonly string[]) => {
		// Le nom français et le nom moteur sont les deux entrées sûres ; les
		// raccourcis du registre ne s'ajoutent que s'ils sont encore libres.
		const aliases: string[] = [];
		for (const alias of [t.french, plain(t.french), name, ...sourceAliases]) {
			if (alias === '' || taken.has(alias)) continue;
			taken.add(alias);
			aliases.push(alias);
		}
		catalog.push({
			name,
			french: t.french,
			aliases,
			description: t.description,
			...(t.example && { example: t.example }),
			...(t.advanced && { advanced: true }),
			...(t.unavailable && { unavailable: t.unavailable })
		});
	};

	// L'ordre de TRANSLATIONS d'abord, pour que le conflit d'alias se tranche en
	// faveur de ce qui sert à un élève.
	for (const [name, translation] of TRANSLATIONS) {
		const registry = fromRegistry.get(name);
		// Une commande traduite mais absente du registre ne s'invente pas : le
		// moteur ne saurait pas l'exécuter.
		if (!registry && !OFF_REGISTRY.has(name)) continue;
		add(name, translation, registry?.aliases ?? []);
	}
	for (const [name, translation] of OFF_REGISTRY) {
		if (TRANSLATIONS.has(name)) continue;
		add(name, translation, []);
	}

	// Les avancées ferment la marche, sans jamais disparaître (§5 L2).
	return [
		...catalog.filter((c) => c.advanced !== true),
		...catalog.filter((c) => c.advanced === true)
	];
}

/** Le nom moteur d'une commande écrite en français, s'il y en a un. */
function engineNameOf(typed: string): string | null {
	const wanted = plain(typed).toLowerCase();
	for (const [name, t] of [...TRANSLATIONS, ...OFF_REGISTRY]) {
		if (plain(t.french).toLowerCase() === wanted) return name;
	}
	return null;
}

/**
 * Réécrire une saisie française vers ce que comprend le moteur.
 *
 * Ce qui n'est pas une commande, ou dont le nom n'est pas traduit, ressort
 * **inchangé** : le moteur dira lui-même qu'il ne connaît pas, et `suggestFor`
 * proposera les plus proches.
 */
export function resolveCommand(input: string): string {
	if (!input.startsWith('.')) return input;

	const space = input.indexOf(' ');
	const typed = (space === -1 ? input.slice(1) : input.slice(1, space)).trim();
	const rest = space === -1 ? '' : input.slice(space);

	const name = engineNameOf(typed);
	return name === null ? input : `.${name}${rest}`;
}

/** Distance d'édition — assez pour rattraper une faute de frappe, pas plus. */
function distance(a: string, b: string): number {
	const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
	for (let j = 0; j <= b.length; j++) rows[0][j] = j;
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
		}
	}
	return rows[a.length][b.length];
}

/** Au-delà, ce n'est plus une faute de frappe mais une autre intention. */
const MAX_DISTANCE = 2;

/**
 * Les commandes les plus proches de ce qui a été tapé.
 *
 * ⚠️ **Deux au plus.** Une liste de dix suggestions n'aide personne — elle
 * demande à l'élève de choisir alors qu'il cherchait déjà.
 *
 * Rend toujours le nom **français** : proposer « simplify » à qui a tapé
 * « simplfy » ferait apprendre le mauvais mot.
 */
export function suggestFor(engine: WebReplEngine, typed: string): string[] {
	const wanted = plain(typed).toLowerCase();

	const scored = commandCatalog(engine)
		.map((command) => {
			// La meilleure des graphies : le français, le nom moteur, les raccourcis
			const best = Math.min(
				...[command.french, command.name, ...command.aliases].map((form) =>
					distance(plain(form).toLowerCase(), wanted)
				)
			);
			return { french: command.french, best };
		})
		.filter((c) => c.best <= MAX_DISTANCE)
		.sort((a, b) => a.best - b.best);

	return scored.slice(0, 2).map((c) => c.french);
}
