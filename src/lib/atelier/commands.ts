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
import type { Atelier } from './atelier.svelte';

// =============================================================================
// Types
// =============================================================================

/**
 * La rubrique de `.aide` où l'élève trouve la commande.
 *
 * Absente = commande de développeur : listée par `.aide dev` seulement
 * (décision de David, 2026-10-09).
 */
export type HelpSection = 'calculer' | 'analyser' | 'statistiques' | 'probabilites' | 'reglages';

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
	 * Les listes que cite l'exemple (`.simuler L M 100`) : il se joue dans un
	 * atelier qui les contient, sur le chemin réel de l'élève (Q79). Un décor
	 * VIDE (`.binomiale`) déclare une commande qui montre un tableau ou un
	 * graphique sans citer de liste.
	 */
	readonly exampleSetup?: Readonly<Record<string, string>>;
	/** La rubrique de `.aide` ; absente = commande de développeur. */
	readonly section?: HelpSection;
	/**
	 * Se lance sans argument (`.aide`, `.exact`) : tapée en entier, une seule
	 * Entrée la lance au lieu de la choisir dans la liste (décision de David,
	 * 2026-10-11). ⚠️ « Sans exemple » ne suffit pas à le dire : `.arbre` n'a
	 * pas d'exemple et attend une expression.
	 */
	readonly runsAlone?: boolean;
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
	readonly exampleSetup?: Readonly<Record<string, string>>;
	readonly section?: HelpSection;
	readonly runsAlone?: boolean;
}

/**
 * L'ordre de cette table EST l'ordre du catalogue.
 *
 * Il va du geste le plus courant au plus rare, et les commandes de développeur
 * ferment la marche. Une liste alphabétique mettrait `.ast` en tête et
 * `.variations` en queue — l'inverse de ce dont un élève a besoin.
 */
