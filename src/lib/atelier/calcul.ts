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
import { astOf, readNumber } from './parse';
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
import { deriveSteps } from './derive-steps';
import { simplifySteps } from './simplify-steps';
import { factorSteps } from './factor-steps';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { computeVariations } from '$lib/mathAST/variations';
import { toLatex } from '$lib/mathAST/latex-generator';
import {
	isVariableHint,
	splitVariableArgument,
	variableHintOf
} from '$lib/mathAST/cli/core/variable-argument';
import { tidyTerms } from './tidy-terms';
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

/** Les commandes qui calculent en x, sauf `; v` — et l'indiquent quand x manque. */
const VARIABLE_COMMANDS: ReadonlySet<string> = new Set([
	'diff',
	'solve',
	'integrate',
	'variations',
	'domain',
	'taylor'
]);

/** Codes d'erreur du moteur dont le message s'adresse à l'élève, en français. */
const STUDENT_FACING_ERRORS: ReadonlySet<string> = new Set(['AMBIGUOUS_VARIABLE', 'BARE_FUNCTION']);

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

	if (existing === undefined) {
		const rejection = validateName(name, atelier.names);
		if (rejection !== null) {
			return { kind: 'refus', message: nameRejectionMessage(rejection, name) };
		}
		const created = atelier.create(
			{ kind: kindOf(parameter, body), name, definition: body.trim() },
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

	const updated = atelier.update(name, body.trim(), provenance);
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

function substituteNames(session: CalcSession, argument: string): string {
	if (argument.trim() === '') return argument;

	let result = argument;
	for (const object of session.atelier.objects) {
		if (object.status !== 'ok') continue;
		const expression = expressionOf(session.atelier, object.name);
		if (!expression.ok) continue;

		// `f(x)` d'abord : sinon le `f` seul de `f(x)` serait remplacé, et il
		// resterait un `(x)` orphelin.
		const called = new RegExp(`\\b${object.name}\\s*\\(\\s*[xn]\\s*\\)`, 'g');
		const alone = new RegExp(`(?<![A-Za-z_])${object.name}(?![A-Za-z_0-9])`, 'g');
		result = result.replace(called, `(${expression.expression})`);
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
	const rawArgument = space === -1 ? '' : resolved.slice(space + 1).replace(/’/g, "'");
	const derived = derivedSequence(session, rawArgument);
	if (derived !== null) {
		return {
			kind: 'refus',
			message: `« ${derived} » est une suite : elle ne se dérive pas.`
		};
	}
	const argument = !rawArgument.includes("'")
		? substituteNames(session, rawArgument)
		: (expandCommandArgument(session.atelier, rawArgument) ??
			substituteNames(session, expandInput(session.atelier, rawArgument)));
	// ⚠️ **Certaines commandes ne vont PAS au moteur.** Il ne les connaît pas
	// et répondrait « Unknown command », en anglais. On sort donc ici, avant
	// `engine.execute` — et sans moteur derrière, il n'y a aucun repli : ce que
	// rend `runAtelierCommand` est tout ce que l'élève verra.
	if (ATELIER_ONLY_COMMANDS.has(known.name)) {
		return runAtelierCommand(known.name, input, argument);
	}

	// `.dériver f` : la cible tapée, sans sa variable explicite (`; t`) ni son
	// `(x)`. Une fonction de l'atelier est en x, même quand son expression n'en
	// contient pas : `f(x) = k` se dériverait sinon en k, et répondrait 1.
	const typedTarget = splitVariableArgument(typedArgument).expression;
	const diffTarget = /^(.+?)\s*(?:\(\s*x\s*\))?$/.exec(typedTarget)?.[1] ?? typedTarget;
	const derivesFunction = name === 'diff' && session.atelier.get(diffTarget)?.kind === 'function';
	const commandArgument =
		derivesFunction && splitVariableArgument(argument).variable === null
			? `${argument} ; x`
			: argument;
	const executed = space === -1 ? `.${known.name}` : `.${known.name} ${commandArgument}`;

	const result = engine.execute(executed);
	// x absent, aucune variable donnée : le moteur calcule en x et ajoute une
	// indication à sa sortie. Elle est montrée À PART (`note`) : une ligne dont
	// la réponse se compose en mathématiques n'affiche pas son texte.
	// Mêmes noms liés que le moteur (`.let a = 2`), mêmes bornes ôtées
	// (`.intégrer`), mêmes nombre de termes et point ôtés (`.taylor`)
	const hint = VARIABLE_COMMANDS.has(name)
		? variableHintOf(commandArgument, {
				bound: engine.getEvalState().bindings.keys(),
				integral: name === 'integrate',
				taylor: name === 'taylor'
			})
		: null;
	// `fromCommand` : pour une commande, `result.ast` porte l'ENTRÉE. Le rendre
	// afficherait « x^2 » là où `.dériver x^2` répond « 2x » (voir `render.ts`).
	const engineRendered = renderResult(result, { fromCommand: true });
	const rendered =
		hint === null
			? engineRendered
			: {
					...engineRendered,
					text: engineRendered.text
						.split('\n')
						.filter((line) => !isVariableHint(line))
						.join('\n')
						.trim()
				};
	const noted = hint === null ? {} : { note: hint };

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
		const notes = notesOf(hint, note);
		// Les étapes dérivent la même chose que le moteur, variable comprise
		const { expression, variable } = splitVariableArgument(commandArgument);
		const derived = deriveSteps(expression, undefined, variable ?? undefined);
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

	const solved = name === 'solve' ? solveSteps(argument) : null;
	// Pas de x, aucune variable donnée : résoudre « en x » n'a pas de sens, et
	// le moteur ne sait pas les inéquations (`.résoudre 2t+1<5` répondait « Je
	// n'ai pas su lire »). On le dit, avec l'indication (revue #888).
	if (name === 'solve' && solved === null && hint !== null) {
		const typed = splitVariableArgument(typedArgument).expression.trim();
		return {
			kind: 'refus',
			message: `Il n’y a pas de x dans « ${typed} » : rien à résoudre en x.`,
			note: hint
		};
	}
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

	// Le moteur a échoué SANS RIEN DIRE (erreur de lecture) : une ligne vide ne
	// dit rien à l'élève — mesuré, `.deriver )(` et `.resoudre )` (2026-10-05)
	if (!result.success && rendered.text.trim() === '') {
		return { kind: 'refus', message: UNREADABLE_COMMAND, ...noted };
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

	syncEngine(session.atelier, session.engine);

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

	// `f'(2)` doit valoir 1 : le moteur ne sait pas lier `f'`, l'atelier traduit.
	const result = session.engine.execute(expandInput(session.atelier, withTerms.text));
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

	if (!result.success) {
		return { ok: false, message: rendered.text || 'Le calcul n’a pas abouti.' };
	}
	return { ok: true, output: rendered.text };
}
