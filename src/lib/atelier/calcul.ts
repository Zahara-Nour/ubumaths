/**
 * Atelier — la saisie de la vue Calcul
 *
 * Un seul champ, comme dans `/cas` : ce que l'élève tape est une **définition**
 * (elle crée ou met à jour un objet), un **calcul** (il produit une ligne
 * d'historique), ou une **commande** (elle commence par un point).
 *
 * Spécification : `docs/wip/atelier-vue-calcul-phase0.md` §2 et §4.
 *
 * @module atelier/calcul
 */

import type { Atelier, Created, Refused } from './atelier.svelte';
import type { AtelierObject, ObjectKind } from './types';
import type { MathNode } from '$lib/mathAST/types';
import type { Provenance } from './parse';
import type { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { validateName, nameRejectionMessage, nextName, derivativeOf, displayName } from './names';
import { astOf, readNumber, withPiCommand, mixedNotationMessage } from './parse';
import {
	INTERNAL_LETTER,
	internalDefinition,
	letterRejection,
	renameVariable,
	typedLetterOf
} from './letter';
import { syncEngine, expressionOf, expandInput, expandCommandArgument, termsOf } from './engine';
import { MAX_SEQUENCE_TERMS } from '$lib/grapheur/sequence';
import { toCustom } from '$lib/mathAST/custom-generator';
import { resolveCommand, suggestFor, commandCatalog, ATELIER_ONLY_COMMANDS } from './commands';
import { renderResult } from './render';
import { frequencyCommand, samplesCommand, simulateCommand } from './simulate';
import { crossCommand } from './cross';
import { compareCommand } from './compare';
import { binomialCommand } from './binomial';
import { exponentialCommand, geometricCommand, uniformCommand } from './law-commands';
import { filterCommand } from './filter';
import type { StatChartScene } from '$lib/ubumark/utils/stat-chart-scene';
import { solveSteps } from './solve-steps';
import { EQUATION_UNSOLVED, INEQUALITY_UNSOLVED } from '$lib/mathAST/cli/commands/solve.command';
import { deriveSteps } from './derive-steps';
import { simplifySteps } from './simplify-steps';
import { factorSteps } from './factor-steps';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { computeVariations } from '$lib/mathAST/variations';
import { toLatex } from '$lib/mathAST/latex-generator';
import {
	guessedVariable,
	isKeywordCommand,
	readCommandArguments,
	writeCommandArguments,
	type CommandArguments
} from '$lib/mathAST/cli/core/variable-argument';
import { parse as parseCommandExpression } from '$lib/mathAST/cli/core/pipeline';
import { tidyTerms } from './tidy-terms';
import {
	findUnknownFunctionCall,
	unknownFunctionMessage
} from '$lib/mathAST/parser/custom/tokenizer';
import { variationTableNode } from '$lib/ubumark/builders/variation-table';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';

// =============================================================================
// Types
// =============================================================================

/** Ce sur quoi la vue Calcul travaille : l'atelier, et le moteur qui le reflète. */
export interface CalcSession {
	readonly atelier: Atelier;
	readonly engine: WebReplEngine;
	/**
	 * La graine d'une simulation (Q76) : une nouvelle à chaque fois, affichée.
	 * Injectée par les tests pour vérifier une simulation au chiffre près.
	 */
	readonly seed?: () => number;
}

/** Ce qu'une saisie a produit. */
export type CalcResult =
	| { readonly kind: 'vide' }
	| { readonly kind: 'definition'; readonly name: string; readonly object: AtelierObject }
	| {
			readonly kind: 'calcul';
			readonly input: string;
			readonly output: string;
			readonly latex?: string;
			/**
			 * L'arbre du RÉSULTAT — le seul support sûr pour « Garder ».
			 *
			 * Sans lui il faudrait relire la sortie texte, ce que `render.ts`
			 * interdit, mesures à l'appui.
			 */
			readonly ast?: MathNode;
	  }
	| {
			readonly kind: 'commande';
			readonly input: string;
			readonly output: string;
			readonly latex?: string;
			/**
			 * Les étapes pédagogiques, quand `pedagogical-solve` sait les
			 * produire. Absentes = repli : la ligne garde la sortie du moteur.
			 */
			readonly steps?: readonly RenderedStep[];
			/** Le graphique d'une simulation, dessiné sous la ligne (Q80) */
			readonly chart?: StatChartScene;
			/**
			 * Une indication affichée AVEC la réponse, qu'elle soit en
			 * mathématiques ou en texte : `.dériver t^2` calcule en x et le dit
			 * (« Calcul par rapport à x… », décision de David, 2026-10-06).
			 */
			readonly note?: string;
	  }
	| {
			readonly kind: 'refus';
			readonly message: string;
			/** Une indication montrée avec le refus (`.résoudre 2t+1<5` : « écris « ; t » ») */
			readonly note?: string;
	  };

/** Ce qu'une action attachée à un objet a produit. */
export type ActionOutcome =
	| {
			readonly ok: true;
			readonly output: string;
			readonly latex?: string;
			/**
			 * Les étapes pédagogiques, quand l'action sait les produire.
			 *
			 * Absentes = repli : la ligne garde la sortie du moteur.
			 */
			readonly steps?: readonly RenderedStep[];
			/**
			 * Le tableau de variations, quand l'action en produit un.
			 *
			 * Absent = repli : la ligne garde le bloc texte du moteur.
			 */
			readonly table?: VariationTableNode;
	  }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

/**
 * `f(x) = …`, `u(n) = …` ou `a = …`, mais jamais `3 = 3`.
 *
 * Le membre gauche doit avoir la forme d'un nom d'objet : sinon c'est un test
 * d'égalité, que le moteur sait déjà traiter (§2 L1).
 */
/** Ce qu'on répond quand le moteur n'a pas su lire une commande, et ne l'a pas dit. */
const UNREADABLE_COMMAND =
	'Je n’ai pas su lire cette expression : vérifie les parenthèses et les signes.';

/** Codes d'erreur du moteur dont le message s'adresse à l'élève, en français. */
const STUDENT_FACING_ERRORS: ReadonlySet<string> = new Set([
	'AMBIGUOUS_VARIABLE',
	'BARE_FUNCTION',
	'TAYLOR_ORDER',
	'NOT_DIFFERENTIABLE',
	// `.intégrer 1/x -1 1` : « L'intégrale diverge ou n'est pas définie… »
	'INTEGRAL_UNDEFINED',
	// Les mots-clés (`de … à`, `en`, `ordre`…) mal écrits : la forme attendue
	'COMMAND_SYNTAX',
	// `.domaine sqrt(sin(x))` : le domaine n'a pas pu être établi (#963)
	'DOMAIN_UNRESOLVED'
]);

/**
 * `pi` écrit en lettres, comme un mot : `2pi`, `sin(pi x)`, `cos(x)=pi`.
 *
 * ⚠️ Décision de David (2026-10-06) : on le REFUSE. La notation custom le lit
 * p·i (i : l'imaginaire) — `f(x) = pi*x` restait « en attente de p »,
 * `.resoudre cos(x)=pi` répondait faux. `\pi` et `π` restent acceptés, ainsi
 * que `p*i` et les mots qui contiennent « pi » (`pile ; face`, `épi`) : avant
 * et après, aucune lettre ni antislash.
 */
const PI_IN_LETTERS = /(?<![\p{L}\\])pi(?!\p{L})/u;

/** Ce qu'on répond à `pi` écrit en lettres. */
const PI_IN_LETTERS_MESSAGE = 'Écris π avec \\pi ou le symbole π.';

const DEFINITION = /^\s*([A-Za-z](?:_\d+)?)\s*(?:\(\s*([A-Za-z])\s*\))?\s*=\s*(.+)$/s;

/**
 * Ce que la ligne de Calcul ajoute après « Dériver » : rien (`null`) si la
 * carte `f′` vient d'être créée, « existe déjà » (§2 L1), ou pourquoi elle ne
 * l'a pas été (E3). Partagé par le bouton et `.dériver`, qui doivent dire la
 * même chose.
 *
 * ⚠️ Elle va dans la `note` de la ligne, jamais au bout de son texte : la vue
 * n'affiche pas le texte d'une ligne dont la réponse se compose en
 * mathématiques — collée au texte, elle était invisible.
 */
export function derivativeNote(result: Created | Refused | null): string | null {
	if (result === null) return null;
	if (!result.ok) return result.message;
	return result.existed ? `${displayName(result.object.name)} existe déjà` : null;
}

/** Les notes d'une ligne réunies en une, ou `{}` s'il n'y en a aucune. */
function notesOf(...notes: readonly (string | null)[]): { note?: string } {
	const present = notes.filter((note): note is string => note !== null);
	return present.length === 0 ? {} : { note: present.join(' ') };
}

/** `u(n+1) = …` : la définition d'une suite récurrente (décision S3). */
const RECURRENCE_DEFINITION = /^\s*([A-Za-z](?:_\d+)?)\s*\(\s*n\s*\+\s*1\s*\)\s*=(?!=)\s*(.+)$/s;

/**
 * `u(5)`, `2u(3)` : un nom suivi d'une parenthèse. ⚠️ Pas de `\b` devant : il ne
 * coupe pas entre `2` et `u`, et `2u(3)` repartait en erreur anglaise (revue
 * du lot 5a, C2). L'argument est lu à part : un rang non entier se refuse.
 */
const TERM = /(?<![A-Za-z_])([A-Za-z](?:_\d+)?)\(([^()]*)\)/g;

/**
 * Remplacer, dans ce que l'élève tape, chaque terme d'une RÉCURRENCE (`u(5)`)
 * par sa valeur. Les suites explicites et les fonctions sont laissées au moteur.
 *
 * Un rang avant le premier est refusé en français, pas d'erreur du moteur.
 */
function recurrenceTermsIn(
	atelier: Atelier,
	input: string
): { ok: true; text: string } | { ok: false; message: string } {
	let failure: string | null = null;
	const text = input.replace(TERM, (whole, name: string, rank: string) => {
		const object = atelier.get(name);
		if (failure !== null || object?.kind !== 'sequence' || object.mode !== 'recurrence')
			return whole;
		if (!/^\s*\d+\s*$/.test(rank)) {
			failure = `Le rang de ${name} doit être un entier positif : ${name}(5), pas ${name}(${rank.trim()}).`;
			return whole;
		}
		const n = Number(rank);
		if (n < object.firstIndex) {
			failure = `${name}(${n}) n'existe pas : la suite commence au rang ${object.firstIndex}.`;
			return whole;
		}
		// C3 : « trop loin » et « diverge » ne se confondent pas
		if (n - object.firstIndex >= MAX_SEQUENCE_TERMS) {
			failure = `${name}(${n}) : le calcul est limité aux ${MAX_SEQUENCE_TERMS} premiers termes.`;
			return whole;
		}
		const terms = termsOf(atelier, name, n);
		if (!terms.ok) {
			failure = terms.message;
			return whole;
		}
		const term = terms.terms.find((t) => t.n === n);
		if (term === undefined) {
			failure = `${name}(${n}) n'est pas un nombre fini : la suite diverge.`;
			return whole;
		}
		// 15 chiffres : au-delà, la dérive du flottant passait pour un entier exact
		return `(${Number(term.value.toPrecision(15))})`;
	});
	return failure === null ? { ok: true, text } : { ok: false, message: failure };
}

/** Une « définition » de dérivée (`f'(x) = …`), refusée (§2 E1). */
const DERIVATIVE_DEFINITION = /^\s*([A-Za-z](?:_\d+)?'+)\s*(?:\(\s*[A-Za-z]\s*\))?\s*=(?!=)/;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Le type d'objet qu'annonce une définition.
 *
 * La FORME tranche quand elle le peut : `u(n) = …` est une suite, `f(x) = …`
 * une fonction. Sans paramètre, c'est le CONTENU qui décide — sans quoi
 * `g = f'` produisait une VALEUR nommée « f' », que l'atelier croyait saine et
 * à laquelle il proposait un curseur, comme à un nombre.
 */
function kindOf(parameter: string | undefined, body: string): ObjectKind {
	if (parameter === 'n') return 'sequence';
	if (parameter !== undefined) return 'function';

	const ast = astOf(body);
	if (ast === null) return 'value';
	const variables = new Set(getVariables(ast));
	if (variables.has('x')) return 'function';
	// `f'` n'a pas de variable libre, mais désigne bien une fonction : c'est le
	// nœud lui-même qui le dit (`derivativeOrder`).
	if (/[A-Za-z](?:_\d+)?['’]/.test(body)) return 'function';
	return 'value';
}

/**
 * Créer ou mettre à jour l'objet qu'une définition décrit.
 *
 * ⚠️ Une définition qu'on ne sait pas lire crée quand même l'objet (§2 E1) :
 * il porte son erreur, et l'élève voit son travail plutôt qu'un refus sec.
 */
function defineObject(
	session: CalcSession,
	name: string,
	parameter: string | undefined,
	body: string,
	provenance: Provenance
): CalcResult {
	const { atelier } = session;
	const existing = atelier.get(name);

	// `f(t) = t^2` : la carte garde t, l'atelier range en x (`letter.ts`). La
	// lettre est jugée AVANT le renommage : `f(a)` avec un objet `a`, ou x dans
	// une définition en t, changeraient le sens en silence.
	// Sans `(lettre)`, `f = …` redéfinit la fonction dans SA lettre : `f = t + 1`
	// après `f(t)` se range x + 1, et `f = x + 1` est refusé comme `f(t) = t + x`
	// (revue de #905 : x tapé était montré t, et t restait « en attente »).
	const inherited =
		parameter === undefined && existing?.kind === 'function' ? existing.letter : undefined;
	const explicit = parameter !== undefined && parameter !== 'n' ? parameter : undefined;
	const letter = explicit ?? inherited;
	let stored = body.trim();
	if (letter !== undefined && letter !== INTERNAL_LETTER) {
		const refused = letterRejection(
			letter,
			name,
			atelier.names.filter((n) => n !== name)
		);
		if (refused !== null) return { kind: 'refus', message: refused };
		const internal = internalDefinition(stored, letter, name, provenance, atelier.functionNames);
		if (!internal.ok) return { kind: 'refus', message: internal.message };
		stored = internal.definition;
	}

	if (existing === undefined) {
		const rejection = validateName(name, atelier.names);
		if (rejection !== null) {
			return { kind: 'refus', message: nameRejectionMessage(rejection, name) };
		}
		const created = atelier.create(
			{ kind: kindOf(parameter, body), name, definition: stored, ...(letter && { letter }) },
			provenance
		);
		if (!created.ok) return { kind: 'refus', message: created.message };
		// Ce qui se trace (fonction, suite) et qu'on CRÉE dans Calcul est tracé
		// d'office (décisions de David) : on le définit pour le voir. Redéfini, il
		// garde son état — retiré du graphique, il ne revient pas en douce.
		if (tracedOnCreation(created.object.kind)) atelier.setPlotted(name, true);
		// Relu APRÈS le tracé : l'objet rendu doit dire qu'il est tracé (revue)
		return { kind: 'definition', name, object: atelier.get(name) ?? created.object };
	}

	// Seule une fonction a une lettre : `u(n) = …` ne la touche pas
	const updated = atelier.update(
		name,
		stored,
		provenance,
		existing.kind === 'function' ? letter : undefined
	);
	if (!updated.ok) return { kind: 'refus', message: updated.message };
	return { kind: 'definition', name, object: updated.object };
}

/**
 * Remplacer, dans l'argument d'une commande, les noms d'objets par leur
 * expression.
 *
 * ⚠️ **Le défaut que ça répare a été vu à l'écran.** `.dériver f` rendait **0**
 * avec un message de succès : le moteur lit `f` comme une variable libre et la
 * dérive par rapport à `x`. L'action « Dériver » du panneau, elle, donnait
 * `2x-3` — parce qu'elle substitue. Deux chemins, deux réponses, dont une
 * fausse et silencieuse.
 *
 * On ne remplace qu'un nom **isolé** ou **appelé** (`f` ou `f(x)`) : sans ça,
 * le `f` de `\frac` ou d'un mot quelconque serait réécrit.
 */
/** Le nom d'une SUITE citée avec un prime (`u'(n)`), s'il y en a une. */
function derivedSequence(session: CalcSession, argument: string): string | null {
	for (const match of argument.matchAll(/(?<![A-Za-z_])([A-Za-z](?:_\d+)?)'+/g)) {
		if (session.atelier.get(match[1])?.kind === 'sequence') return match[1];
	}
	return null;
}

/**
 * Remplacer chaque appel `name(…)` (ou `name'(…)`) par son expression COMPOSÉE.
 *
 * ⚠️ Dans l'ARBRE, appel par appel : `f(2x)` doit devenir sin(2x), et non
 * l'expression de f collée devant son argument. Seul l'appel est relu — le
 * reste de l'argument d'une commande (`; x`, l'ordre de
 * `.taylor`) n'est pas une expression et ne passerait pas le parseur.
 *
 * `null` si un appel est repéré mais ne se compose pas : retomber sur le nom
 * seul recollerait l'expression devant l'argument, et `f_1(2x)` se lirait de
 * nouveau comme un PRODUIT, sans rien dire (revue de #901).
 */
function replaceCalls(session: CalcSession, text: string, name: string): string | null {
	const start = new RegExp(`(?<![A-Za-z_])${name}'*\\s*\\(`, 'g');
	let result = '';
	let cursor = 0;
	for (let match = start.exec(text); match !== null; match = start.exec(text)) {
		// La parenthèse fermante qui répond à celle de l'appel
		let depth = 0;
		let end = -1;
		for (let i = match.index + match[0].length - 1; i < text.length; i++) {
			if (text[i] === '(') depth++;
			else if (text[i] === ')' && --depth === 0) {
				end = i;
				break;
			}
		}
		if (end === -1) break;
		const call = text.slice(match.index, end + 1);
		// Le parseur doit y lire un APPEL : `f_1(2x)` se lit f₁·(2x), et sa
		// « composition » rendait encore le produit (x^2)(2x)
		if (astOf(call, 'url', session.atelier.functionNames)?.type !== 'function') return null;
		const composed = expandCommandArgument(session.atelier, call);
		if (composed === null) return null;
		result += `${text.slice(cursor, match.index)}(${composed})`;
		cursor = end + 1;
		start.lastIndex = cursor;
	}
	return result + text.slice(cursor);
}

function substituteNames(session: CalcSession, argument: string): string | null {
	if (argument.trim() === '') return argument;

	let result = argument;
	for (const object of session.atelier.objects) {
		if (object.status !== 'ok') continue;
		const expression = expressionOf(session.atelier, object.name);
		if (!expression.ok) continue;

		// Les APPELS d'abord : sinon le `f` seul de `f(2x)` serait remplacé, et
		// `(sin(x))(2x)` se lirait comme un PRODUIT — `.taylor f(2x) 4` rendait
		// 2x² (2026-10-06).
		if (object.kind === 'function' || object.kind === 'sequence') {
			const replaced = replaceCalls(session, result, object.name);
			if (replaced === null) return null;
			result = replaced;
		}
		const alone = new RegExp(`(?<![A-Za-z_])${object.name}(?![A-Za-z_0-9])`, 'g');
		result = result.replace(alone, `(${expression.expression})`);
	}
	return result;
}

/**
 * Exécuter une commande que l'atelier sert lui-même.
 *
 * ⚠️ Les trois issues de `factorSteps` donnent trois lignes DIFFÉRENTES, et
 * c'est le cœur du geste : sans moteur derrière, une ligne muette ou une
 * expression renvoyée telle quelle passerait pour une réponse. « Je ne sais
 * pas factoriser 3x + 6 » n'est PAS un refus de l'atelier — la commande a bien
 * tourné — donc la ligne n'est pas rouge.
 */
function runAtelierCommand(name: string, input: string, argument: string): CalcResult {
	if (argument.trim() === '') {
		return {
			kind: 'refus',
			message: 'Il manque l’expression à factoriser. Par exemple : .factoriser x^2-4'
		};
	}

	const outcome = factorSteps(argument);
	switch (outcome.kind) {
		case 'factorisee':
			return {
				kind: 'commande',
				input,
				output: outcome.text,
				latex: outcome.answer,
				steps: outcome.steps
			};
		case 'inchangee':
			return { kind: 'commande', input, output: outcome.message };
		case 'illisible':
			return { kind: 'refus', message: outcome.message };
	}
}

/** Les simulations, servies par l'atelier (Q72-Q83) */
const SIMULATIONS: Readonly<Record<string, typeof simulateCommand>> = {
	simulate: simulateCommand,
	frequency: frequencyCommand,
	samples: samplesCommand,
	// Tableau croisé (Q89) : lit des NOMS de listes, pas de hasard
	cross: (atelier, argument) => crossCommand(atelier, argument),
	// Filtre (Q90) : lit des NOMS de listes, pas de hasard
	filter: (atelier, argument) => filterCommand(atelier, argument),
	// Comparer deux séries (Q112) : lit des NOMS de listes, pas de hasard
	compare: (atelier, argument) => compareCommand(atelier, argument),
	// Loi binomiale (Q142) : la scène du bloc ```loi, sans liste créée
	binomial: (atelier, argument) => binomialCommand(atelier, argument),
	// Lois de maths complémentaires (manche 13, PR c) : même chemin que `.binomiale`
	geometric: (atelier, argument) => geometricCommand(atelier, argument),
	uniform: (atelier, argument) => uniformCommand(atelier, argument),
	exponential: (atelier, argument) => exponentialCommand(atelier, argument)
};

/**
 * Remplacer les noms de l'atelier dans chaque PARTIE d'un argument à
 * mots-clés : l'expression, les bornes, la valeur, l'intervalle, la seconde
 * expression — jamais la variable ni le nom remplacé (`en x=3`).
 * `null` si une partie ne se compose pas.
 */
function substituteArguments(
	args: CommandArguments,
	substitute: (text: string) => string | null
): CommandArguments | null {
	const expression = substitute(args.expression);
	const lower = args.bounds === null ? null : substitute(args.bounds.lower);
	const upper = args.bounds === null ? null : substitute(args.bounds.upper);
	const value = args.assignment === null ? null : substitute(args.assignment.value);
	const interval = args.interval === null ? null : substitute(args.interval);
	const other = args.other === null ? null : substitute(args.other);
	if (expression === null) return null;
	if (args.bounds !== null && (lower === null || upper === null)) return null;
	if (
		[args.assignment, args.interval, args.other].some(
			(part, i) => part !== null && [value, interval, other][i] === null
		)
	) {
		return null;
	}
	return {
		...args,
		expression,
		bounds: lower === null || upper === null ? null : { lower, upper },
		assignment: args.assignment === null || value === null ? null : { ...args.assignment, value },
		interval,
		other
	};
}

/**
 * La lettre des fonctions de l'atelier citées SEULES (`f`, `f'`, pas `f(2t)`,
 * dont l'appel porte déjà son argument) dans une saisie : `single` si toutes
 * ont la même lettre autre que x et que x n'est pas tapé à côté ; `mixed` si
 * les lettres se mêlent ; `null` sinon (rien à récrire).
 */
function functionLetterOf(
	session: CalcSession,
	typed: string
): { kind: 'single'; letter: string } | { kind: 'mixed' } | null {
	const letters = new Set<string>();
	let rest = typed;
	for (const object of session.atelier.objects) {
		if (object.kind !== 'function') continue;
		const escaped = object.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const bare = new RegExp(`(?<![A-Za-z_])${escaped}'*(?![A-Za-z_0-9'(])`, 'g');
		if (!bare.test(typed)) continue;
		letters.add(typedLetterOf(session.atelier, object));
		rest = rest.replace(bare, ' ');
	}
	if (letters.size === 0) return null;
	// x tapé à côté (hors appels `f(x)`) : il se mêle à la lettre de la fonction
	const typedX = /(?<![A-Za-z\\_])x(?![A-Za-z_])/.test(
		rest.replace(/[A-Za-z_]\w*'*\([^()]*\)/g, ' ')
	);
	if (typedX) letters.add(INTERNAL_LETTER);
	if (letters.size > 1) return { kind: 'mixed' };
	const [letter] = letters;
	return letter === INTERNAL_LETTER ? null : { kind: 'single', letter };
}

/** Une graine neuve, à 4 chiffres : facile à lire et à recopier (Q76) */
function randomSeed(): number {
	return 1000 + Math.floor(Math.random() * 9000);
}

/** Exécuter une commande, après l'avoir traduite vers ce que comprend le moteur. */
function runCommand(session: CalcSession, input: string): CalcResult {
	const { engine } = session;
	const resolved = resolveCommand(input);

	const space = resolved.indexOf(' ');
	const typed = (space === -1 ? resolved.slice(1) : resolved.slice(1, space)).trim().toLowerCase();

	// ⚠️ On vérifie AVANT d'exécuter : le moteur répondrait « Unknown command »
	// en anglais, sans dire ce qui s'en approche (§2 E2).
	const known = commandCatalog(engine).find(
		(c) => c.name.toLowerCase() === typed || c.aliases.some((a) => a.toLowerCase() === typed)
	);
	if (known === undefined) {
		const written = (
			input.indexOf(' ') === -1 ? input.slice(1) : input.slice(1, input.indexOf(' '))
		).trim();
		const close = suggestFor(engine, written);
		const suffix =
			close.length === 0 ? '' : ` Peut-être : ${close.map((c) => `« .${c} »`).join(' ou ')} ?`;
		return { kind: 'refus', message: `« .${written} » n'est pas une commande.${suffix}` };
	}

	/**
	 * ⚠️ **Le catalogue tranche, y compris pour l'exécution.**
	 *
	 * `resolveCommand` ne traduit que le nom FRANÇAIS : un raccourci partait au
	 * moteur tel quel, et le moteur l'arbitre autrement. Mesuré le 2026-09-19 —
	 * deux raccourcis sont revendiqués par deux commandes chacun (`s` par
	 * `simplify` et `solve`, `h` par `help` et `hash`), et le moteur donne le
	 * second à chaque fois, à l'inverse du catalogue que l'élève lit :
	 *
	 *   .s x+x   → ligne VIDE (solve, « l'entrée doit être une équation »)
	 *   .h       → ligne VIDE (hash, sans argument)
	 *
	 * Le catalogue annonçait pourtant « .s → Simplifier » et « .h → Aide », et
	 * son arbitrage est délibéré (« `aide` est utile à un élève, `empreinte` ne
	 * l'est pas »). On exécute donc le nom CANONIQUE, pas ce qui a été tapé.
	 *
	 * C'est aussi ce qui permet aux étapes pédagogiques de reconnaître la
	 * commande : sans ça, `.simp` ne dépliait rien là où `.simplifier` dépliait.
	 */
	const name = known.name.toLowerCase();

	// Les simulations lisent des NOMS de listes : elles passent avant la substitution
	// des noms par leurs expressions, qui en ferait des listes de nombres
	// C6 : une commande traite une expression ; une récurrence n'en est pas une
	// (`.dériver u(2)` rendait « d/dx((u(n)-5)(2)) = 0 »)
	const typedArgument = space === -1 ? '' : resolved.slice(space + 1);
	const recurrence = session.atelier.objects.find(
		(o) =>
			o.kind === 'sequence' &&
			o.mode === 'recurrence' &&
			new RegExp(`(?<![A-Za-z_])${o.name}\\s*(?:\\(|_)`).test(typedArgument)
	);
	if (recurrence !== undefined) {
		return {
			kind: 'refus',
			message: `« ${recurrence.name} » est une suite récurrente : les commandes ne s'en servent pas. Ses termes se calculent un par un, comme ${recurrence.name}(5).`
		};
	}

	const simulation = SIMULATIONS[known.name];
	if (simulation !== undefined) {
		const seed = (session.seed ?? randomSeed)();
		const outcome = simulation(session.atelier, typedArgument, seed);
		return outcome.ok
			? {
					kind: 'commande',
					input,
					output: outcome.text,
					...(outcome.chart && { chart: outcome.chart })
				}
			: { kind: 'refus', message: outcome.message };
	}

	// L'argument reçoit les EXPRESSIONS, pas les noms — règle du §6 bis, ici
	// appliquée à la commande tapée à la main.
	// ⚠️ Les dérivées d'abord (`f'(x)` → son expression), puis les noms : sans
	// ça, `f'(x)` perdait son `f` et devenait `(x^2-3x)'(x)`, illisible —
	// `.resoudre f'(x)=0` répondait « Je n'ai pas su lire » (2026-10-05)
	// `π` → `\pi` (la constante) pour une commande de CALCUL seulement : les
	// commandes de données sont sorties plus haut (`SIMULATIONS`), où `π` est
	// une modalité comme une autre — `.filtrer L = π` (revue #911)
	const rawArgument =
		space === -1 ? '' : withPiCommand(resolved.slice(space + 1).replace(/’/g, "'"));
	const mixed = mixedNotationMessage(rawArgument);
	if (mixed !== null) return { kind: 'refus', message: mixed };
	const derived = derivedSequence(session, rawArgument);
	if (derived !== null) {
		return {
			kind: 'refus',
			message: `« ${derived} » est une suite : elle ne se dérive pas.`
		};
	}
	// `f'(x)` → son expression d'abord, puis les noms (voir plus haut)
	const substitute = (text: string): string | null =>
		!text.includes("'")
			? substituteNames(session, text)
			: (expandCommandArgument(session.atelier, text) ??
				substituteNames(session, expandInput(session.atelier, text)));
	const argument = substitute(rawArgument);
	if (argument === null) return { kind: 'refus', message: UNREADABLE_COMMAND };
	// ⚠️ **Certaines commandes ne vont PAS au moteur.** Il ne les connaît pas
	// et répondrait « Unknown command », en anglais. On sort donc ici, avant
	// `engine.execute` — et sans moteur derrière, il n'y a aucun repli : ce que
	// rend `runAtelierCommand` est tout ce que l'élève verra.
	if (ATELIER_ONLY_COMMANDS.has(known.name)) {
		return runAtelierCommand(known.name, input, argument);
	}

	const unknown = findUnknownFunctionCall(rawArgument);
	if (unknown !== null) return { kind: 'refus', message: unknownFunctionMessage(unknown) };

	// Les commandes à mots-clés (`de … à`, `pour`, `en`, `ordre`, `dans`, `et` —
	// décisions de David, 2026-10-08) : lues sur la saisie TAPÉE, avant que les
	// noms soient remplacés (`a` est aussi le mot-clé `à`), puis remplacées
	// partie par partie et récrites pour le moteur
	const keyworded = isKeywordCommand(name) && space !== -1 ? name : null;
	const reading = keyworded === null ? null : readCommandArguments(keyworded, rawArgument);
	if (reading !== null && !reading.ok) return { kind: 'refus', message: reading.message };
	const typedArgs = reading?.args ?? null;
	if (
		name === 'equiv' &&
		typedArgs !== null &&
		typedArgs.other === null &&
		!rawArgument.includes('===')
	) {
		return {
			kind: 'refus',
			message: 'Écris « et » entre les deux expressions : .équivalent (x+1)^2 et x^2+2x+1'
		};
	}
	const args = typedArgs === null ? null : substituteArguments(typedArgs, substitute);
	if (typedArgs !== null && args === null) return { kind: 'refus', message: UNREADABLE_COMMAND };

	// `.dériver f` : la cible tapée, sans sa variable ni son `(x)`. Une
	// fonction de l'atelier est rangée en x (#905), même quand son expression
	// n'en contient pas : `f(x) = k` se dériverait sinon en k, et répondrait 1.
	const typedTarget = typedArgs?.expression ?? typedArgument;
	const diffTarget = /^(.+?)\s*(?:\(\s*x\s*\))?$/.exec(typedTarget)?.[1] ?? typedTarget;
	const derivesFunction = name === 'diff' && session.atelier.get(diffTarget)?.kind === 'function';

	// La variable : tapée, sinon x pour une fonction de l'atelier, sinon devinée
	// (x présent → x ; une seule lettre → elle ; plusieurs sans x → refus)
	// Une fonction de l'atelier se traite dans SA lettre (#905, décision de
	// David 2026-10-08) : rangée en x, son expression est récrite en t, et le
	// calcul se fait en t. Plusieurs lettres mêlées : en x, et on le dit.
	// ⚠️ Seulement si la variable n'est pas tapée, ou si c'est SA lettre : avec
	// f(t) = t³, `.dériver f pour x` lit f en x (comme sur main, f est rangée
	// en x) au lieu de dériver t³ par rapport à x (revue #962).
	const letter =
		typedArgs === null || name === 'equiv' ? null : functionLetterOf(session, typedArgs.expression);
	const typedVariable = typedArgs?.variable ?? typedArgs?.assignment?.name ?? null;
	const rewrites =
		letter?.kind === 'single' && (typedVariable === null || typedVariable === letter.letter);
	let finalArgs =
		args === null || !rewrites || letter?.kind !== 'single'
			? args
			: {
					...args,
					expression: renameVariable(
						args.expression,
						INTERNAL_LETTER,
						letter.letter,
						'url',
						session.atelier.functionNames
					),
					variable: name === 'eval' ? args.variable : (args.variable ?? letter.letter)
				};
	const letterNote =
		letter?.kind === 'mixed' && typedVariable === null
			? 'Fonctions écrites avec des lettres différentes : calcul en x.'
			: null;
	if (finalArgs !== null && finalArgs.variable === null && name !== 'eval' && name !== 'equiv') {
		const parsed = parseCommandExpression(finalArgs.expression).ast;
		if (derivesFunction) finalArgs = { ...finalArgs, variable: INTERNAL_LETTER };
		else if (parsed !== undefined) {
			const guessed = guessedVariable(
				parsed,
				engine.getEvalState().bindings.keys(),
				`.${known.french}`
			);
			if (!guessed.ok) return { kind: 'refus', message: guessed.message };
			if (guessed.variable !== 'x') finalArgs = { ...finalArgs, variable: guessed.variable };
		}
	}
	const commandArgument = finalArgs === null ? argument : writeCommandArguments(finalArgs);
	const executed = space === -1 ? `.${known.name}` : `.${known.name} ${commandArgument}`;

	const result = engine.execute(executed);
	// `fromCommand` : pour une commande, `result.ast` porte l'ENTRÉE. Le rendre
	// afficherait « x^2 » là où `.dériver x^2` répond « 2x » (voir `render.ts`).
	const rendered = renderResult(result, { fromCommand: true });
	const noted = notesOf(letterNote);

	// Un refus que le moteur adresse à l'élève, en français (`.dériver x^2 ; ab`
	// : « « ab » n'est pas une variable. », `.dériver sin x` : « Écris sin(x)… ») :
	// montré tel quel, AVANT les étapes — qui, elles, liraient `sin x` autrement —
	// et pas noyé dans « Je n’ai pas su lire » (revue #880)
	if (!result.success && STUDENT_FACING_ERRORS.has(result.error?.code ?? '')) {
		return { kind: 'refus', message: result.error?.message ?? UNREADABLE_COMMAND, ...noted };
	}

	// ⚠️ **Les étapes remplacent le formateur de terminal, jamais la réponse.**
	// `solveSteps` rend `null` dès qu'il ne sait pas faire (degré ≥ 3, non
	// polynomial, paramètre, liste qui ne conclut pas) : la ligne garde alors
	// exactement ce qu'elle affichait avant ce lot.
	//
	// ⚠️ **On ne conditionne PAS au succès du moteur.** Sur une inéquation il
	// échoue et ne rend rien — mesuré, `.résoudre 2x+1<7` affichait une ligne
	// entièrement vide, sans même un message. Les étapes sont alors la seule
	// chose que l'élève recevra.
	// ⚠️ **Le bouton et la commande doivent dire la MÊME chose** — leçon du lot
	// `.résoudre`, où seul l'un des deux chemins avait d'abord été branché.
	// Ici il n'y a pas d'objet à nommer, donc la dérivée est rendue seule.
	if (name === 'diff') {
		// `.dériver f` sur une fonction de l'atelier crée la carte `f′`, comme le
		// bouton, et le DIT comme lui (phase 0 `/grapheur` §2 D3 ; revue 3a, C2).
		// Sur une expression, rien à créer (L4).
		const note = derivesFunction
			? derivativeNote(session.atelier.createDerivative(diffTarget))
			: null;
		const notes = notesOf(letterNote, note);
		// Les étapes dérivent la même chose que le moteur, variable comprise
		const derived = deriveSteps(
			finalArgs?.expression ?? argument,
			undefined,
			finalArgs?.variable ?? undefined
		);
		if (derived !== null) {
			return {
				kind: 'commande',
				input,
				output: rendered.text,
				latex: derived.answer,
				steps: derived.steps,
				...notes
			};
		}
		// Pas d'étapes (`sec(3x)`) : la dérivée du moteur, en LaTeX — son `ast`
		// est la DÉRIVÉE (`diff.command`), pas l'entrée
		if (result.success && result.ast !== undefined) {
			return {
				kind: 'commande',
				input,
				output: rendered.text,
				latex: toLatex(result.ast),
				...notes
			};
		}
		if (note !== null) return { kind: 'commande', input, output: rendered.text, ...notes };
	}

	// ⚠️ Même forme que `.dériver`, pour la même raison : le moteur ne SAIT pas
	// faire une partie de ce qu'on lui demande. Mesuré — `.simplifier x+x` et
	// `.simplifier sqrt(8)` rendaient l'entrée inchangée. L'étape n'est donc pas
	// qu'une explication ici : c'est aussi la bonne réponse.
	if (name === 'simplify') {
		const simplified = simplifySteps(argument);
		if (simplified !== null) {
			return {
				kind: 'commande',
				input,
				output: rendered.text,
				latex: simplified.answer,
				steps: simplified.steps
			};
		}
	}

	// `dans [a ; b]` : les étapes ne savent pas restreindre, le moteur si
	const solved =
		name === 'solve' && finalArgs !== null && finalArgs.interval === null
			? solveSteps(
					finalArgs.variable === null
						? finalArgs.expression
						: `${finalArgs.expression} ; ${finalArgs.variable}`
				)
			: null;
	if (solved !== null) {
		return {
			kind: 'commande',
			input,
			output: rendered.text,
			latex: solved.answer,
			steps: solved.steps,
			...noted
		};
	}

	// Une inéquation que le moteur a LUE sans savoir la résoudre : on le dit, et
	// pas « Je n'ai pas su lire » — APRÈS les étapes, qui savent parfois faire
	// Même chose pour une équation qu'aucun solveur ne traite (`x^5+x+1=0`,
	// un paramètre : `u_0*q^n=10 pour n`) : refus en français (revue, 2026-10-09)
	if (
		name === 'solve' &&
		!result.success &&
		(result.error?.code === INEQUALITY_UNSOLVED || result.error?.code === EQUATION_UNSOLVED)
	) {
		return { kind: 'refus', message: result.error.message, ...noted };
	}

	// Pas d'étapes (degré ≥ 3, transcendante, trigonométrique) : les solutions
	// du moteur, en LaTeX — bâties sur son résultat STRUCTURÉ (`solve-latex.ts`).
	// Sans lui, la ligne montrait le texte du terminal,
	// « x = 0 ou x = {1/2}sqrt(2) ou x = -{1/2}sqrt(2) » (2026-10-08).
	if (name === 'solve' && result.success && result.latex !== undefined) {
		return { kind: 'commande', input, output: rendered.text, latex: result.latex, ...noted };
	}

	// Le moteur a échoué SANS RIEN DIRE (erreur de lecture) : une ligne vide ne
	// dit rien à l'élève — mesuré, `.deriver )(` et `.resoudre )` (2026-10-05)
	if (!result.success && rendered.text.trim() === '') {
		return { kind: 'refus', message: UNREADABLE_COMMAND, ...noted };
	}

	// `.taylor` : l'exception à `fromCommand` — son `result.ast` est le
	// POLYNÔME rendu, pas l'entrée (voir `taylor.command.ts`). Sans lui, la
	// ligne montrait le texte du terminal, « 1+x+{1/2}x^2 » (2026-10-06).
	if (name === 'taylor' && result.success && result.ast !== undefined) {
		return {
			kind: 'commande',
			input,
			output: rendered.text,
			latex: toLatex(result.ast),
			...noted
		};
	}

	// `.intégrer` : même exception — son `result.ast` est la PRIMITIVE, ou la
	// VALEUR d'une intégrale définie (voir `integrate.command.ts`). Sans lui, la
	// ligne montrait le texte du terminal, « ∫ x^2 dx = {1/3}x^3 + C » (2026-10-08).
	if (name === 'integrate' && result.success && result.ast !== undefined) {
		return {
			kind: 'commande',
			input,
			output: rendered.text,
			latex: integralLatex(result.ast, rendered.text),
			...noted
		};
	}

	return {
		kind: 'commande',
		input,
		output: rendered.text,
		...(rendered.latex && { latex: rendered.latex }),
		...noted
	};
}

/**
 * Le LaTeX du résultat de `.intégrer`, lu sur la première ligne du moteur :
 * `∫[a→b] … = v` (valeur exacte), `∫[a→b] … ≈ v` (approchée), sinon une
 * primitive, `∫ … = F + C` — la constante y reste, comme dans le texte.
 */
function integralLatex(ast: MathNode, text: string): string {
	const firstLine = text.split('\n')[0] ?? '';
	const latex = toLatex(ast);
	if (!firstLine.startsWith('∫[')) return `${latex} + C`;
	return / ≈ /.test(firstLine) ? `\\approx ${latex}` : latex;
}

/**
 * L'entrée cite-t-elle la dérivée d'un objet qui ne peut rien produire ?
 *
 * ⚠️ Vu à l'écran : `k'` sur un objet en attente rendait « Unexpected token: ' »
 * — un message de parseur, en anglais, là où l'élève attend qu'on lui dise ce
 * qui manque.
 */
function derivativeOfUnusable(session: CalcSession, input: string): string | null {
	for (const match of input.matchAll(/([A-Za-z](?:_\d+)?)['\u2019]/g)) {
		const object = session.atelier.get(match[1]);
		if (object === undefined) {
			return `« ${match[1]} » n'existe pas : sa dérivée non plus.`;
		}
		// ⚠️ **Seule une définition ILLISIBLE bloque la dérivation.**
		//
		// Un objet « en attente » se dérive très bien : `k(x) = bx` ne peut pas
		// être ÉVALUÉ — on ne connaît pas `b` — mais `k'(x) = b` se calcule sans
		// rien savoir de `b`. Mesuré : `mathAST` rend `b*x → b`, `a*x+b → a`,
		// `b*sin(x) → b·cos(x)`.
		//
		// Mon premier garde confondait les deux et refusait une dérivée
		// parfaitement légitime — relevé par David.
		if (object.status === 'error') {
			return object.message ?? `« ${match[1]} » ne se lit pas : sa dérivée non plus.`;
		}
	}
	return null;
}

/**
 * Traiter ce que l'élève vient de taper.
 *
 * ⚠️ Le moteur est remis en accord avec l'atelier **avant** toute évaluation :
 * c'est ce qui fait que `f(2)` répond sans que l'élève redéclare `f` (§2 N3,
 * option B).
 */
export function runInput(
	session: CalcSession,
	text: string,
	provenance: Provenance = 'text'
): CalcResult {
	const input = text.trim();
	if (input === '') return { kind: 'vide' };

	// Avant tout chemin — commande, définition, calcul : tous lisent `pi` p·i
	if (PI_IN_LETTERS.test(input)) return { kind: 'refus', message: PI_IN_LETTERS_MESSAGE };

	// Avant tout chemin aussi : `racine(x)`, `acoss(x)` se lisaient en produits
	// de lettres, sans erreur. Une commande le vérifie sur son argument de
	// CALCUL (`runCommand`) : les commandes de données lisent des modalités.
	if (!input.startsWith('.')) {
		const unknown = findUnknownFunctionCall(input);
		if (unknown !== null) return { kind: 'refus', message: unknownFunctionMessage(unknown) };
	}

	syncEngine(session.atelier, session.engine);

	// Entrée BRUTE : `runCommand` ne réécrit `π` qu'en argument d'une commande
	// de calcul (`.filtrer L = π` lit une modalité), et l'écho reste ce qui a
	// été tapé (revue #911)
	if (input.startsWith('.')) return runCommand(session, input);

	// La forme du membre gauche est garantie par la regex — `3 = 3` n'y entre
	// pas. Un nom RÉSERVÉ, lui, y entre et se fait refuser par `validateName` :
	// « x = 3 » doit expliquer pourquoi (§2 L2), pas se taire en test d'égalité.
	// §2 E1 : `f'(x) = 3x` ne définit rien — `f′` est la dérivée de `f`
	const derivativeDefinition = DERIVATIVE_DEFINITION.exec(input);
	if (derivativeDefinition !== null) {
		const typedName = derivativeDefinition[1];
		const base = derivativeOf(typedName)?.base ?? typedName;
		return {
			kind: 'refus',
			message: `${displayName(typedName)} est la dérivée de ${base} : elle se calcule, elle ne se définit pas. Pour l'obtenir : .dériver ${base}`
		};
	}

	// S3 : `u(n+1) = 0,5u(n) + 3` crée (ou modifie) une suite RÉCURRENTE
	const recurrence = RECURRENCE_DEFINITION.exec(input);
	if (recurrence !== null) {
		const [, name, body] = recurrence;
		const result = defineObject(session, name, 'n', body, provenance);
		if (result.kind === 'definition' && session.atelier.get(name)?.kind === 'sequence') {
			const set = session.atelier.setSequence(name, { mode: 'recurrence' });
			if (!set.ok) return { kind: 'refus', message: set.message };
		}
		syncEngine(session.atelier, session.engine);
		return result.kind === 'definition'
			? { ...result, object: session.atelier.get(name) ?? result.object }
			: result;
	}

	const definition = DEFINITION.exec(input);
	if (definition !== null) {
		const [, name, parameter, body] = definition;
		const result = defineObject(session, name, parameter, body, provenance);
		// `u(n) = …` dit « explicite » (S3) : le mode d'une suite étant gardé à la
		// modification, c'est ici qu'une récurrence retapée en explicite le devient
		// — sinon u(3) valait 5 au lieu de 7 (revue du lot 5a, B1)
		const defined = session.atelier.get(name);
		if (
			result.kind === 'definition' &&
			parameter === 'n' &&
			defined?.kind === 'sequence' &&
			defined.mode === 'recurrence'
		) {
			session.atelier.setSequence(name, { mode: 'explicit' });
		}
		// L'objet a changé : le moteur doit le savoir pour le calcul suivant.
		syncEngine(session.atelier, session.engine);
		return result;
	}

	// ⚠️ Une dérivée d'objet indisponible se refuse ICI, en français : laissée au
	// moteur, elle rendait « Unexpected token: ' » — un message de parseur.
	const blocked = derivativeOfUnusable(session, input);
	if (blocked !== null) return { kind: 'refus', message: blocked };

	// S3 : les termes d'une récurrence (`u(5)`) sont calculés ici, puis passés au
	// moteur comme des nombres — il ne sait pas itérer une récurrence
	const withTerms = recurrenceTermsIn(session.atelier, input);
	if (!withTerms.ok) return { kind: 'refus', message: withTerms.message };

	// Le moteur répondrait « Invalid backslash sequence », en anglais (revue #911)
	const mixed = mixedNotationMessage(input);
	if (mixed !== null) return { kind: 'refus', message: mixed };

	// `f'(2)` doit valoir 1 : le moteur ne sait pas lier `f'`, l'atelier traduit.
	const result = session.engine.execute(
		expandInput(session.atelier, withPiCommand(withTerms.text))
	);
	const rendered = renderResult(result);
	return {
		kind: 'calcul',
		input,
		output: rendered.text,
		...(rendered.latex && { latex: rendered.latex }),
		...(result.success && result.ast !== undefined && { ast: result.ast })
	};
}

/**
 * Le type d'un objet qu'on garde : il suit le CONTENU, pas le geste (§4 N2).
 *
 * Lu sur l'ARBRE, jamais sur le texte.
 */
function kindOfNode(ast: MathNode): ObjectKind {
	const variables = new Set(getVariables(ast));
	if (variables.has('x')) return 'function';
	if (variables.has('n')) return 'sequence';
	return 'value';
}

/**
 * Garder un résultat sous un nom — décision D5, le geste « je tiens quelque
 * chose » de la recherche.
 *
 * Sans nom, l'atelier en propose un. Le type suit le contenu : un résultat en
 * `x` devient une **fonction**, donc traçable — c'est ce qui permet d'enchaîner
 * « je dérive » puis « je trace la dérivée ».
 */
export function promote(
	session: CalcSession,
	result: CalcResult,
	name?: string
): Created | Refused {
	const { atelier } = session;

	// ⚠️ **Seul un calcul se garde, et seulement par son ARBRE.**
	//
	// Redériver l'objet depuis la sortie texte donnait des objets faux avec un
	// message de SUCCÈS — mesuré le 2026-09-16 :
	//   • `.résoudre x^2-4=0` gardait « 0 », pas les racines ;
	//   • `.variations x^2-3x+1` créait une FONCTION traçable nommée
	//     « Expression : x^2-3x+1 », le mot lu comme un produit de lettres ;
	//   • `.aide` gardait « MathAST CAS - Commandes disponibles ».
	//
	// Une commande ne porte pas l'arbre de son résultat — celui qu'elle rend est
	// l'arbre de l'ENTRÉE. On refuse donc, plutôt que de deviner.
	if (result.kind !== 'calcul' || result.ast === undefined) {
		return {
			ok: false,
			message:
				result.kind === 'commande'
					? 'Le résultat d’une commande ne peut pas encore être gardé. Écris le calcul directement pour le garder.'
					: 'Il n’y a rien à garder dans cette ligne.'
		};
	}

	const kind = kindOfNode(result.ast);
	const definition = toCustom(result.ast);

	const chosen = name ?? nextName(kind, atelier.names);
	const rejection = validateName(chosen, atelier.names);
	if (rejection !== null) {
		return { ok: false, message: nameRejectionMessage(rejection, chosen) };
	}

	const created = atelier.create({ kind, name: chosen, definition });
	if (!created.ok) return created;
	syncEngine(atelier, session.engine);
	// « Garder… » suit la même règle que la frappe : une fonction ou une suite
	// gardée se voit tout de suite (décision de David, 2026-10-04)
	if (tracedOnCreation(kind)) atelier.setPlotted(chosen, true);
	return { ...created, object: atelier.get(chosen) ?? created.object };
}

/** Ce qui se trace : une fonction ou une suite — pas une valeur ni une liste. */
function tracedOnCreation(kind: ObjectKind): boolean {
	return kind === 'function' || kind === 'sequence';
}

// =============================================================================
// Les actions attachées aux objets (§6)
// =============================================================================

/** Ce que chaque action demande au moteur, à partir de l'expression substituée. */
const ACTION_COMMANDS: Readonly<Record<string, (expression: string) => string>> = {
	// Une fonction de l'atelier est en x : la variable est dite, pas devinée
	derive: (e) => `.diff ${e} ; x`,
	solve: (e) => `.solve ${e}=0`,
	variations: (e) => `.variations ${e}`
};

/**
 * Le tableau de variations d'une expression, et la dérivée qui l'accompagne —
 * ou `null`.
 *
 * ⚠️ Rien n'est recalculé ici : `computeVariations` trouve les sens, les points
 * critiques et les limites, et le pont les traduit. Aucun chemin ne jette : une
 * exception remonterait jusqu'à `desk.runFromPanel`, qui n'afficherait alors
 * AUCUNE ligne.
 *
 * ⚠️ **La dérivée voyage avec le tableau parce qu'elle est la seule chose qu'il
 * ne dit PAS.** Le tableau montre le SIGNE de f', jamais f' elle-même — et
 * c'est ce qu'on écrit au-dessus d'un tableau de variations. Tout le reste du
 * bloc texte du moteur (domaine, points critiques, signe, extremum, limites) y
 * figure déjà, en moins lisible. Relevé par David sur capture.
 *
 * @param expression - L'expression SUBSTITUÉE (§6 bis)
 * @param name - Le nom de l'objet, pour étiqueter les lignes `f'(x)` et `f(x)`
 */
function variationTableOf(
	expression: string,
	name: string
): { readonly table: VariationTableNode; readonly derivative: string } | null {
	try {
		const node = astOf(expression, 'text');
		if (node === null) return null;

		const variations = computeVariations(node, { variable: 'x' });
		const table = variationTableNode(variations, name);
		if (table === null) return null;

		// `tidy` : comme la carte f′ et « Dériver » (retour de David, `3 3 x^2`)
		return { table, derivative: `${name}'(x) = ${toLatex(tidyTerms(variations.derivative))}` };
	} catch {
		return null;
	}
}

/**
 * Lancer une action du panneau sur un objet.
 *
 * ⚠️ **L'expression est substituée avant l'appel** (§6 bis) : passer `f(x)` au
 * moteur rendait un résultat faux SANS erreur — `.variations f(x)` annonçait
 * « Points critiques : aucun » pour une parabole qui en a un. Depuis
 * fix/solve-facteur-commun, le moteur dit « non déterminés » quand il ne sait
 * pas résoudre f'(x) = 0 : la substitution reste nécessaire pour qu'il sache.
 *
 * @param actionId - L'identifiant de `actionsFor`, pas un libellé
 * @param name - L'objet sur lequel l'élève a cliqué
 * @param argument - Le nombre demandé, pour « image d'un nombre »
 */
export function runAction(
	session: CalcSession,
	actionId: string,
	name: string,
	argument?: string
): ActionOutcome {
	const { atelier, engine } = session;
	syncEngine(atelier, engine);

	const substituted = expressionOf(atelier, name);
	// Le message vient de l'objet : le panneau et l'action disent la même chose.
	if (!substituted.ok) return { ok: false, message: substituted.message };

	if (actionId === 'image') {
		const value = argument === undefined ? null : readNumber(argument);
		if (value === null) {
			return { ok: false, message: `« ${argument ?? ''} » n'est pas un nombre.` };
		}
		// Ici, citer le nom est SÛR et mesuré : `f(2)` rend `-1`. C'est le chemin
		// d'évaluation, pas une commande symbolique — la substitution du §6 bis ne
		// concerne que les secondes.
		const result = engine.execute(`${name}(${value})`);
		if (!result.success) {
			return { ok: false, message: `Impossible de calculer ${name}(${argument}).` };
		}
		const rendered = renderResult(result);
		return { ok: true, output: rendered.text, ...(rendered.latex && { latex: rendered.latex }) };
	}

	const build = ACTION_COMMANDS[actionId];
	if (build === undefined) {
		return { ok: false, message: `L'action « ${actionId} » n'est pas encore disponible.` };
	}

	const command = build(substituted.expression);
	const result = engine.execute(command);
	const rendered = renderResult(result, { fromCommand: true });

	// ⚠️ **Le bouton et la commande doivent dire la MÊME chose.** Depuis que
	// `.résoudre` passe par `pedagogical-solve`, l'élève qui TAPE reçoit le
	// raisonnement en français ; celui qui CLIQUE recevait encore le bloc de
	// terminal. Le même geste, deux résultats — la forme exacte du défaut que
	// `substituteNames` documente plus haut.
	//
	// On ne conditionne pas au succès du moteur : sur une inéquation il échoue
	// et ne rend rien, alors que les étapes, elles, existent.
	if (actionId === 'solve') {
		const solved = solveSteps(`${substituted.expression}=0`);
		if (solved !== null) {
			return { ok: true, output: rendered.text, latex: solved.answer, steps: solved.steps };
		}
		// Pas d'étapes : les solutions du moteur en LaTeX, comme `.résoudre`
		if (result.success && result.latex !== undefined) {
			return { ok: true, output: rendered.text, latex: result.latex };
		}
	}

	// ⚠️ Même histoire pour les variations : le moteur rendait « Derivee »,
	// « decroissante », « Signe de f'(x) » alignés à l'espace, sans un accent —
	// alors que `VariationTable.svelte` dessine le tableau depuis toujours.
	// ⚠️ « Dériver » rendait la notation d'un terminal : `d/dx(x^2*sin(x)) = …`,
	// avec un `:/` parasite sur les quotients et aucune règle nommée.
	if (actionId === 'derive') {
		const derived = deriveSteps(substituted.expression, name);
		if (derived !== null) {
			return { ok: true, output: rendered.text, latex: derived.answer, steps: derived.steps };
		}
	}

	if (actionId === 'variations') {
		const variations = variationTableOf(substituted.expression, name);
		if (variations !== null) {
			return {
				ok: true,
				output: rendered.text,
				latex: variations.derivative,
				table: variations.table
			};
		}
	}

	// Un refus que le moteur adresse à l'élève (`floor` : « la partie entière
	// n'est pas dérivable partout ») : le même que celui de `.dériver`
	if (!result.success && STUDENT_FACING_ERRORS.has(result.error?.code ?? '')) {
		return { ok: false, message: result.error?.message ?? 'Le calcul n’a pas abouti.' };
	}
	if (!result.success) {
		return { ok: false, message: rendered.text || 'Le calcul n’a pas abouti.' };
	}
	return { ok: true, output: rendered.text };
}