const TRANSLATIONS: ReadonlyMap<string, Translation> = new Map<string, Translation>([
	[
		'simplify',
		{
			french: 'simplifier',
			section: 'calculer',
			description: 'Simplifier une expression',
			example: '.simplifier (x^2-1)/(x+1)'
		}
	],
	[
		'factor',
		{
			french: 'factoriser',
			section: 'calculer',
			description: 'Factoriser une expression',
			example: '.factoriser x^2-4'
		}
	],
	[
		// Servie par l'atelier (`expand.ts`) : le registre n'a pas d'`expand`
		'expand',
		{
			french: 'développer',
			section: 'calculer',
			description: 'Développer et réduire une expression',
			example: '.développer (2x-1)(x+3)'
		}
	],
	[
		'diff',
		{
			french: 'dériver',
			section: 'analyser',
			description: 'Dériver une expression (pour t : une autre variable)',
			example: '.dériver x^2'
		}
	],
	[
		'simulate',
		{
			french: 'simuler',
			section: 'probabilites',
			description: 'Simuler n tirages d’une loi : valeurs, probabilités, n',
			example: '.simuler L M 100',
			// L'exemple cite deux listes : il se joue dans cet atelier (Q79)
			exampleSetup: { L: '1 ; 2 ; 3 ; 4 ; 5 ; 6', M: '1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6' }
		}
	],
	[
		'binomial',
		{
			french: 'binomiale',
			section: 'probabilites',
			description: 'Loi binomiale B(n ; p) : tableau, E, V, σ, probabilités, intervalle, seuil',
			example: '.binomiale X 10 0,3',
			// Aucune liste à citer : un décor VIDE, déclaré pour que le tableau
			// dessiné compte comme ce que montre l'exemple (Q79, Q80)
			exampleSetup: {}
		}
	],
	[
		'geometric',
		{
			french: 'géométrique',
			section: 'probabilites',
			description: 'Loi géométrique G(p) : tableau, E, V, σ, diagramme, probabilités',
			example: '.geometrique X 0,2 P(X ⩽ 3)',
			// Aucune liste à citer : un décor VIDE (Q79, Q80), comme `.binomiale`
			exampleSetup: {}
		}
	],
	[
		'uniform',
		{
			french: 'uniforme',
			section: 'probabilites',
			description: 'Loi uniforme sur {a, …, b} ou à densité sur [a ; b] : E, V, σ, diagramme',
			example: '.uniforme X 1 6',
			// Aucune liste à citer : un décor VIDE (Q79, Q80), comme `.binomiale`
			exampleSetup: {}
		}
	],
	[
		'exponential',
		{
			french: 'exponentielle',
			section: 'probabilites',
			description: 'Loi exponentielle E(λ) : courbe, E, V, σ, F(x), probabilités',
			example: '.exponentielle T 0,5 P(T ⩽ 2)',
			// Aucune liste à citer : un décor VIDE (Q79, Q80), comme `.binomiale`
			exampleSetup: {}
		}
	],
	[
		// Loi normale (2026-10-09) : le nom `normal` est pris par la forme normale du moteur
		'gaussian',
		{
			french: 'normale',
			description: 'Loi normale N(μ ; σ²), avec μ et σ : courbe, E, V, σ, probabilités',
			example: '.normale Y 0 1 P(-1,96 ⩽ Y ⩽ 1,96)',
			exampleSetup: {},
			section: 'probabilites'
		}
	],
	[
		'compare',
		{
			french: 'comparer',
			section: 'statistiques',
			description: 'Comparer deux séries de nombres : un tableau d’indicateurs',
			example: '.comparer L M',
			exampleSetup: { L: '12 ; 15 ; 9 ; 14', M: '8 ; 17 ; 11 ; 13 ; 16' }
		}
	],
	[
		'cross',
		{
			french: 'croiser',
			section: 'statistiques',
			description: 'Tableau croisé de deux listes de mots, une entrée par individu',
			example: '.croiser L M',
			exampleSetup: { L: 'fille ; garçon ; fille', M: 'oui ; oui ; non' }
		}
	],
	[
		'filter',
		{
			french: 'filtrer',
			section: 'statistiques',
			description: 'Compter (ou garder) les individus qui vérifient un critère : et, ou, non',
			example: '.filtrer L = fille et M = oui',
			exampleSetup: { L: 'fille ; garçon ; fille', M: 'oui ; oui ; non' }
		}
	],
	[
		'frequency',
		{
			french: 'fréquence',
			section: 'probabilites',
			description: 'Moyenne des tirages selon leur nombre : la loi des grands nombres',
			example: '.fréquence L M 1000',
			exampleSetup: { L: '1 ; 0', M: '1/2 ; 1/2' }
		}
	],
	[
		'samples',
		{
			french: 'échantillons',
			section: 'probabilites',
			description: 'N échantillons de taille n, et l’écart de leur moyenne à μ',
			example: '.échantillons L M 50 100',
			exampleSetup: { L: '1 ; 2 ; 3 ; 4 ; 5 ; 6', M: '1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6' }
		}
	],
	[
		'solve',
		{
			french: 'résoudre',
			section: 'analyser',
			description: 'Résoudre une équation',
			example: '.résoudre x^2-3x+1=0'
		}
	],
	[
		'variations',
		{
			french: 'variations',
			section: 'analyser',
			description: 'Étudier le sens de variation',
			example: '.variations x^2-3x+1'
		}
	],
	[
		'tabulate',
		{
			french: 'tabuler',
			section: 'analyser',
			description: 'Écrire le tableau de valeurs d’une fonction dans la grille (de … à … pas …)',
			example: '.tabuler f de -2 à 3 pas 0,5',
			// L'exemple cite une fonction : il se joue dans cet atelier (Q79)
			exampleSetup: { 'f(x)': 'x^2-3x' }
		}
	],
	[
		'reciprocal',
		{
			french: 'réciproque',
			section: 'analyser',
			description: 'Calculer la réciproque d’une fonction (sur un intervalle : sur …)',
			example: '.réciproque x^2 sur [0;+∞['
		}
	],
	[
		'domain',
		{
			french: 'domaine',
			section: 'analyser',
			description: 'Trouver le domaine de définition',
			example: '.domaine 1/x'
		}
	],
	[
		'limit',
		{
			french: 'limite',
			section: 'analyser',
			description: 'Calculer une limite (en un point, à droite ou à gauche, en +∞)',
			example: '.limite (x^2-1)/(x-1) en 1'
		}
	],
	[
		'integrate',
		{
			french: 'intégrer',
			section: 'analyser',
			description: 'Calculer une intégrale (bornes : de … à …)',
			example: '.intégrer x^2 de 0 à 1'
		}
	],
	[
		'eval',
		{
			french: 'évaluer',
			section: 'calculer',
			description: 'Évaluer une expression en remplaçant ses lettres (en x=… ; y=…)',
			example: '.évaluer x^2 en x=3'
		}
	],
	[
		'equiv',
		{
			french: 'équivalent',
			section: 'calculer',
			description: 'Vérifier si deux écritures sont égales',
			example: '.équivalent (x+1)^2 et x^2+2x+1'
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
			section: 'analyser',
			description: 'Développement limité : ordre n, en un point (0 par défaut)',
			example: '.taylor sin(x) ordre 5 en 0'
		}
	],
	[
		'vars',
		{
			french: 'valeurs',
			section: 'reglages',
			description: 'Lister tes valeurs, comme « Mes objets »',
			example: '.valeurs',
			runsAlone: true
		}
	],
	[
		'fns',
		{
			french: 'fonctions',
			section: 'reglages',
			description: 'Lister tes fonctions (f′ et f⁻¹ comprises), comme « Mes objets »',
			example: '.fonctions',
			runsAlone: true
		}
	],
	[
		'mode',
		{
			french: 'mode',
			section: 'reglages',
			description: 'Choisir entre valeurs exactes et décimales',
			example: '.mode exact'
		}
	],
	['help', { french: 'aide', description: 'Afficher les commandes disponibles', runsAlone: true }],
	// Avancées : elles restent tapables, mais ne s'affichent pas en premier.
	[
		'normal',
		{ french: 'forme-normale', description: 'Afficher la forme normale détaillée', advanced: true }
	],
	['latex', { french: 'latex', description: 'Écrire une expression en LaTeX', advanced: true }],
	[
		'custom',
		{ french: 'texte', description: 'Écrire une expression en syntaxe texte', advanced: true }
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
 * Les commandes du registre qui n'existent PAS dans l'atelier (décision de
 * David, 2026-10-13 : « elles ne sont pas censées exister »).
 *
 * Elles écrivent dans l'`EvalState` du moteur, alors que **l'atelier détient
 * les noms** (Q1 option B) : le panneau fait la même chose (`a = 3`,
 * `f(x) = x^2`, supprimer une carte). Hors du catalogue, tapées en entier,
 * elles répondent comme toute commande inconnue — sans refus particulier.
 *
 * ⚠️ Elles étaient d'abord « indisponibles » : grisées dans la liste, mais
 * exécutées quand on les tapait. Mesuré le 2026-10-13 : `.effacer` vidait le
 * moteur (`a + 1` rendait « a+1 » avec `a = 3` au panneau), `.définir` créait
 * une fonction invisible. Ne pas les remettre au catalogue sous une autre forme.
 *
 * `inv` : la réciproque donnée à la main, jamais vérifiée. La vraie
 * réciproque, calculée, est `.réciproque` (`reciprocal`, servie par l'atelier).
 */
export const ENGINE_COMMANDS_LEFT_OUT: ReadonlySet<string> = new Set([
	'let',
	'def',
	'clear',
	'unset',
	'undef',
	'inv',
	"def'"
]);

/**
 * Les commandes que l'ATELIER sert lui-même — le moteur ne les connaît pas.
 *
 * ⚠️ Troisième catégorie, à ne pas confondre avec `OFF_REGISTRY` : celles-ci
 * ne sont pas « absentes du registre mais branchées dans le moteur », elles
 * n'existent **nulle part** dans le moteur. Les envoyer à `engine.execute`
 * rendrait « Unknown command », en anglais. `runCommand` doit donc sortir
 * AVANT d'appeler le moteur — c'est à ça que sert cette liste.
 *
 * `factoriser` est la première : le registre n'a ni `factor` ni `expand`, et
 * l'intention `factoriser` de `pedagogical-simplify` n'était donc atteignable
 * depuis aucune interface.
 */
/**
 * Poser dans un atelier le décor d'un exemple (Q79) : `L` → une liste, `f(x)`
 * → une fonction (`.tabuler f`, lot 3 du tableur).
 */
export function stageExampleSetup(
	atelier: Atelier,
	setup: Readonly<Record<string, string>> | undefined
): void {
	for (const [key, definition] of Object.entries(setup ?? {})) {
		const call = /^([A-Za-z])\(x\)$/.exec(key);
		if (call === null) atelier.create({ kind: 'list', name: key, definition });
		else atelier.create({ kind: 'function', name: call[1], definition });
	}
}

export const ATELIER_ONLY_COMMANDS: ReadonlySet<string> = new Set([
	'factor',
	// `.développer` : l'intention `developper`, la réponse seule (`expand.ts`)
	'expand',
	// `.réciproque` : calculée, vérifiée (`reciprocal.ts`) — rien à voir avec
	// `inv` du moteur, laissée de côté (`ENGINE_COMMANDS_LEFT_OUT`)
	'reciprocal',
	// `.tabuler` : le tableau de valeurs, écrit dans la grille (tableur, lot 3)
	'tabulate',
	// `.limite` : `evaluateLimit` (`mathAST/limits`), la réponse en formule (`limit.ts`)
	'limit',
	'simulate',
	'frequency',
	'samples',
	'cross',
	'filter',
	'compare',
	'binomial',
	'geometric',
	'uniform',
	'exponential',
	'gaussian'
]);

/**
 * Les commandes branchées en dur dans le moteur, absentes du registre.
 *
 * ⚠️ `getCommands()` ne les connaît pas : sans cette table, `.convertir` et
 * `.stats` resteraient invisibles alors qu'elles marchent.
 *
 * Exception : `export` (`.exporter`) n'est plus exécutée par le moteur
 * (allègement, 2026-10-13) ; le pupitre la sert lui-même (`isExportCommand`).
 */
const OFF_REGISTRY: ReadonlyMap<string, Translation> = new Map([
	[
		'convert',
		{
			french: 'convertir',
			section: 'reglages',
			description: 'Convertir le dernier résultat dans une autre unité',
			example: '.convertir km'
		}
	],
	[
		'stats',
		{
			french: 'stats',
			section: 'statistiques',
			description: 'Statistiques d’une série de nombres',
			// ⚠️ Un séparateur est obligatoire : mesuré le 2026-09-16,
			// « .stats 12 15 9 » réussit en ne lisant que « 12 » et annonce un
			// effectif de 1. Un succès apparent, une statistique fausse. Le « ; »
			// des listes de l'atelier, avec la virgule décimale (outils
			// statistiques, lot 5).
			example: '.stats 12 ; 15 ; 9'
		}
	],
	[
		'linreg',
		{
			french: 'ajustement',
			section: 'statistiques',
			// PR c (Q173-Q177) : mêmes calculs et mêmes textes que le bloc ```nuage
			description:
				'Ajustement affine de deux séries : droite, point moyen G, r ; prévisions après « en » (x = 10, y = 7), changement de variable après « ; » (z = ln(y), t = x²…)',
			example: '.ajustement 1 ; 2 ; 3 ; 4 ; 5 ; 6 : 12 ; 15 ; 19 ; 22 ; 27 ; 30 en x = 8'
		}
	],
	['exact', { french: 'exact', description: 'Passer aux valeurs exactes', runsAlone: true }],
	['decimal', { french: 'décimal', description: 'Passer aux valeurs décimales', runsAlone: true }],
	[
		'export',
		{
			french: 'exporter',
			description: 'Télécharger l’historique en JSON, pour le rejouer',
			advanced: true,
			runsAlone: true
		}
	]
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
			...(t.exampleSetup && { exampleSetup: t.exampleSetup }),
			...(t.section && { section: t.section }),
			...(t.runsAlone && { runsAlone: true })
		});
	};

	// L'ordre de TRANSLATIONS d'abord, pour que le conflit d'alias se tranche en
	// faveur de ce qui sert à un élève.
	for (const [name, translation] of TRANSLATIONS) {
		const registry = fromRegistry.get(name);
		// Une commande traduite mais absente du registre ne s'invente pas : le
		// moteur ne saurait pas l'exécuter — sauf si c'est l'atelier qui la sert.
		if (!registry && !OFF_REGISTRY.has(name) && !ATELIER_ONLY_COMMANDS.has(name)) continue;
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

/**
 * La commande dont l'élève écrit la suite : `.taylor sin(x)` → `.taylor`.
 *
 * Reconnue dès l'espace qui suit son nom, sous toutes ses graphies (français,
 * sans accent, nom moteur, raccourci) : c'est elle dont la vue montre le
 * modèle sous le champ (phase 0 `atelier-cas-phase0.md`, PR 1). Avant
 * l'espace, l'élève choisit encore dans la liste.
 */
export function commandBeingWritten(
	catalog: readonly AtelierCommand[],
	draft: string
): AtelierCommand | null {
	const match = /^\.(\S+)\s/.exec(draft);
	if (match === null) return null;
	const typed = plain(match[1]).toLowerCase();
	return (
		catalog.find((c) =>
			[c.french, c.name, ...c.aliases].some((form) => plain(form).toLowerCase() === typed)
		) ?? null
	);
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
