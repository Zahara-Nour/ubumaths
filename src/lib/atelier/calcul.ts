/**
 * Atelier — la saisie de la vue Calcul
 *
 * Un seul champ, comme dans `/cas` : ce que l'élève tape est une **définition**
 * (elle crée ou met à jour un objet), un **calcul** (il produit une ligne
 * d'historique), ou une **commande** (elle commence par un point).
 *
 * Spécification : `docs/archive/wip/atelier-vue-calcul-phase0.md` §2 et §4.
 *
 * @module atelier/calcul
 */

import type { Atelier, Created, Refused } from './atelier.svelte';
import type { AtelierObject, ObjectKind } from './types';
import { dependsOnMessage, isList, isQualitative, parametersOf } from './types';
import type { MathNode, RelationNode } from '$lib/mathAST/types';
import type { Provenance } from './parse';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import type { ReplExecutionResult } from '$lib/mathAST/cli/web/types';
import { displayUnitsInLatex } from '$lib/mathAST/units/display';
import { getVariables, substitute } from '$lib/mathAST/eval/substitute';
import { numericNode } from '$lib/mathAST/common/numeric';
import {
	citedReciprocalInterval,
	citesReciprocal,
	reciprocalCommand,
	reciprocalDefinitionRefusal,
	reciprocalRefusalIn,
	reciprocalResult,
	withReciprocalNotation
} from './reciprocal';
import {
	validateName,
	nameRejectionMessage,
	nextName,
	derivativeOf,
	displayName,
	reciprocalOf
} from './names';
import {
	astOf,
	parseDefinition,
	pointCoordinatesOf,
	readingMode,
	readNumber,
	readListValue,
	individualEntries,
	withPiCommand,
	mixedNotationMessage,
	withLatexFunctionNames
} from './parse';
import {
	INTERNAL_LETTER,
	internalDefinition,
	letterRejection,
	renameVariable,
	typedLetterOf
} from './letter';
import {
	syncEngine,
	expressionOf,
	expandInput,
	expandCommandArgument,
	substitutedAstOf,
	termsOf
} from './engine';
import {
	chosenDomainAnswer,
	citedIntervalDomain,
	composedMessage,
	intervalDomainOf,
	intervalText,
	ONLY_FUNCTIONS,
	outsideIntervalMessage,
	outsideIntervalRefusal,
	segmentOutsideRefusal,
	splitInterval,
	valueOutsideRefusal
} from './interval';
import {
	containsValue,
	difference as domainDifference,
	intersect,
	isEmpty,
	isUniversal
} from '$lib/mathAST/domain/algebra';
import { closedInterval, intervalSet } from '$lib/mathAST/domain/factory';
import { expandExcludedPoints } from '$lib/mathAST/domain/validation/compare-domains';
import { add, divide, number, opposite } from '$lib/mathAST/factory';
import { compile } from '$lib/mathAST/eval/compile';
import { computeDomain } from '$lib/mathAST/domain/compute';
import { solve as solveRelation } from '$lib/mathAST/solve';
import { formatInterval } from '$lib/mathAST/domain/format';
import type { Domain } from '$lib/mathAST/domain/types';
import { parseStudentDomain } from '$lib/mathAST/domain/validation/parse-student-domain';
import { UNREADABLE_STUDY_DOMAIN } from '$lib/mathAST/domain/study';
import { MAX_SEQUENCE_TERMS } from '$lib/grapheur/sequence';
import { toCustom } from '$lib/mathAST/custom-generator';
import { simplify } from '$lib/mathAST/simplify/simplify';
import { getPolynomialDegree } from '$lib/mathAST/analysis/expression-classify';
import { differentiateN } from '$lib/mathAST/differentiation/differentiate';
import { findNodes, mapNode } from '$lib/mathAST/transforms';
import { parse as parseUnit } from '$lib/mathAST/units/parser';
import {
	resolveCommand,
	suggestFor,
	commandCatalog,
	ATELIER_ONLY_COMMANDS,
	plain
} from './commands';
import { renderResult } from './render';
import {
	POINT_TWO,
	POINT_UNIT,
	citesXOrY,
	figureCitedMessage,
	hasRelation,
	looksLikePoint,
	splitCoordinates
} from './geometry';
import { DEV_HELP_ARGUMENT, studentHelpText } from './help';
import { frequencyCommand, samplesCommand, simulateCommand } from './simulate';
import { tabulateCommand } from './tabulate';
import { gridFunctionCalledIn, gridFunctionInCalcul } from './grid-functions';
import { PI_IN_LETTERS, PI_IN_LETTERS_MESSAGE } from './names';
import { crossCommand } from './cross';
import { compareCommand } from './compare';
import { binomialCommand } from './binomial';
import {
	exponentialCommand,
	geometricCommand,
	lawEvent,
	normalCommand,
	uniformCommand
} from './law-commands';
import { filterCommand } from './filter';
import type { StatChartScene } from '$lib/ubumark/utils/stat-chart-scene';
import { solveSteps, type SolvedSteps } from './solve-steps';
import { readNaturalQuantities, singleLetterHint, type NaturalReading } from './natural-quantities';
import { quantityProblem } from '$lib/mathAST/cli/quantities';
import { EQUATION_UNSOLVED, INEQUALITY_UNSOLVED } from '$lib/mathAST/cli/commands/solve.command';
import { VALUE_FORBIDDEN, typedValueLatex } from '$lib/mathAST/cli/commands/eval.command';
import { isBoolean, isNumber, isOpposite, isRelation, isUnit } from '$lib/mathAST/guards';
import { deriveSteps } from './derive-steps';
import { variationsRendering } from './variations-steps';
import { simplifySteps } from './simplify-steps';
import { factorSteps } from './factor-steps';
import { expandExpression, type ExpandMode } from './expand';
import { integrateRefusalSteps, integrateSteps } from './integrate-steps';
import { evaluateSteps } from './evaluate-steps';
import { domainLine } from './domain-steps';
import { limitCommand } from './limit';
import { collapseLnAbs } from '$lib/mathAST/pedagogical-integration/latex';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { toLatex } from '$lib/mathAST/latex-generator';
import {
	DEFAULT_VARIABLE,
	bareFunctionRefusal,
	guessedVariable,
	isKeywordCommand,
	readCommandArguments,
	writeCommandArguments,
	type CommandArguments
} from '$lib/mathAST/cli/core/variable-argument';
import { parse as parseCommandExpression } from '$lib/mathAST/cli/core/pipeline';
import {
	findUnknownFunctionCall,
	unknownFunctionMessage
} from '$lib/mathAST/parser/custom/tokenizer';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';
import {
	decimalCommaDeep,
	decimalCommaInput,
	decimalCommaLatex,
	decimalCommaProse,
	decimalCommaStep,
	decimalCommaText,
	commaRefusal,
	coupleOrSetRefusal
} from './decimal-comma';
import { listCitedMessage } from './list-cited';
import { cellCitedIn, cellInCalculMessage } from './grid';
import { functionsListing, valuesListing } from './listing';
import { commonRows, droppedNote, noCommonRowsMessage, valuesOn } from './pairs';

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

/**
 * L'autre écriture d'une réponse, montrée par le bouton de la ligne : la
 * valeur approchée d'un résultat exact, ou l'exacte d'un calcul fait en mode
 * décimal (phase 0 `atelier-cas-phase0.md`, PR 2). Affichage seul : ni l'export,
 * ni le rejeu, ni « Garder » ne la lisent.
 */
export interface Alternative {
	/** Ce que dit le bouton : ce qu'il va montrer. */
	readonly label: 'Valeur approchée' | 'Valeur exacte';
	readonly latex: string;
}

/** Ce qu'une saisie a produit. */
export type CalcResult =
	| { readonly kind: 'vide' }
	| {
			readonly kind: 'definition';
			readonly name: string;
			readonly object: AtelierObject;
			/** Une aide sur l'écriture (`5 m` avec une valeur `m`, lot C des grandeurs) */
			readonly note?: string;
	  }
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
			readonly alternative?: Alternative;
			/** Une aide sur l'écriture (`5km` collé, lot C des grandeurs) */
			readonly note?: string;
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
			/**
			 * Les mêmes étapes en version résumée (interrupteur « Résumé /
			 * Détaillé »). Absente quand elle ne dit rien de moins, et pour
			 * `.variations`, qui a sa propre rédaction.
			 */
			readonly summary?: readonly RenderedStep[];
			/** Le graphique d'une simulation, dessiné sous la ligne (Q80) */
			readonly chart?: StatChartScene;
			/** Le tableau de variations de `.variations`, quand il se dessine */
			readonly table?: VariationTableNode;
			/**
			 * Une indication affichée AVEC la réponse, qu'elle soit en
			 * mathématiques ou en texte : `.dériver t^2` calcule en x et le dit
			 * (« Calcul par rapport à x… », décision de David, 2026-10-06).
			 */
			readonly note?: string;
			/** Les solutions de `.résoudre` en valeurs approchées */
			readonly alternative?: Alternative;
	  }
	| {
			readonly kind: 'refus';
			readonly message: string;
			/** Le message cite des formules en `$…$`, composées par la vue (`.réciproque`) */
			readonly formulas?: true;
			/** Une indication montrée avec le refus (`.résoudre 2t+1<5` : « écris « ; t » ») */
			readonly note?: string;
			/**
			 * Les étapes qui expliquent le refus, sous « Comment ? ». Seulement
			 * `.intégrer` avec un pôle dans [a ; b], quand les étapes concordent
			 * (`integrateRefusalSteps`) ; absentes pour tout autre refus.
			 */
			readonly steps?: readonly RenderedStep[];
			/** Les mêmes étapes en version résumée, comme pour une commande */
			readonly summary?: readonly RenderedStep[];
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
			/** Les mêmes étapes en version résumée, comme `CalcResult` (commande) */
			readonly summary?: readonly RenderedStep[];
			/**
			 * Le tableau de variations, quand l'action en produit un.
			 *
			 * Absent = repli : la ligne garde le bloc texte du moteur.
			 */
			readonly table?: VariationTableNode;
			/** Les solutions de « Résoudre » en valeurs approchées, comme `.résoudre` */
			readonly alternative?: Alternative;
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
/**
 * Les commandes qui lisent des SÉRIES (`.stats 12 ; 15 ; 9`) : les seules où
 * proposer `12 ; 15 ; 9` à la place de `12,15,9` donne une saisie qui passe.
 */
const SERIES_COMMANDS: ReadonlySet<string> = new Set(['stats', 'linreg']);

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
	'DOMAIN_UNRESOLVED',
	// `5[m]+3[s]`, `.convertir kg` après une longueur (phase 0 grandeurs, lot A)
	'QUANTITY_ERROR',
	// `.évaluer \frac{x+1}{x-1} en x=1` : « $x = 1$ est une valeur interdite… »
	VALUE_FORBIDDEN
]);

// `PI_IN_LETTERS` : la règle, partagée avec la grille, vit dans `names.ts`

/** Un comparateur d'événement : `⩽ ⩾ ≤ ≥ < > =`, `<=`, `>=`, `\leqslant`, `\leq`… */
const EVENT_COMPARATOR = String.raw`(?:<=|>=|[⩽⩾≤≥<>=]|\\(?:leqslant|geqslant|leq|geq|le|ge|lt|gt))`;

/**
 * La probabilité d'un événement tapée seule : `P(X ⩽ 3)`, `P(2 ⩽ X ⩽ 5)`,
 * `P(X\leqslant 3)`, `P(|Y| ⩽ 1,96)` — et aussi `P(x ⩽ 3)` ou `P(2X ⩽ 3)`,
 * que `lawEvent` refuse en français (avant : « … écrit après un facteur »).
 * Une comparaison DANS les parenthèses de `P(…)` : `P(x)<3` n'en est pas une.
 */
const EVENT_PROBABILITY = new RegExp(
	String.raw`^P\s*(?:\\left)?\((?=[^()]*${EVENT_COMPARATOR})[^()]*\)\s*$`
);

/**
 * L'atelier RETIENT la loi d'une variable aléatoire (décision de David,
 * 2026-10-09) : `P(X ⩽ 3)` tapé seul se calcule sur la loi posée par
 * `.binomiale X 10 0,3` (`lawEvent`). Avant, un refus renvoyait à la ligne de
 * la loi ; sans lui, `P(X ⩽ 3)` répondait « Nombre « 3 » écrit après un
 * facteur… » et `P(X\leqslant 3)` se recopiait tel quel.
 */
function eventProbability(atelier: Atelier, input: string): CalcResult {
	const outcome = lawEvent(atelier, input);
	return outcome.ok
		? { kind: 'commande', input, output: outcome.text }
		: { kind: 'refus', message: outcome.message };
}

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
	if (isNumberList(body)) return 'list';

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
 * `L = sin; cos; ln` : un nom sans paramètre, puis des entrées séparées par
 * « ; » — la forme d'une liste, de nombres ou de mots. La carte n'y cherche
 * pas de fonction sans parenthèses (`parseDefinition` : une liste sort avant).
 */
function isSemicolonList(input: string): boolean {
	const definition = DEFINITION.exec(input);
	return definition !== null && definition[2] === undefined && definition[3].includes(';');
}

/**
 * `L = 1,5 ; 2 ; 3,5` : au moins deux nombres (ou fractions d'entiers), et
 * RIEN d'autre, séparés par « ; » (règle de #983 : la virgule entre deux
 * chiffres est décimale). Une seule valeur reste un nombre (`a = 1,5`), et un
 * membre de droite qui contient autre chose qu'un nombre n'est jamais une liste.
 */
function isNumberList(body: string): boolean {
	// Le découpage de la carte (`individualEntries`) : un « ; » final ne compte
	// pas, un trou (`1 ; ; 2`) ou un mot fait que ce n'est pas une liste
	const read = individualEntries(body, false);
	return 'entries' in read && read.entries.length >= 2;
}

/** Ce qu'on dit d'un objet existant, pour refuser d'en faire une liste. */
const KIND_WORDS: Readonly<Record<Exclude<ObjectKind, 'list'>, string>> = {
	value: 'un nombre : supprime-le',
	function: 'une fonction : supprime-la',
	sequence: 'une suite : supprime-la',
	point: 'un point : supprime-le',
	curve: 'une courbe : supprime-la'
};

/** Le type d'un objet, pour refuser de le changer (V62) : « « d » est déjà une valeur. » */
const KIND_NAMES: Readonly<Record<ObjectKind, string>> = {
	value: 'une valeur',
	function: 'une fonction',
	sequence: 'une suite',
	list: 'une liste',
	point: 'un point',
	curve: 'une courbe'
};

function kindKeptRefusal(name: string, kind: ObjectKind): CalcResult {
	return { kind: 'refus', message: `« ${name} » est déjà ${KIND_NAMES[kind]}.` };
}

// =============================================================================
// Géométrie (v2, lot 1) : points et courbes
// =============================================================================

/**
 * `d : y = 3x − 2` : un nom, « : » (`\colon` en LaTeX), puis le reste — qui
 * n'est une courbe que s'il porte une relation (`a : b` reste la division, C15).
 */
const CURVE_DEFINITION = /^\s*([A-Za-z](?:_\d+)?)\s*(?::|\\colon)\s*(.+)$/s;

/**
 * Créer — ou redéfinir — une courbe tapée dans Calcul (C1-C15), ou `null` si la
 * saisie n'en a pas la forme (elle suit alors le chemin d'un calcul).
 *
 * ⚠️ Un refus de forme (C8-C11) ne crée rien : l'élève corrige sa ligne.
 */
function defineCurve(
	session: CalcSession,
	input: string,
	provenance: Provenance
): CalcResult | null {
	const match = CURVE_DEFINITION.exec(input);
	if (match === null) return null;
	const [, name, typedBody] = match;
	const body = typedBody.trim();
	if (!hasRelation(body)) return null;
	const { atelier } = session;
	const existing = atelier.get(name);
	const cites = equationCitesXOrY(atelier, body);
	if (existing !== undefined && existing.kind !== 'curve') {
		// `a : b = 2` avec deux valeurs reste une comparaison (C15) ; `d : y = 3x`
		// sur une valeur d ne la change pas en courbe (C12, V62)
		return cites ? kindKeptRefusal(name, existing.kind) : null;
	}
	// `x : 2 = 4` : un nom réservé, sans x ni y — un calcul, comme avant la géométrie
	if (!cites && validateName(name, []) === 'reserved') return null;
	const rejection = validateName(
		name,
		atelier.names.filter((n) => n !== name)
	);
	if (rejection !== null) {
		return { kind: 'refus', message: nameRejectionMessage(rejection, name) };
	}
	// Une courbe ne se restreint pas (seule une fonction se définit sur un intervalle)
	if (splitInterval(body, readingMode(provenance)).written !== null) {
		return { kind: 'refus', message: ONLY_FUNCTIONS };
	}
	const read = parseDefinition('curve', body, provenance, atelier.functionNames);
	if (read.error !== undefined) return { kind: 'refus', message: read.error };
	const done =
		existing === undefined
			? atelier.create({ kind: 'curve', name, definition: body }, provenance)
			: atelier.update(name, body, provenance);
	if (!done.ok) return { kind: 'refus', message: done.message };
	return { kind: 'definition', name, object: atelier.get(name) ?? done.object };
}

/**
 * Le corps cite-t-il x ou y ? Lu sur l'ARBRE quand il se lit (`2xy`, `axy`),
 * sinon dans le texte (`y = 2x = 3`, que le parseur maison lit d'ailleurs).
 */
function equationCitesXOrY(atelier: Atelier, body: string): boolean {
	const ast = astOf(body, 'text', atelier.functionNames);
	if (ast === null) return citesXOrY(body);
	const variables = getVariables(ast);
	return variables.has('x') || variables.has('y');
}

/**
 * Créer — ou redéfinir — un point tapé dans Calcul : `A = (1 ; 2)` (G3, P1-P8).
 *
 * Les refus de forme (P6, P7) et l'unité (P8) ne créent rien ; une coordonnée
 * illisible crée le point en erreur, comme toute définition (§2 E1).
 */
function definePoint(
	session: CalcSession,
	name: string,
	typedBody: string,
	provenance: Provenance
): CalcResult {
	const { atelier } = session;
	const body = typedBody.trim();
	const existing = atelier.get(name);
	if (existing !== undefined && existing.kind !== 'point') {
		return kindKeptRefusal(name, existing.kind);
	}
	const split = splitCoordinates(body);
	if (!split.ok) {
		// P7 : trois nombres entre parenthèses, c'est peut-être une liste mal écrite
		const list = bracketedListRefusal(name, body);
		const message =
			split.message === POINT_TWO && list !== null ? `${POINT_TWO} ${list}` : split.message;
		return { kind: 'refus', message };
	}
	if (parseDefinition('point', body, provenance, atelier.functionNames).error === POINT_UNIT) {
		return { kind: 'refus', message: POINT_UNIT };
	}
	if (existing === undefined) {
		const rejection = validateName(name, atelier.names);
		if (rejection !== null) {
			return { kind: 'refus', message: nameRejectionMessage(rejection, name) };
		}
	}
	const done =
		existing === undefined
			? atelier.create({ kind: 'point', name, definition: body }, provenance)
			: atelier.update(name, body, provenance);
	if (!done.ok) return { kind: 'refus', message: done.message };
	return { kind: 'definition', name, object: atelier.get(name) ?? done.object };
}

/** x écrit comme une lettre seule (pas celui de `max`). */
const CITES_X = /(?<![A-Za-z\\])x(?![A-Za-z])/;

/**
 * Q1 (a) : `y = …` sans nom de courbe. `y` est réservé (G5) : le refus propose
 * les deux écritures, avec des noms LIBRES et la saisie de l'élève.
 */
function reservedYDefinition(atelier: Atelier, typedBody: string): string {
	const body = typedBody.trim();
	const curveName = nextName('curve', atelier.names);
	const ast = astOf(body, 'text', atelier.functionNames);
	const degree = ast === null ? null : getPolynomialDegree(ast, 'x');
	const shape = degree !== null && degree <= 1 ? 'une droite' : 'une courbe';
	const asCurve = `pour ${shape}, nomme-la : ${curveName} : y = ${body}.`;
	if (CITES_X.test(body)) {
		return `Pour une fonction, écris ${nextName('function', atelier.names)}(x) = ${body} ; ${asCurve}`;
	}
	return `« y » est réservé aux équations. Pour une valeur, choisis une autre lettre : ${nextName('value', atelier.names)} = ${body} ; ${asCurve}`;
}

/** `A(1 ; 2)` : la notation des manuels, qui n'est pas acceptée au lot 1 (G3, P5). */
const POINT_CALL = /^\s*([A-Za-z](?:_\d+)?)\s*\(([^()]*;[^()]*)\)\s*$/;

function pointCallRefusal(atelier: Atelier, input: string): string | null {
	const match = POINT_CALL.exec(input);
	if (match === null) return null;
	const called = atelier.get(match[1]);
	if (called?.kind === 'function' || called?.kind === 'sequence') return null;
	return `Pour définir un point, écris ${match[1]} = (${match[2].trim()}).`;
}

/**
 * Une ligne qui nomme un point ou une courbe : `A` répond `A(1 ; 2)` (P4), `d`
 * répond son équation ; un calcul qui en cite un est refusé (P9). `null` sinon.
 */
function figureLine(session: CalcSession, input: string): CalcResult | null {
	const { atelier } = session;
	const object = atelier.get(input.trim());
	if (object !== undefined && (object.kind === 'point' || object.kind === 'curve')) {
		if (object.status !== 'ok') {
			return {
				kind: 'refus',
				message: object.message ?? `« ${object.name} » n’a pas encore de définition.`
			};
		}
		return object.kind === 'point' ? pointLine(session, object) : curveLine(atelier, object);
	}
	const ast = astOf(input, 'text', atelier.functionNames);
	if (ast === null) return null;
	const cited = figureCitedMessage(atelier.objects, getVariables(ast));
	return cited === null ? null : { kind: 'refus', message: cited };
}

/** `A(1 ; 2)` : chaque coordonnée calculée comme une ligne de Calcul, exacte d'abord (P3). */
function pointLine(session: CalcSession, point: AtelierObject): CalcResult {
	const shown = (pointCoordinatesOf(point.definition) ?? []).map((coordinate) =>
		computeInput(session, coordinate, 'text')
	);
	const [x, y] = shown;
	if (x?.kind !== 'calcul' || y?.kind !== 'calcul') {
		const failed = shown.find((line) => line.kind === 'refus');
		return {
			kind: 'refus',
			message:
				failed?.kind === 'refus'
					? failed.message
					: `Les coordonnées de « ${point.name} » ne se calculent pas.`
		};
	}
	return {
		kind: 'calcul',
		input: point.name,
		output: `${point.name}(${x.output} ; ${y.output})`,
		...(x.latex !== undefined &&
			y.latex !== undefined && {
				latex: `${latexName(point.name)}\\left(${x.latex};${y.latex}\\right)`
			})
	};
}

/** `d : y = 3x − 2` : l'équation telle qu'écrite (C7), jamais réécrite. */
function curveLine(atelier: Atelier, curve: AtelierObject): CalcResult {
	const ast = astOf(curve.definition, curve.provenance, atelier.functionNames);
	return {
		kind: 'calcul',
		input: curve.name,
		output: `${curve.name} : ${curve.definition}`,
		...(ast !== null && { latex: `${latexName(curve.name)} : ${toLatex(ast)}` })
	};
}

/**
 * `M = L`, `2L + 1` : une liste lue comme un nombre — la règle des cartes
 * (`listCitedMessage`, la même détection).
 */
function listCitedAsNumber(atelier: Atelier, text: string): string | null {
	const ast = astOf(text, 'text', atelier.functionNames);
	if (ast === null) return null;
	return listCitedMessage(atelier.objects, getVariables(ast));
}

/**
 * `L = 1,2,3` ou `L = 12, 15, 9` : l'ancienne écriture d'une liste, refusée en
 * montrant la forme à retaper (règle de #983) — jamais 1,2 et 3 devinés.
 *
 * Même test que la carte (`commaUsedAsSeparator`) : un segment n'est fautif que
 * s'il ne se lit pas comme un nombre et que ses morceaux sont tous des nombres,
 * ou tous des fractions (`1,5/2` ne se corrige pas en « 1 ; 5/2 »).
 */
function commaListRefusal(name: string, body: string): string | null {
	if (/\p{L}/u.test(body) || !body.includes(',')) return null;
	const entries: string[] = [];
	let corrected = false;
	for (const segment of body.split(';').map((part) => part.trim())) {
		if (readListValue(segment) !== null) {
			entries.push(segment);
			continue;
		}
		const pieces = segment.split(',').map((piece) => piece.trim());
		const readable = (piece: string) => piece !== '' && readListValue(piece) !== null;
		const allNumbers = pieces.every((piece) => !piece.includes('/') && readable(piece));
		const allFractions = pieces.every((piece) => piece.includes('/') && readable(piece));
		if (pieces.length < 2 || !(allNumbers || allFractions)) return null;
		entries.push(...pieces);
		corrected = true;
	}
	return corrected
		? `Pour séparer des valeurs, utilise « ; » : ${name} = ${entries.join(' ; ')}`
		: null;
}

/**
 * `L = (1 ; 2 ; 3)` : trois valeurs ou plus entre parenthèses, c'est une liste
 * mal écrite, pas un couple — on montre la forme qui la crée.
 */
function bracketedListRefusal(name: string, body: string): string | null {
	const inner = /^\s*\((.*)\)\s*$/s.exec(body);
	if (inner === null) return null;
	const read = individualEntries(inner[1], false);
	if (!('entries' in read) || read.entries.length < 3) return null;
	return `Pour créer une liste, écris les valeurs sans parenthèses : ${name} = ${read.entries.join(' ; ')}`;
}

/**
 * Créer ou mettre à jour l'objet qu'une définition décrit.
 *
 * ⚠️ Une définition qu'on ne sait pas lire crée quand même l'objet (§2 E1) :
 * il porte son erreur, et l'élève voit son travail plutôt qu'un refus sec.
 */
/**
 * Une valeur ARRONDIE (mode décimal) s'écrit avec `≈` à l'écran comme dans le
 * texte : `≈ 0,7071` (décision Q3 de David, la règle du bouton ≈).
 */
function approximatedLatex(result: ReplExecutionResult, latex: string): string {
	return result.success && result.output.startsWith('≈ ') ? `\\approx ${latex}` : latex;
}

/** Le refus qui parle d'un nombre sans unité : c'est là qu'une lettre lue comme unité est en cause. */
const UNITLESS = 'un nombre sans unité';

/**
 * Une lettre lue comme unité (`3 t`, lot C des grandeurs) qui rend la saisie
 * impossible : mêlée à une variable libre (`3 a + 2 b`), ou dans une somme
 * avec un nombre (`3 t + 2`). Le refus, avec l'aide « pour 3 × t, écris 3t »
 * seulement quand la lettre en est la cause (revue : `5 kg + 3 m` l'affichait).
 */
function naturalReadingRefusal(atelier: Atelier, reading: NaturalReading): CalcResult | null {
	if (reading.singleLetters.length === 0) return null;
	const ast = astOf(reading.text, 'url', atelier.functionNames);
	if (ast === null) return null;
	const hint = singleLetterHint(reading.singleLetters);
	const free = [...getVariables(ast)].filter((v) => !atelier.names.includes(v));
	if (free.length > 0) {
		return {
			kind: 'refus',
			message: 'Une grandeur ne se combine pas avec une lettre.',
			...notesOf(hint)
		};
	}
	const problem = quantityProblem(ast);
	if (problem === null) return null;
	return { kind: 'refus', message: problem, ...notesOf(problem.includes(UNITLESS) ? hint : null) };
}

/**
 * @param interval - L'ensemble écrit après « sur » (`f(x) = x^2 sur [0;+∞[`),
 *   ou `null` : une définition retapée sans « sur » retire l'intervalle (I6).
 */
function defineObject(
	session: CalcSession,
	name: string,
	parameter: string | undefined,
	typedBody: string,
	provenance: Provenance,
	interval: string | null = null
): CalcResult {
	const { atelier } = session;
	const existing = atelier.get(name);
	let body = typedBody;

	// Une VALEUR tapée dans Calcul s'écrit naturellement : `d = 5 km` (lot C des
	// grandeurs) — jamais une fonction ni une suite, où une lettre est une variable
	let notes: readonly string[] = [];
	if (
		parameter === undefined &&
		provenance === 'text' &&
		kindOf(undefined, typedBody) === 'value'
	) {
		const reading = readNaturalQuantities(
			body,
			atelier.names.filter((n) => n !== name)
		);
		const refused = naturalReadingRefusal(atelier, reading);
		if (refused !== null) return refused;
		body = reading.text;
		notes = reading.notes;
	}

	// Le type rangé ne change pas (règle de l'atelier) : une liste tapée sur le
	// nom d'un autre objet le laissait en erreur, sans un mot (revue)
	if (existing !== undefined && existing.kind !== 'list' && kindOf(parameter, body) === 'list') {
		return {
			kind: 'refus',
			message: `« ${name} » est déjà ${KIND_WORDS[existing.kind]} ou choisis un autre nom pour créer une liste.`
		};
	}
	const citedList = listCitedAsNumber(atelier, body);
	if (citedList !== null) return { kind: 'refus', message: citedList };

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
			{
				kind: kindOf(parameter, body),
				name,
				definition: stored,
				...(letter && { letter }),
				...(interval !== null && { interval })
			},
			provenance
		);
		if (!created.ok) return { kind: 'refus', message: created.message };
		// Ce qui se trace (fonction, suite) et qu'on CRÉE dans Calcul est tracé
		// d'office (décisions de David) : on le définit pour le voir. Redéfini, il
		// garde son état — retiré du graphique, il ne revient pas en douce.
		if (tracedOnCreation(created.object.kind)) atelier.setPlotted(name, true);
		// Relu APRÈS le tracé : l'objet rendu doit dire qu'il est tracé (revue)
		return {
			kind: 'definition',
			name,
			object: atelier.get(name) ?? created.object,
			...notesOf(...notes)
		};
	}

	// Seule une fonction a une lettre : `u(n) = …` ne la touche pas
	const updated = atelier.update(
		name,
		stored,
		provenance,
		existing.kind === 'function' ? letter : undefined,
		existing.kind === 'function' ? interval : undefined
	);
	if (!updated.ok) return { kind: 'refus', message: updated.message };
	return { kind: 'definition', name, object: updated.object, ...notesOf(...notes) };
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
function replaceCalls(
	session: CalcSession,
	text: string,
	name: string,
	compose: (call: string) => string | null = (call) => expandCommandArgument(session.atelier, call)
): string | null {
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
		const composed = compose(call);
		if (composed === null) return null;
		result += `${text.slice(cursor, match.index)}(${composed})`;
		cursor = end + 1;
		start.lastIndex = cursor;
	}
	return result + text.slice(cursor);
}

/**
 * Les appels des fonctions `names` dans un arbre, remplacés par leur
 * expression, x remplacé par l'argument — les paramètres restent des lettres.
 *
 * ⚠️ De l'INTÉRIEUR vers l'extérieur (`mapNode` est ascendant) : l'argument
 * est déjà développé quand l'appel qui le contient l'est — `f(f(x))` donne
 * `a(ax)`, et non `a f(x)`. Puis UNE seule passe de `substitute` : itéré, x
 * remplacé par `2x` l'était dix fois (`f(2x)` → 1024a).
 *
 * `reduce` : chaque appel remplacé est réduit (`simplify`) — la ligne de
 * calcul, que le moteur rend telle quelle dès qu'une lettre y reste.
 * `divisionByZero` : un dénominateur nul APRÈS la substitution (`a/x` en 0),
 * que `simplify` aurait écrit `a/0` sans rien dire.
 */
function expandedCalls(
	session: CalcSession,
	ast: MathNode,
	names: ReadonlySet<string>,
	reduce: boolean
): { readonly ast: MathNode; readonly cited: readonly string[]; readonly divisionByZero: boolean } {
	const cited: string[] = [];
	let divisionByZero = false;
	const expanded = mapNode(ast, (node) => {
		if (
			node.type !== 'function' ||
			!names.has(node.name) ||
			node.args.length !== 1 ||
			node.isInverse === true ||
			node.power !== undefined
		) {
			return node;
		}
		let value: MathNode;
		if (node.derivativeOrder !== undefined) {
			// `f'(2)` : la dérivée développée par `expandInput`, puis réduite
			// (sans quoi `2 a * 2` restait affiché)
			if (!reduce) return node;
			const derived = astOf(expandInput(session.atelier, toCustom(node)), 'url');
			if (derived === null) return node;
			value = derived;
		} else {
			const body = substitutedAstOf(session.atelier, node.name, { forDerivation: true });
			if (!body.ok) return node;
			value = substitute(body.ast, { [INTERNAL_LETTER]: node.args[0] }, { maxIterations: 1 });
		}
		if (hasZeroDenominator(value)) divisionByZero = true;
		if (!cited.includes(node.name)) cited.push(node.name);
		return reduce ? simplify(value).result : value;
	});
	return { ast: expanded, cited, divisionByZero };
}

/** Un dénominateur qui vaut 0, une fois réduit (`a/(1-1)`). */
function hasZeroDenominator(ast: MathNode): boolean {
	let found = false;
	mapNode(ast, (node) => {
		if (!found && node.type === 'division') {
			const denominator = simplify(node.denominator).result;
			found = isNumber(denominator) && Number(denominator.value) === 0;
		}
		return node;
	});
	return found;
}

/**
 * L'appel `f(2)` d'une fonction en attente d'un paramètre (`f(x) = a x`) :
 * son expression, x remplacé par l'argument — `a` reste une lettre, que
 * `.évaluer` reçoit après `en`. Les appels imbriqués des fonctions `names`
 * aussi (`f(f(x))`). `null` si l'appel ne se lit pas.
 */
function pendingCall(
	session: CalcSession,
	names: ReadonlySet<string>,
	call: string
): string | null {
	const node = astOf(call, 'url', session.atelier.functionNames);
	if (node?.type !== 'function' || node.args.length !== 1) return null;
	const expanded = expandedCalls(session, node, names, false);
	return expanded.cited.length === 0 ? null : toCustom(expanded.ast);
}

/** Une fonction de l'atelier, citée (`f`, `f(2)`, `f'`) dans une saisie. */
function citesName(typed: string, name: string): boolean {
	return new RegExp(`(?<![A-Za-z_\\\\])${name}(?![A-Za-z_0-9])`).test(typed);
}

/**
 * Le refus d'une saisie qui cite un objet EN ERREUR (V58), ou `null`.
 *
 * Le moteur ne lie pas un objet en erreur (`syncEngine`) : il prenait son nom
 * pour une lettre, et `.dériver f` répondait `d/dx(f) = 0` sur
 * `f(x) = f(x)+1`. Un seul garde, pour toute commande et toute ligne de
 * calcul ; un objet qui dépend d'un objet en erreur l'est lui-même (le
 * recalcul de l'atelier le propage), il est donc refusé aussi.
 *
 * Deux refus : « mal définie… corrige sa définition » quand c'est SA ligne
 * qui est fautive (`isMiswritten`) ; sinon « g : » + le message de la carte
 * (`Dépend de « f »…`, f⁻¹ impossible…), qui dit quoi corriger.
 *
 * Exceptions :
 * - les cartes `f′` et `f⁻¹` suivent f : leurs refus disent pourquoi la
 *   dérivée ou la réciproque manque (`derivativeOfUnusable`,
 *   `reciprocalRefusalIn`), pas que l'élève a mal écrit une ligne ;
 * - les listes : ce sont des données, que les simulations lisent par nom.
 */
function brokenObjectRefusal(atelier: Atelier, typed: string): string | null {
	for (const object of atelier.objects) {
		if (object.status !== 'error' || object.kind === 'list') continue;
		if (derivativeOf(object.name) !== null || reciprocalOf(object.name) !== null) continue;
		if (!citesName(typed, object.name)) continue;
		// Une erreur qui ne vient pas de sa ligne (`Dépend de « f »…`, f⁻¹
		// impossible, ce que l'atelier ne sait pas encore faire) : la carte dit
		// quoi corriger, et ce n'est pas sa définition
		if (object.message !== undefined && !atelier.isMiswritten(object.name)) {
			return `${object.name} : ${object.message}`;
		}
		const feminine = object.kind === 'function' || object.kind === 'sequence';
		return `« ${object.name} » est mal défini${feminine ? 'e' : ''} (sa ligne est en erreur) : corrige sa définition d'abord.`;
	}
	return null;
}

/** La saisie cite-t-elle une fonction à paramètre ? */
function citesParameterized(session: CalcSession, typed: string): boolean {
	return session.atelier.objects.some((o) => parametersOf(o) !== null && citesName(typed, o.name));
}

/**
 * Les commandes dont la réponse dépend du SIGNE ou de la valeur d'un
 * paramètre : `.résoudre a x = 0` (a = 0 ?), `.limite e^{a x}`, `.variations`
 * (signe de f' = a)… Avec une fonction à paramètre, elles refusent plutôt que
 * de répondre faux (V56).
 */
const PARAMETER_BLOCKED = new Set(['solve', 'variations', 'limit', 'domain', 'reciprocal']);

/**
 * Le refus d'une commande qui cite une fonction en attente (V56), ou `null` :
 * - en attente d'une FONCTION (`p(x) = q(x)+1`) : le message de la carte —
 *   le moteur recevait le symbole p, et `.dériver p` répondait 0 ;
 * - à paramètre, pour une commande de `PARAMETER_BLOCKED` : le résultat
 *   dépend du paramètre, on le nomme.
 */
function pendingFunctionRefusal(
	session: CalcSession,
	typed: string,
	command: string
): string | null {
	const parameters: string[] = [];
	for (const object of session.atelier.objects) {
		if (object.kind !== 'function' || object.status !== 'pending') continue;
		if (!citesName(typed, object.name)) continue;
		const own = parametersOf(object);
		if (own === null) {
			if (object.message !== undefined) return object.message;
			continue;
		}
		if (!PARAMETER_BLOCKED.has(command)) continue;
		for (const parameter of own) if (!parameters.includes(parameter)) parameters.push(parameter);
	}
	return parameters.length === 0 ? null : dependsOnMessage(parameters);
}

/** Ce que devient une ligne de calcul qui cite une fonction à paramètre. */
type ParameterizedLine =
	| { readonly kind: 'text'; readonly text: string }
	| { readonly kind: 'refus'; readonly message: string }
	| { readonly kind: 'division-by-zero' };

/**
 * Les APPELS d'une fonction à paramètre dans une ligne de calcul : `f(2)` →
 * `2a`. Le moteur ne lie que les objets prêts, et répondait « Fonction
 * inconnue : f — définis-la d'abord », alors que f est dans l'atelier (V56).
 *
 * ⚠️ Dans l'ARBRE, et réduit ICI (`simplify`) : une ligne de calcul qui garde
 * des lettres est rendue telle quelle par le moteur — en texte, `f(2)+1`
 * affichait `(a*2)+1`. Seuls les appels sont réduits : `x+x` tapé reste tel
 * quel, comme avant. La ligne n'est récrite que si elle cite un tel appel ;
 * les fonctions prêtes y sont alors remplacées aussi (`g(f(2))` → 4a²), et
 * `f'(2)` développée et réduite (4a).
 *
 * Refus : une égalité ou une comparaison (`f(2)=4` répondait `false`, vrai
 * pour a = 2). Un dénominateur nul (`a/x` en 0) : « Division par zéro »,
 * comme sans paramètre — `simplify` aurait écrit `a/0`.
 */
function parameterizedLine(session: CalcSession, text: string): ParameterizedLine {
	const parameterized = session.atelier.objects.filter((o) => parametersOf(o) !== null);
	if (parameterized.length === 0) return { kind: 'text', text };
	// `f` seul : son expression, comme pour une fonction prête (`2x`)
	const alone = parameterized.find((o) => o.name === text.trim());
	if (alone !== undefined) {
		const body = substitutedAstOf(session.atelier, alone.name, { forDerivation: true });
		return { kind: 'text', text: body.ok ? toCustom(body.ast) : text };
	}
	const ast = astOf(text, 'url', session.atelier.functionNames);
	if (ast === null) return { kind: 'text', text };
	const names = new Set(
		session.atelier.objects
			.filter((o) => o.kind === 'function' && (o.status === 'ok' || parametersOf(o) !== null))
			.map((o) => o.name)
	);
	const expanded = expandedCalls(session, ast, names, true);
	const parameters = [
		...new Set(
			parameterized
				.filter((o) => expanded.cited.includes(o.name))
				.flatMap((o) => parametersOf(o) ?? [])
		)
	];
	if (parameters.length === 0) return { kind: 'text', text };
	if (expanded.divisionByZero) return { kind: 'division-by-zero' };
	if (isRelation(ast)) return { kind: 'refus', message: dependsOnMessage(parameters) };
	return { kind: 'text', text: toCustom(expanded.ast) };
}

/**
 * Une fonction à paramètre (`f(x) = a x`, `a` non posé) est remplacée comme
 * une fonction prête : le paramètre reste une lettre, `.dériver f` répond a
 * (V56 — le moteur recevait le symbole f et répondait 0).
 *
 * `pendingFunctions` (`.évaluer`, E6) : toute fonction en attente est
 * remplacée — la valeur de `a` arrive après `en` (`en x=1 ; a=2`), et sans
 * elle le moteur le dit (« Il manque la valeur de a »).
 */
function substituteNames(
	session: CalcSession,
	argument: string,
	pendingFunctions = false
): string | null {
	if (argument.trim() === '') return argument;

	// Les fonctions que remplace l'appel d'une fonction en attente : en attente
	// (`f(f(x))`) et PRÊTES (`f(g(x))`) — sinon le sort de `g(x)` dépendait de
	// l'ordre de définition (g après f : « Je n'ai pas su lire »)
	const callNames = new Set(
		session.atelier.objects
			.filter(
				(o) =>
					o.kind === 'function' &&
					(o.status === 'ok' ||
						(o.status === 'pending' && (pendingFunctions || parametersOf(o) !== null)))
			)
			.map((o) => o.name)
	);
	let result = argument;
	for (const object of session.atelier.objects) {
		const usable =
			object.status === 'ok' ||
			(object.status === 'pending' &&
				object.kind === 'function' &&
				(pendingFunctions || parametersOf(object) !== null));
		if (!usable) continue;
		// Une liste n'a pas d'expression : ce sont ses VALEURS que lit une
		// commande de séries (`.stats L` répondait « certaines valeurs ne sont
		// pas des nombres valides »)
		if (object.kind === 'list') {
			if (object.values.length === 0) continue;
			const alone = new RegExp(`(?<![A-Za-z_])${object.name}(?![A-Za-z_0-9(])`, 'g');
			result = result.replace(alone, object.values.join(' ; '));
			continue;
		}
		const pending = object.status === 'pending';
		const expression = expressionOf(session.atelier, object.name, { forDerivation: pending });
		if (!expression.ok) continue;

		// Les APPELS d'abord : sinon le `f` seul de `f(2x)` serait remplacé, et
		// `(sin(x))(2x)` se lirait comme un PRODUIT — `.taylor f(2x) 4` rendait
		// 2x² (2026-10-06).
		if (object.kind === 'function' || object.kind === 'sequence') {
			const replaced = pending
				? replaceCalls(session, result, object.name, (call) =>
						pendingCall(session, callNames, call)
					)
				: replaceCalls(session, result, object.name);
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
function runAtelierCommand(
	name: string,
	input: string,
	argument: string,
	mode: ExpandMode
): CalcResult {
	if (name === 'expand') return runExpandCommand(input, argument, mode);
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
				steps: outcome.steps,
				...summaryField(outcome)
			};
		case 'inchangee':
			return { kind: 'commande', input, output: outcome.message };
		case 'illisible':
			return { kind: 'refus', message: outcome.message };
	}
}

/**
 * `.développer` : la réponse (avec son « Comment ? » quand il se rédige), « rien
 * à développer » (une réponse, pas une ligne rouge) ou un refus (phase 0
 * `atelier-developper-phase0.md`).
 *
 * Les refus citent l'expression TAPÉE (`.résoudre (x+1)^2=4`), pas celle où les
 * noms d'objets sont déjà remplacés.
 */
function runExpandCommand(input: string, argument: string, mode: ExpandMode): CalcResult {
	const space = input.indexOf(' ');
	const typed = space === -1 ? '' : input.slice(space + 1).trim();
	const outcome = expandExpression(argument, mode, typed);
	switch (outcome.kind) {
		case 'developpee':
			return {
				kind: 'commande',
				input,
				output: outcome.text,
				latex: outcome.answer,
				...(outcome.steps !== undefined && { steps: outcome.steps }),
				...summaryField(outcome)
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
	exponential: (atelier, argument) => exponentialCommand(atelier, argument),
	// Loi normale (2026-10-09) : `gaussian`, `normal` est la forme normale du moteur
	gaussian: (atelier, argument) => normalCommand(atelier, argument),
	// `.tabuler f` (tableur, lot 3) : lit un NOM de fonction, écrit dans la grille
	tabulate: (atelier, argument) => tabulateCommand(atelier, argument)
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
	const values = args.assignments.map((assignment) => substitute(assignment.value));
	const interval = args.interval === null ? null : substitute(args.interval);
	const other = args.other === null ? null : substitute(args.other);
	if (expression === null) return null;
	if (args.bounds !== null && (lower === null || upper === null)) return null;
	if (values.some((value) => value === null)) return null;
	if (
		[args.interval, args.other].some((part, i) => part !== null && [interval, other][i] === null)
	) {
		return null;
	}
	return {
		...args,
		expression,
		bounds: lower === null || upper === null ? null : { lower, upper },
		assignments: args.assignments.map((assignment, i) => ({
			...assignment,
			value: values[i] ?? assignment.value
		})),
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

/** Ce que répond `.mode`, en français. */
const MODE_MESSAGES: Readonly<Record<'exact' | 'decimal', string>> = {
	exact: 'Mode exact : les résultats restent exacts (fractions, racines).',
	decimal: 'Mode décimal : les résultats sont donnés en valeur approchée.'
};

/** Une graine neuve, à 4 chiffres : facile à lire et à recopier (Q76) */
function randomSeed(): number {
	return 1000 + Math.floor(Math.random() * 9000);
}

/** Les valeurs approchées des solutions que montrent les étapes, s'il y en a. */
function stepsAlternative(solved: SolvedSteps): { alternative?: Alternative } {
	return solved.approximate === undefined
		? {}
		: { alternative: { label: 'Valeur approchée', latex: solved.approximate } };
}

/** Les valeurs approchées des solutions que le moteur a trouvées, s'il y en a. */
function solutionsAlternative(result: ReplExecutionResult): { alternative?: Alternative } {
	return result.success && result.approximateLatex !== undefined
		? { alternative: { label: 'Valeur approchée', latex: result.approximateLatex } }
		: {};
}

/**
 * L'autre écriture d'un calcul : la valeur approchée en mode exact, l'exacte en
 * mode décimal. Une grandeur n'en a pas : le moteur la calcule par une autre
 * branche, qui ne la donne pas (mesuré : `10[km]/3`, `5[m]/7[s]`).
 */
function calculationAlternative(result: ReplExecutionResult): { alternative?: Alternative } {
	if (!result.success) return {};
	if (result.approximateLatex !== undefined) {
		return { alternative: { label: 'Valeur approchée', latex: result.approximateLatex } };
	}
	if (result.exactLatex !== undefined) {
		return { alternative: { label: 'Valeur exacte', latex: result.exactLatex } };
	}
	return {};
}

/** Ce que répond `.exporter` suivi d'autre chose. */
const EXPORT_ALONE =
	'« .exporter » s’écrit seul : il télécharge l’historique en JSON, pour le rejouer.';

/** La commande du catalogue qu'un nom tapé désigne (français, nom moteur ou raccourci). */
function catalogCommandOf(engine: WebReplEngine, typed: string) {
	const wanted = typed.toLowerCase();
	return commandCatalog(engine).find(
		(c) => c.name.toLowerCase() === wanted || c.aliases.some((a) => a.toLowerCase() === wanted)
	);
}

/**
 * La saisie est-elle `.exporter` seul (nom interne `export`) ? Le moteur ne
 * l'exécute plus (allègement, 2026-10-13) : le pupitre le lance lui-même,
 * c'est lui qui tient l'historique, et le téléchargement est celui du bouton
 * « JSON (pour rejouer) ».
 */
export function isExportCommand(engine: WebReplEngine, text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed.startsWith('.') || /\s/.test(trimmed)) return false;
	return catalogCommandOf(engine, resolveCommand(trimmed).slice(1))?.name === 'export';
}

/**
 * `.ajustement L : M`, `.stats L : M` (valeurs : effectifs) — UNE liste de chaque
 * côté du « : » : chacune est remplacée par ses nombres des lignes où les deux
 * en ont un (P1), et la ligne dit combien elle en écarte. Par rang, une case
 * vide au milieu d'une liste décalait toutes les paires suivantes, en silence.
 * `.stats L ; M` RÉUNIT deux séries : rien à apparier, la commande passe telle
 * quelle (revue de la PR 3b : elle perdait des valeurs).
 */
function withListsByRow(session: CalcSession, input: string): CalcResult {
	const resolved = resolveCommand(input);
	const space = resolved.indexOf(' ');
	if (space === -1) return runCommand(session, input);
	const known = catalogCommandOf(session.engine, resolved.slice(1, space).trim().toLowerCase());
	if (known === undefined || !SERIES_COMMANDS.has(known.name)) return runCommand(session, input);

	const argument = resolved.slice(space + 1);
	const pair = /^\s*([A-Za-z](?:_\d+)?)\s*:\s*([A-Za-z](?:_\d+)?)(?![A-Za-z_0-9(])/.exec(argument);
	const listNamed = (name: string | undefined) => {
		const object = name === undefined ? undefined : session.atelier.get(name);
		return object !== undefined &&
			isList(object) &&
			object.status === 'ok' &&
			!isQualitative(object)
			? object
			: null;
	};
	const xs = listNamed(pair?.[1]);
	const ys = listNamed(pair?.[2]);
	if (pair === null || xs === null || ys === null) return runCommand(session, input);

	const { rows, dropped } = commonRows([xs, ys]);
	if (rows.length === 0) return { kind: 'refus', message: noCommonRowsMessage(xs, ys) };
	const series = `${valuesOn(xs, rows).join(' ; ')} : ${valuesOn(ys, rows).join(' ; ')}`;
	const rest = argument.slice(pair[0].length);
	const result = runCommand(session, `${resolved.slice(0, space)} ${series}${rest}`);
	if (result.kind !== 'commande') return result;
	// L'écho reste ce que l'élève a tapé ; la note dit les lignes écartées
	return {
		...result,
		input,
		...(dropped > 0 && notesOf(result.note ?? null, droppedNote(dropped)))
	};
}

/** Exécuter une commande, après l'avoir traduite vers ce que comprend le moteur. */
function runCommand(session: CalcSession, input: string): CalcResult {
	const { engine } = session;
	const resolved = resolveCommand(input);

	const space = resolved.indexOf(' ');
	const typed = (space === -1 ? resolved.slice(1) : resolved.slice(1, space)).trim().toLowerCase();

	// ⚠️ On vérifie AVANT d'exécuter : le moteur répondrait « Unknown command »
	// en anglais, sans dire ce qui s'en approche (§2 E2).
	const known = catalogCommandOf(engine, typed);
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

	// `.latex` et `.texte` SANS expression n'ont rien à écrire : refus qui montre
	// l'écriture attendue. (Ils basculaient autrefois le mode de saisie du moteur,
	// héritage de `/cas`, `sqrt(2)*sqrt(8)` devenant « s q r t » : bascule
	// retirée du moteur le 2026-10-13.)
	const typedNothing = space === -1 || resolved.slice(space + 1).trim() === '';
	if ((name === 'latex' || name === 'custom') && typedNothing) {
		return {
			kind: 'refus',
			message: `Écris l'expression après la commande : « .${known.french} x^2/2 ».`
		};
	}

	// `.aide` : l'aide de l'ÉLÈVE, en français (décision de David, 2026-10-09).
	// L'aide du moteur — anglaise, pour le développeur — reste derrière
	// `.aide dev`. Aucune aide par commande n'existe : `.aide intégrer` montre
	// l'aide générale plutôt qu'un refus.
	if (name === 'help') {
		const helpArgument =
			space === -1
				? ''
				: resolved
						.slice(space + 1)
						.trim()
						.toLowerCase();
		if (helpArgument !== DEV_HELP_ARGUMENT) {
			return { kind: 'commande', input, output: studentHelpText(engine) };
		}
		const developer = engine.execute('.help');
		return { kind: 'commande', input, output: renderResult(developer, { fromCommand: true }).text };
	}

	// `.valeurs` et `.fonctions` : la liste du MOTEUR était en anglais, et
	// fausse (une suite y passait pour une fonction, `g(t)` s'écrivait en x).
	// Le panneau fait foi (retrait de `/cas`, 2026-10-13).
	if (name === 'vars') return { kind: 'commande', input, output: valuesListing(session.atelier) };
	if (name === 'fns') return { kind: 'commande', input, output: functionsListing(session.atelier) };

	// `.exporter` seul ne passe pas ici : le pupitre le lance avant (il tient
	// l'historique, le moteur ne l'a jamais eu — il répondait « Aucun historique
	// a exporter » après dix calculs). Ce qui arrive ici porte un argument.
	if (name === 'export') return { kind: 'refus', message: EXPORT_ALONE };

	// `.mode`, `.exact`, `.décimal` : le moteur répond en anglais (« Mode set
	// to: exact ») et ne lit pas `décimal` avec son accent. L'atelier change le
	// mode lui-même et répond en français (décision de David, 2026-10-09).
	if (name === 'mode' || name === 'exact' || name === 'decimal') {
		const modeArgument =
			name !== 'mode'
				? name
				: space === -1
					? ''
					: plain(resolved.slice(space + 1).trim()).toLowerCase();
		if (modeArgument === 'exact' || modeArgument === 'decimal') {
			engine.execute(`.${modeArgument}`);
			return { kind: 'commande', input, output: MODE_MESSAGES[modeArgument] };
		}
		if (modeArgument === '') {
			const current = engine.getEvalState().mode === 'decimal' ? 'decimal' : 'exact';
			const other = current === 'exact' ? '.mode décimal' : '.mode exact';
			return {
				kind: 'commande',
				input,
				output: `Mode actuel : ${current === 'exact' ? 'exact' : 'décimal'}. ${MODE_MESSAGES[current]} Pour changer : ${other}.`
			};
		}
		return { kind: 'refus', message: 'Écris « .mode exact » ou « .mode décimal ».' };
	}

	// Les simulations lisent des NOMS de listes : elles passent avant la substitution
	// des noms par leurs expressions, qui en ferait des listes de nombres
	// C6 : une commande traite une expression ; une récurrence n'en est pas une
	// (`.dériver u(2)` rendait « d/dx((u(n)-5)(2)) = 0 »)
	const typedArgument = space === -1 ? '' : resolved.slice(space + 1);
	// V59 : `.évaluer ln x en x=1` réclamait « les valeurs de l et n ». Le même
	// refus que sur une ligne de calcul, pour TOUTE commande de calcul (y
	// compris `.taylor sin ordre 5`, que l'atelier ne lisait déjà pas). Les
	// simulations lisent des noms de listes, pas des expressions
	if (SIMULATIONS[known.name] === undefined) {
		const bare = bareFunctionRefusal(typedArgument);
		if (bare !== null) return { kind: 'refus', message: bare };
	}
	// V58 : `.dériver f` avec f en erreur répondait `d/dx(f) = 0`. Les
	// simulations lisent des noms de listes, pas des objets à calculer
	if (SIMULATIONS[known.name] === undefined) {
		const broken = brokenObjectRefusal(session.atelier, typedArgument);
		if (broken !== null) return { kind: 'refus', message: broken };
		// P9 : `.dériver A` répondait `d/dA(A) = 1` — le refus d'un calcul. Lu dans
		// le TEXTE : l'argument porte des mots-clés (`en x=1`, `; t`) qu'aucun
		// parseur ne lit en entier
		const figure = figureCitedMessage(
			session.atelier.objects,
			session.atelier.names.filter((n) => citesName(typedArgument, n))
		);
		if (figure !== null) return { kind: 'refus', message: figure };
	}
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

	// Une fonction en attente citée (V56) : refus, avant toute substitution.
	// `.évaluer` reçoit la valeur du paramètre après `en` (E6) ; les
	// simulations lisent des noms de listes
	if (name !== 'eval' && SIMULATIONS[known.name] === undefined) {
		const pendingRefused = pendingFunctionRefusal(session, typedArgument, known.name);
		if (pendingRefused !== null) return { kind: 'refus', message: pendingRefused };
	}

	// `.variations f⁻¹` : f sans réciproque, le refus de `.réciproque f`
	if (known.name !== 'reciprocal') {
		const inverse = reciprocalRefusalIn(session.atelier, typedArgument);
		if (inverse !== null) return { kind: 'refus', ...inverse };
	}
	// `.réciproque f [sur I]` lit un NOM de fonction : avant la substitution des
	// noms, qui en ferait une expression (lot 3 de la réciproque)
	if (known.name === 'reciprocal') {
		return reciprocalCommand(session.atelier, input, typedArgument, (text) =>
			withPiCommand(decimalCommaInput(text))
		);
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
	// La virgule décimale (`0,5x`) lue avant tout : l'atelier l'affiche, l'élève
	// la recopie. `12,15,9` ou `max(1,2)` : refusés, avec la forme corrigée
	const commaRefused = commaRefusal(typedArgument, input, {
		series: SERIES_COMMANDS.has(known.name)
	});
	if (commaRefused !== null) return { kind: 'refus', message: commaRefused };
	const rawArgument =
		space === -1
			? ''
			: withPiCommand(decimalCommaInput(resolved.slice(space + 1)).replace(/’/g, "'"));
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
	// `f⁻¹` aussi, calculée à la volée comme `f'` (décision (1) de David)
	const substitute = (text: string): string | null =>
		!text.includes("'") && !citesReciprocal(session.atelier, text)
			? substituteNames(session, text)
			: (expandCommandArgument(session.atelier, text) ??
				substituteNames(session, expandInput(session.atelier, text)));
	// `.limite EXPR en POINT` : lue AVANT la substitution des noms — `en 0 à
	// droite` n'est pas une expression, et `a` (une valeur) y est le mot `à`
	if (known.name === 'limit') {
		return limitCommand(
			{ atelier: session.atelier, substitute, unreadable: UNREADABLE_COMMAND },
			input,
			rawArgument
		);
	}
	const argument = substitute(rawArgument);
	if (argument === null) return { kind: 'refus', message: UNREADABLE_COMMAND };
	// Décision a : `.domaine f` d'une fonction définie sur un intervalle
	const chosenDomain =
		name === 'domain'
			? chosenDomainAnswer((n) => session.atelier.get(n), typedArgument, argument)
			: null;
	if (chosenDomain !== null) return { kind: 'commande', input, output: chosenDomain };
	// ⚠️ **Certaines commandes ne vont PAS au moteur.** Il ne les connaît pas
	// et répondrait « Unknown command », en anglais. On sort donc ici, avant
	// `engine.execute` — et sans moteur derrière, il n'y a aucun repli : ce que
	// rend `runAtelierCommand` est tout ce que l'élève verra.
	if (ATELIER_ONLY_COMMANDS.has(known.name)) {
		const mode = engine.getEvalState().mode === 'decimal' ? 'decimal' : 'exact';
		return runAtelierCommand(known.name, input, argument, mode);
	}

	const gridCall = gridFunctionCalledIn(rawArgument);
	if (gridCall !== null) return { kind: 'refus', message: gridCall };
	const unknown = findUnknownFunctionCall(rawArgument);
	if (unknown !== null) {
		const grid = gridFunctionInCalcul(unknown);
		return { kind: 'refus', message: grid ?? unknownFunctionMessage(unknown) };
	}

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
	// `.évaluer 2a en a=1` alors que `a` est posé dans l'atelier : l'atelier
	// le remplace avant le moteur, qui répondait « « a » n'apparaît pas dans
	// 2(5) », illisible (décision de David, 2026-10-14)
	const posed =
		name === 'eval'
			? typedArgs?.assignments.find((a) => session.atelier.get(a.name)?.kind === 'value')
			: undefined;
	if (posed !== undefined) {
		const definition = session.atelier.get(posed.name)?.definition ?? '';
		return {
			kind: 'refus',
			message: `${posed.name} vaut déjà ${definition} dans l'atelier : retire « ${posed.name}=${posed.value} », ou efface ${posed.name} avant.`
		};
	}
	// `.évaluer` remplace aussi une fonction en attente d'un paramètre (E6)
	const substituteArgument =
		name === 'eval'
			? (text: string): string | null =>
					!text.includes("'") && !citesReciprocal(session.atelier, text)
						? substituteNames(session, text, true)
						: substitute(text)
			: substitute;
	const args = typedArgs === null ? null : substituteArguments(typedArgs, substituteArgument);
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
	// `.évaluer` : la lettre des fonctions citées est celle de la valeur tapée
	// (`en t=2`) ; à plusieurs lettres (E6), celle qui porte leur nom
	const evalAssignment =
		typedArgs === null
			? null
			: typedArgs.assignments.length === 1
				? typedArgs.assignments[0]
				: (typedArgs.assignments.find(
						(a) => a.name === (letter?.kind === 'single' ? letter.letter : INTERNAL_LETTER)
					) ?? null);
	const typedVariable = typedArgs?.variable ?? evalAssignment?.name ?? null;
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
	// Lot 2 de l'intervalle : `.résoudre` et `.variations` travaillent sur
	// l'ensemble des fonctions citées (`f(x) = x^2 sur [0;+∞[`), croisé avec
	// un `dans` tapé ; le moteur le reçoit par ce mot
	// L'ensemble des fonctions citées : `.résoudre` et `.variations` y travaillent
	// (lot 2), `.intégrer` et `.évaluer` refusent ce qui en sort (décision b)
	const cited =
		(name === 'solve' || name === 'variations' || name === 'integrate' || name === 'eval') &&
		typedArgs !== null &&
		finalArgs !== null
			? citedReciprocalInterval(
					session.atelier,
					typedArgs.expression,
					(name === 'eval' ? evalAssignment?.name : finalArgs.variable) ?? INTERNAL_LETTER,
					(typed) =>
						citedIntervalDomain(
							(n) => session.atelier.get(n),
							typed,
							(name === 'eval' ? evalAssignment?.name : finalArgs?.variable) ?? INTERNAL_LETTER
						)
				)
			: null;
	if (cited?.kind === 'composed') {
		return { kind: 'refus', message: composedMessage(cited), ...notesOf(letterNote) };
	}
	const get = (n: string) => session.atelier.get(n);
	const outsideRefusal =
		cited === null || typedArgs === null
			? null
			: name === 'eval' && evalAssignment !== null
				? valueOutsideRefusal(get, cited, evalAssignment.value)
				: name === 'integrate' && typedArgs.bounds !== null
					? segmentOutsideRefusal(get, cited, typedArgs.bounds.lower, typedArgs.bounds.upper)
					: null;
	if (outsideRefusal !== null) {
		return { kind: 'refus', message: outsideRefusal, ...notesOf(letterNote) };
	}
	let studied: Domain | null = null;
	if (cited !== null && finalArgs !== null && (name === 'solve' || name === 'variations')) {
		const typedWithin =
			finalArgs.interval === null
				? null
				: parseStudentDomain(finalArgs.interval, finalArgs.variable ?? INTERNAL_LETTER);
		if (typedWithin !== null && !typedWithin.success) {
			return { kind: 'refus', message: UNREADABLE_STUDY_DOMAIN, ...notesOf(letterNote) };
		}
		studied = typedWithin === null ? cited.domain : intersect(typedWithin.domain, cited.domain);
		if (isEmpty(studied)) {
			return {
				kind: 'refus',
				message: `Aucun nombre de ${finalArgs.interval ?? ''} n'est dans l'ensemble de définition de ${cited.name}, ${intervalText(cited.domain)}.`,
				...notesOf(letterNote)
			};
		}
		finalArgs = { ...finalArgs, interval: formatInterval(studied) };
	}
	const commandArgument = finalArgs === null ? argument : writeCommandArguments(finalArgs);
	const executed = space === -1 ? `.${known.name}` : `.${known.name} ${commandArgument}`;

	const result = engine.execute(executed);
	// V57 : une résolution qui DIVISE par un paramètre (`a x = 0` → x = 0, faux
	// pour a = 0) refuse plutôt que de répondre (Q5, David, 2026-10-14). Les
	// refus du moteur passent avant : il dit déjà ce qu'il ne sait pas faire
	const parameterRefusal =
		name === 'solve' &&
		finalArgs !== null &&
		(result.success || result.error?.code === INEQUALITY_UNSOLVED)
			? parameterSolveRefusal(
					session,
					finalArgs.expression,
					finalArgs.variable ?? DEFAULT_VARIABLE,
					result.success ? result.latex : undefined
				)
			: null;
	if (parameterRefusal !== null) {
		return { kind: 'refus', message: parameterRefusal, ...notesOf(letterNote) };
	}
	// Une borne à paramètre sur un pôle (`1/x de 1 à a` → ln|a|, faux si
	// a ⩽ 0), un pôle qui dépend du paramètre (`1/(x-a) de 0 à 1`), ou `x^a`
	// jusqu'en 0 (diverge pour a ⩽ −1) : refus, que le moteur ait répondu ou
	// non (`1/(x^2-a)` : « Unable to factor denominator »)
	const boundedIntegrand =
		name === 'integrate' && finalArgs?.bounds != null
			? parseCommandExpression(finalArgs.expression).ast
			: undefined;
	const boundsRefusal =
		boundedIntegrand === undefined || finalArgs?.bounds == null
			? null
			: parameterBoundsRefusal(
					session,
					boundedIntegrand,
					finalArgs.variable ?? DEFAULT_VARIABLE,
					finalArgs.bounds
				);
	if (boundsRefusal !== null) {
		return { kind: 'refus', message: boundsRefusal, ...notesOf(letterNote) };
	}
	// `fromCommand` : pour une commande, `result.ast` porte l'ENTRÉE. Le rendre
	// afficherait « x^2 » là où `.dériver x^2` répond « 2x » (voir `render.ts`).
	const rendered = renderResult(result, { fromCommand: true });
	const noted = notesOf(letterNote);

	// Un refus que le moteur adresse à l'élève, en français (`.dériver x^2 ; ab`
	// : « « ab » n'est pas une variable. », `.dériver sin x` : « Écris sin(x)… ») :
	// montré tel quel, AVANT les étapes — qui, elles, liraient `sin x` autrement —
	// et pas noyé dans « Je n’ai pas su lire » (revue #880)
	if (!result.success && STUDENT_FACING_ERRORS.has(result.error?.code ?? '')) {
		// `.intégrer \frac1x de -1 à 1` : le refus garde le message du moteur, et
		// porte les étapes du refus rédigé quand elles concordent (décision de
		// David, 2026-10-13) — « non définie en x = 0, qui appartient à [−1 ; 1] »
		const explained =
			name === 'integrate' &&
			result.error?.code === 'INTEGRAL_UNDEFINED' &&
			finalArgs !== null &&
			finalArgs.bounds !== null
				? integrateRefusalSteps({
						expression: finalArgs.expression,
						variable: finalArgs.variable,
						bounds: finalArgs.bounds
					})
				: null;
		// Le refus de `.évaluer` qui propose une commande la cite telle que
		// l'élève l'a tapée : `.évaluer f en …`, pas `.évaluer (ax) en …`
		const engineMessage = result.error?.message ?? UNREADABLE_COMMAND;
		const message =
			name === 'eval' && finalArgs !== null && typedArgs !== null
				? engineMessage.replace(
						`.évaluer ${finalArgs.expression} en `,
						`.évaluer ${typedArgs.expression} en `
					)
				: engineMessage;
		return {
			kind: 'refus',
			message,
			// Le refus de `.évaluer` cite la valeur en formule : `$x = 1$`
			...(result.error?.code === VALUE_FORBIDDEN && { formulas: true as const }),
			...(explained !== null && { steps: explained.steps, ...summaryField(explained) }),
			...noted
		};
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
				...summaryField(derived),
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
				steps: simplified.steps,
				...summaryField(simplified)
			};
		}
	}

	// ⚠️ `.variations` rendait le bloc d'un terminal (`{-2}/{(2x-1)^2}`, `-inf`,
	// « decroissante ») : la dérivée en LaTeX, le tableau quand il se dessine,
	// le détail à déplier — comme le bouton « Variations » (2026-10-09)
	if (name === 'variations' && result.success) {
		const rendering = variationsRendering(
			finalArgs?.expression ?? argument,
			'f',
			finalArgs?.variable ?? undefined,
			finalArgs?.interval ?? null
		);
		if (rendering !== null) {
			return {
				kind: 'commande',
				input,
				output: rendered.text,
				latex: rendering.answer,
				steps: rendering.steps,
				...(rendering.table !== undefined && { table: rendering.table }),
				...noted
			};
		}
	}

	// `dans [a ; b]` tapé seul : pas d'étapes, le moteur restreint. L'ensemble
	// d'une fonction citée (lot 2) : les étapes sur ℝ, puis le tri des solutions
	const solved =
		name === 'solve' && finalArgs !== null && (finalArgs.interval === null || studied !== null)
			? solveSteps(
					finalArgs.variable === null
						? finalArgs.expression
						: `${finalArgs.expression} ; ${finalArgs.variable}`,
					studied ?? undefined
				)
			: null;
	if (solved !== null) {
		return {
			kind: 'commande',
			input,
			output: rendered.text,
			latex: solved.answer,
			steps: solved.steps,
			...summaryField(solved),
			...stepsAlternative(solved),
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
		// Un paramètre : le message de l'atelier, le même que pour `a x = 0`
		// (« Le résultat dépend de q et u_0 : … »), pas celui du moteur
		// (les lettres viennent du moteur : il sait lire `u_0`, `getVariables` y voit u)
		const letters = /^La solution dépend de (.+) : je ne sais pas encore/.exec(
			result.error.message
		)?.[1];
		const message =
			letters === undefined ? result.error.message : dependsOnMessage(letters.split(', '));
		return { kind: 'refus', message, ...noted };
	}

	// Pas d'étapes (degré ≥ 3, transcendante, trigonométrique) : les solutions
	// du moteur, en LaTeX — bâties sur son résultat STRUCTURÉ (`solve-latex.ts`).
	// Sans lui, la ligne montrait le texte du terminal,
	// « x = 0 ou x = {1/2}sqrt(2) ou x = -{1/2}sqrt(2) » (2026-10-08).
	if (name === 'solve' && result.success && result.latex !== undefined) {
		return {
			kind: 'commande',
			input,
			output: rendered.text,
			latex: result.latex,
			...solutionsAlternative(result),
			...noted
		};
	}

	// Une primitive non trouvée (`.intégrer 1/(x^2-2)`) : le moteur écrit sa
	// ligne de terminal, « ∫ … : Non résolu / Technique tentée … », que la ligne
	// montrait telle quelle (mesuré le 2026-10-14) — l'élève lit son refus
	// (Seule la branche « Non résolu » a une sortie : une erreur de lecture, sans
	// sortie, garde le repli « Je n'ai pas su lire » plus bas — revue)
	if (
		name === 'integrate' &&
		!result.success &&
		result.error?.message !== undefined &&
		rendered.text.trim() !== ''
	) {
		return { kind: 'refus', message: result.error.message, ...noted };
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

	// `.convertir` : même exception — son `result.ast` est la grandeur égale à sa
	// conversion (`12,3 km = 12300 m`, phase 0 grandeurs, lot A)
	if (name === 'convert' && result.success && result.ast !== undefined) {
		return {
			kind: 'commande',
			input,
			output: rendered.text,
			latex: displayUnitsInLatex(toLatex(result.ast)),
			...solutionsAlternative(result),
			...noted
		};
	}

	// `.intégrer` : même exception — son `result.ast` est la PRIMITIVE, ou la
	// VALEUR d'une intégrale définie (voir `integrate.command.ts`). Sans lui, la
	// ligne montrait le texte du terminal, « ∫ x^2 dx = {1/3}x^3 + C » (2026-10-08).
	//
	// « Comment ? » : les étapes de `pedagogical-integration`, seulement quand
	// elles confirment ce que dit le moteur et n'ont aucun coefficient caché
	// (`integrate-steps.ts`) — sinon la ligne reste celle du moteur, seule.
	// Un pôle dans [a ; b] sort plus haut, en refus, avec les étapes du refus
	// rédigé quand elles concordent (`integrateRefusalSteps`).
	if (name === 'integrate' && result.success && result.ast !== undefined) {
		const integrated =
			finalArgs === null
				? null
				: integrateSteps(
						{
							expression: finalArgs.expression,
							variable: finalArgs.variable,
							bounds: finalArgs.bounds
						},
						result.ast
					);
		// Une fonction à paramètre (V56) : le moteur laisse la valeur en l'état
		// quand une lettre y reste (`e^{a * 0}`) — réduite ici, pour l'affichage
		const integrationVariable = finalArgs?.variable ?? DEFAULT_VARIABLE;
		const integrand =
			finalArgs === null ? undefined : parseCommandExpression(finalArgs.expression).ast;
		const parameters =
			integrand === undefined ? [] : freeParameters(session, integrand, integrationVariable);
		const reduced =
			finalArgs?.bounds != null &&
			(citesParameterized(session, typedArgument) || parameters.length > 0)
				? simplify(result.ast).result
				: result.ast;
		const shown = parameters.length > 0 ? reducedExponents(reduced, integrationVariable) : reduced;
		// Q3 (David, 2026-10-14) : une primitive qui DIVISE par le paramètre
		// (`e^{ax}` → `e^{ax}/a`) le dit — « (a ≠ 0) »
		const conditions =
			finalArgs === null
				? []
				: introducedConditions(
						shown,
						finalArgs.expression,
						integrationVariable,
						parameters,
						finalArgs.bounds != null
					);
		return {
			kind: 'commande',
			input,
			output:
				conditions.length === 0
					? rendered.text
					: `${rendered.text} (${conditions.map((c) => c.text).join(', ')})`,
			latex:
				integralLatex(shown, rendered.text) +
				(conditions.length === 0 ? '' : ` \\quad (${conditions.map((c) => c.latex).join(',\\ ')})`),
			...(integrated !== null && { steps: integrated.steps, ...summaryField(integrated) }),
			...noted
		};
	}

	// `.domaine` : la réponse est une FORMULE, `D = …`, écrite comme la
	// conclusion des étapes ; le texte du terminal (« Expression »,
	// « Condition ») n'est plus montré (décision Q5 de David, 2026-10-13).
	// « Comment ? » : les étapes de `pedagogical-domain`, seulement quand
	// elles concluent, par valeur, le domaine du moteur (`domain-steps.ts`).
	// Les refus (`DOMAIN_UNRESOLVED`) sont sortis plus haut, inchangés.
	if (name === 'domain' && result.success && result.ast !== undefined) {
		const line = domainLine(result.ast, finalArgs?.variable ?? DEFAULT_VARIABLE);
		if (line !== null) {
			return {
				kind: 'commande',
				input,
				output: line.text,
				latex: line.latex,
				...(line.steps !== undefined && { steps: line.steps, ...summaryField(line) }),
				...noted
			};
		}
	}

	// `.évaluer` : la réponse est une FORMULE, `f(3) = 9` pour une fonction de
	// l'atelier, la valeur seule pour une expression (décision de David,
	// 2026-10-14) ; le texte du terminal (« Result: 9 (exact) Mode: exact »,
	// en anglais) n'est plus montré
	//
	// « Comment ? » (PR 3) : le remplacement, rédigé ici, puis les étapes
	// collège de `pedagogical-arithmetic`, seulement quand elles concluent la
	// réponse du moteur et ont quelque chose à montrer (`evaluate-steps.ts`).
	// Les refus (`VALUE_FORBIDDEN`) sont sortis plus haut, sans étapes.
	if (name === 'eval' && result.success && result.latex !== undefined) {
		const assignments = finalArgs?.assignments ?? typedArgs?.assignments ?? [];
		// `f(3) = …` : une fonction de l'atelier en UNE valeur ; à plusieurs
		// lettres (E6), la valeur seule, comme pour une expression
		const functionName =
			assignments.length === 1
				? evaluatedFunctionName(session, typedArgs?.expression ?? null)
				: null;
		const single = assignments.length === 1 ? assignments[0].value : null;
		const line = evaluatedLine(result, result.latex, functionName, single);
		const names = new Set(assignments.map((a) => a.name));
		const evaluated =
			finalArgs === null ||
			finalArgs.assignments.length === 0 ||
			result.ast === undefined ||
			citesOtherLetters(session, typedArgs?.expression ?? null, names) ||
			(typedArgs?.assignments ?? []).some((a) => citesOtherLetters(session, a.value, new Set()))
				? null
				: evaluateSteps(
						{
							expression: finalArgs.expression,
							assignments: finalArgs.assignments,
							callLatex: evaluatedCallLatex(functionName, single)
						},
						result.ast,
						result.latex
					);
		return {
			kind: 'commande',
			input,
			output: line.text,
			latex: line.latex,
			...solutionsAlternative(result),
			...(evaluated !== null && { steps: evaluated.steps, ...summaryField(evaluated) }),
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
 * La fonction de l'atelier qu'évalue `.évaluer f en x=3` (ou `f(x)`), sinon
 * `null` : une expression qui la contient (`f(x)+1`) n'est pas `f`.
 */
function evaluatedFunctionName(session: CalcSession, typed: string | null): string | null {
	if (typed === null) return null;
	const name = /^\s*([^\s(]+?)\s*(?:\(\s*[A-Za-z]\s*\))?\s*$/.exec(typed)?.[1];
	return name !== undefined && session.atelier.get(name)?.kind === 'function' ? name : null;
}

/**
 * La ligne de `.évaluer` : `f(3) = 9` (`\approx` quand c'est arrondi), ou la
 * valeur seule. `latex` est la valeur écrite par le moteur (`eval.command`).
 */
function evaluatedLine(
	result: ReplExecutionResult,
	latex: string,
	functionName: string | null,
	typedValue: string | null
): { readonly text: string; readonly latex: string } {
	const rounded = latex.startsWith('\\approx');
	const ast = result.ast;
	const valueText =
		ast === undefined
			? ''
			: isBoolean(ast)
				? ast.value
					? 'vrai'
					: 'faux'
				: `${rounded ? '≈ ' : ''}${toCustom(ast)}`;
	const value = typedValueOf(typedValue);
	const call = evaluatedCallLatex(functionName, typedValue);
	if (functionName === null || value === undefined || call === null) {
		return { text: valueText, latex };
	}
	// Le texte, homogène : `f(sqrt(2)) = 1+sqrt(2)`, pas `f(\sqrt{2}) = 1+sqrt(2)`
	const text = `${functionName}(${toCustom(value)}) ${rounded ? valueText : `= ${valueText}`}`;
	return { text, latex: rounded ? `${call} ${latex}` : `${call} = ${latex}` };
}

/**
 * La saisie TAPÉE cite-t-elle une autre lettre que celles qu'on remplace
 * (une valeur posée dans l'atelier, `a` dans `.évaluer a x en x=3`, ou dans
 * une valeur, `en x=a` : `letters` est alors vide) ? Ses étapes la feraient
 * disparaître sans le dire : pas d'étapes. Le nom d'une fonction de
 * l'atelier ne compte pas.
 */
function citesOtherLetters(
	session: CalcSession,
	typed: string | null,
	letters: ReadonlySet<string>
): boolean {
	const ast = typed === null ? undefined : parseCommandExpression(typed).ast;
	if (ast === undefined) return true;
	return [...getVariables(ast)].some(
		(name) => !letters.has(name) && session.atelier.get(name)?.kind !== 'function'
	);
}

/**
 * La valeur tapée après `en`, lue. Une valeur posée dans l'atelier (`en x=a`)
 * arrive remplacée entre parenthèses, `(3)` : sans elles, `f(3)` et non
 * `f((3))`.
 */
function typedValueOf(typedValue: string | null): MathNode | undefined {
	let value = typedValue === null ? undefined : parseCommandExpression(typedValue).ast;
	while (value?.type === 'delimiter') value = value.content;
	return value;
}

/**
 * L'appel `f(3)` en LaTeX, ou `null` sans fonction de l'atelier : la tête de
 * la ligne de `.évaluer` et de ses étapes. La valeur tapée telle quelle, une
 * division écrite en fraction : f(1/3) → f(⅓), comme dans un refus
 * (`typedValueLatex`).
 */
function evaluatedCallLatex(functionName: string | null, typedValue: string | null): string | null {
	const value = typedValueOf(typedValue);
	if (functionName === null || value === undefined) return null;
	const argument = typedValueLatex(value);
	const plain = isNumber(value) || (isOpposite(value) && isNumber(value.operand));
	return plain ? `${functionName}(${argument})` : `${functionName}\\left(${argument}\\right)`;
}

// =============================================================================
// Paramètres : lettres non posées (Q3, Q5 — David, 2026-10-14)
// =============================================================================

/**
 * Les lettres non posées d'un arbre : ni la variable, ni une valeur de
 * l'atelier (`a = 2` posé n'est plus un paramètre).
 */
function freeParameters(session: CalcSession, ast: MathNode, variable: string): string[] {
	const bound = new Set(session.engine.getEvalState().bindings.keys());
	return [...getVariables(ast)].filter((v) => v !== variable && !bound.has(v));
}

/** Les lettres de `parameters` qu'un arbre contient. */
function citedParameters(ast: MathNode, parameters: readonly string[]): string[] {
	const letters = getVariables(ast);
	return parameters.filter((p) => letters.has(p));
}

/** Une condition « a ≠ 0 », écrite pour la ligne (LaTeX) et pour le texte. */
interface Condition {
	readonly latex: string;
	readonly text: string;
}

/**
 * Les facteurs d'un dénominateur faits de paramètres seulement : `2a` → a,
 * `a x` → a (x est la variable), `(a-1)^2` → a − 1.
 */
function parameterFactors(
	node: MathNode,
	variable: string,
	parameters: readonly string[]
): MathNode[] {
	if (node.type === 'delimiter') return parameterFactors(node.content, variable, parameters);
	if (node.type === 'opposite') return parameterFactors(node.operand, variable, parameters);
	if (node.type === 'multiplication') {
		return [
			...parameterFactors(node.left, variable, parameters),
			...parameterFactors(node.right, variable, parameters)
		];
	}
	if (node.type === 'superscript' && isNumber(node.superscript)) {
		return parameterFactors(node.base, variable, parameters);
	}
	if (getVariables(node).has(variable) || citedParameters(node, parameters).length === 0) return [];
	return [node];
}

/**
 * La forme la plus lisible de « facteur ≠ 0 » : `a ≠ 0`, `a − 1` → `a ≠ 1`,
 * `a + 1` → `a ≠ −1` ; sinon le facteur entier, `a^2 + 1 ≠ 0`.
 */
function conditionOf(factor: MathNode): Condition | null {
	const node = factor.type === 'delimiter' ? factor.content : factor;
	// Toujours vraie (`a^2 + 1 ≠ 0`) : rien à dire
	if (isPositive(node)) return null;
	const excluded = (letter: string, value: string): Condition => ({
		latex: `${letter} \\neq ${value}`,
		text: `${letter} ≠ ${value}`
	});
	if (node.type === 'variable') return excluded(node.name, '0');
	if (node.type === 'addition' || node.type === 'subtraction') {
		const { left, right } = node;
		const pair =
			left.type === 'variable' && isNumber(right)
				? { letter: left.name, number: right.value }
				: right.type === 'variable' && isNumber(left)
					? { letter: right.name, number: left.value }
					: null;
		if (pair !== null) {
			return excluded(pair.letter, node.type === 'addition' ? `-${pair.number}` : pair.number);
		}
	}
	return { latex: `${toLatex(node)} \\neq 0`, text: `${toCustom(node)} ≠ 0` };
}

/** Les conditions « ≠ 0 » des dénominateurs d'un arbre qui contiennent un paramètre. */
function denominatorConditions(
	ast: MathNode,
	variable: string,
	parameters: readonly string[]
): Condition[] {
	const found: Condition[] = [];
	mapNode(ast, (node) => {
		if (node.type === 'division') {
			for (const factor of parameterFactors(node.denominator, variable, parameters)) {
				const condition = conditionOf(factor);
				if (condition !== null && !found.some((c) => c.latex === condition.latex)) {
					found.push(condition);
				}
			}
		}
		return node;
	});
	return found;
}

/**
 * Q3 : les conditions qu'une primitive ou une intégrale INTRODUIT en divisant
 * par un paramètre (`e^{ax}` → `e^{ax}/a`, « a ≠ 0 »). Une division déjà dans
 * l'expression de départ (`1/(a x)`) n'est pas redite : la condition vient
 * d'elle, pas du calcul — comme pour `.dériver`.
 *
 * V61 : une intégrale BORNÉE dit toutes ses conditions, celles de l'intégrande
 * comprises — `1/(a x) de 1 à 2` → (ln 2)/a (a ≠ 0) : l'intégrande n'est plus
 * sur la ligne, et la valeur n'a de sens que pour a ≠ 0.
 */
function introducedConditions(
	answer: MathNode,
	typed: string,
	variable: string,
	parameters: readonly string[],
	bounded: boolean
): Condition[] {
	if (parameters.length === 0) return [];
	const input = parseCommandExpression(typed).ast;
	const already = input === undefined ? [] : denominatorConditions(input, variable, parameters);
	const answered = denominatorConditions(answer, variable, parameters);
	if (!bounded) return answered.filter((c) => !already.some((a) => a.latex === c.latex));
	return [...answered, ...already.filter((a) => !answered.some((c) => c.latex === a.latex))];
}

/**
 * Q5 (V57) : `.résoudre` refuse quand la résolution DIVISE par une expression
 * d'un paramètre — `a x = 0` répondait x = 0, faux pour a = 0.
 * - polynôme en l'inconnue : son coefficient dominant contient un paramètre
 *   (`a x + b = 0`, `x/a = 1`, `a x^2 = 1`, et `a x > 1`, dont le sens dépend
 *   du signe de a) ; `(x-a)(x-1) = 0`, `x + a = 0` restent résolus ;
 * - sinon, l'inconnue multipliée par un paramètre (`e^{a x} = 1`), ou un
 *   paramètre au dénominateur de la réponse (`1/x = a` → 1/a) — sauf si le
 *   moteur a écrit la condition (`u_0 \cdot 0{,}5^n = 1` : « si u₀ > 0 »).
 * ⚠️ `x^2 = a` reste : pas de division, et la réponse dit « si a ⩾ 0 ».
 *
 * @param latex - La réponse du moteur, `undefined` s'il n'a pas conclu
 */
function parameterSolveRefusal(
	session: CalcSession,
	typed: string,
	unknown: string,
	latex: string | undefined
): string | null {
	const ast = parseCommandExpression(typed).ast;
	if (ast === undefined || !isRelation(ast) || isRelation(ast.left)) return null;
	const parameters = freeParameters(session, ast, unknown);
	if (parameters.length === 0) return null;
	const rational = ast.relation === '=' ? forbiddenSolutions(ast, unknown, parameters) : [];
	if (rational.length > 0) return dependsOnMessage(rational);
	const difference: MathNode = { type: 'subtraction', left: ast.left, right: ast.right };
	const degree = getPolynomialDegree(difference, unknown);
	if (degree === 0) return null;
	if (degree !== null) {
		const leading = leadingParameters(difference, degree, unknown, parameters);
		if (leading.length > 0) return dependsOnMessage(leading);
	}
	const conditioned = latex?.includes('\\text{si') ?? false;
	if (conditioned) return null;
	const multiplied = degree === null ? multipliedParameters(difference, unknown, parameters) : [];
	if (multiplied.length > 0) return dependsOnMessage(multiplied);
	if (latex === undefined) return null;
	const cites = (chunk: string, p: string) =>
		new RegExp(`(?<![A-Za-z\\\\])${p}(?![A-Za-z])`).test(chunk);
	const denominators = latexDenominators(latex);
	const divisors = parameters.filter((p) => denominators.some((d) => cites(d, p)));
	return divisors.length === 0 ? null : dependsOnMessage(divisors);
}

/**
 * Équation rationnelle (revue de 0d3d9beea) : les paramètres pour lesquels une
 * solution tombe sur une valeur interdite. `x/(x-a) = 0` → x = 0, interdite si
 * a = 0 ; `(x-a)/(x-1) = 0` → x = a, interdite si a = 1 ; `a/x = 1` → x = a.
 * `1/(x-a) = 1` → x = a + 1 n'annule jamais x − a : gardée.
 */
function forbiddenSolutions(
	relation: RelationNode,
	unknown: string,
	parameters: readonly string[]
): string[] {
	const denominators: MathNode[] = [];
	mapNode(relation, (node) => {
		if (node.type === 'division' && getVariables(node.denominator).has(unknown)) {
			denominators.push(node.denominator);
		}
		return node;
	});
	if (denominators.length === 0) return [];
	let solutions: readonly { readonly value: MathNode }[];
	try {
		solutions = solveRelation(relation, { variable: unknown }).solutions;
	} catch {
		return [];
	}
	const found = new Set<string>();
	for (const solution of solutions) {
		for (const denominator of denominators) {
			const at = simplify(substitute(denominator, { [unknown]: solution.value })).result;
			for (const p of citedParameters(at, parameters)) found.add(p);
		}
	}
	return parameters.filter((p) => found.has(p));
}

/** Positif ou nul quelle que soit la valeur des lettres : `a^2`, `a^2 + b^2`, 3. */
function isNonNegative(node: MathNode): boolean {
	if (node.type === 'delimiter') return isNonNegative(node.content);
	if (isNumber(node)) return Number(node.value) >= 0;
	if (node.type === 'superscript' && isNumber(node.superscript)) {
		const exponent = Number(node.superscript.value);
		return Number.isInteger(exponent) && exponent % 2 === 0;
	}
	if (node.type === 'addition' || node.type === 'multiplication') {
		return isNonNegative(node.left) && isNonNegative(node.right);
	}
	return false;
}

/** Strictement positif quelle que soit la valeur des lettres : `a^2 + 1`. */
function isPositive(node: MathNode): boolean {
	if (node.type === 'delimiter') return isPositive(node.content);
	if (isNumber(node)) return Number(node.value) > 0;
	if (node.type === 'addition') {
		return (
			(isPositive(node.left) && isNonNegative(node.right)) ||
			(isNonNegative(node.left) && isPositive(node.right))
		);
	}
	if (node.type === 'multiplication') return isPositive(node.left) && isPositive(node.right);
	return false;
}

/** `x^{a-1+1}` → `x^a` : l'exposant à paramètre d'une puissance de la variable, réduit. */
function reducedExponents(ast: MathNode, variable: string): MathNode {
	return mapNode(ast, (node) =>
		node.type === 'superscript' &&
		node.base.type === 'variable' &&
		node.base.name === variable &&
		!isNumber(node.superscript)
			? { ...node, superscript: simplify(node.superscript).result }
			: node
	);
}

/** La valeur d'une borne écrite en nombre (`2`, `-1`), sinon `null`. */
function numericBound(ast: MathNode | undefined): number | null {
	if (ast === undefined) return null;
	if (isNumber(ast)) return Number(ast.value);
	if (isOpposite(ast) && isNumber(ast.operand)) return -Number(ast.operand.value);
	return null;
}

/**
 * Une intégrale bornée qui dépend du paramètre sans le dire (revue de
 * 0d3d9beea) :
 * - une borne à paramètre et une intégrande qui n'est pas définie partout
 *   (`1/x de 1 à a` → ln|a|, faux dès que 0 est entre 1 et a) ;
 * - `x^a` sur un segment qui touche 0 ou une borne à paramètre
 *   (`x^a de 0 à 1` diverge pour a ⩽ −1).
 * - un pôle qui dépend du paramètre, même entre deux nombres (`1/(x-a) de 0 à 1`).
 * `x^2 de 0 à a` (définie partout) reste : a³/3.
 */
function parameterBoundsRefusal(
	session: CalcSession,
	integrand: MathNode,
	variable: string,
	bounds: { readonly lower: string; readonly upper: string }
): string | null {
	const lower = parseCommandExpression(bounds.lower).ast;
	const upper = parseCommandExpression(bounds.upper).ast;
	const inBounds = [lower, upper].flatMap((b) =>
		b === undefined ? [] : freeParameters(session, b, variable)
	);
	const integrandParameters = freeParameters(session, integrand, variable);
	const exponents = new Set<string>();
	mapNode(integrand, (node) => {
		if (node.type === 'superscript' && getVariables(node.base).has(variable)) {
			for (const p of citedParameters(node.superscript, integrandParameters)) exponents.add(p);
		}
		return node;
	});
	if (exponents.size > 0) {
		const low = numericBound(lower);
		const high = numericBound(upper);
		if (inBounds.length > 0 || (low !== null && high !== null && Math.min(low, high) <= 0)) {
			return dependsOnMessage([...new Set([...exponents, ...inBounds])]);
		}
	}
	// Un pôle qui dépend du paramètre, bornes en nombres compris
	// (`1/(x-a) de 0 à 1`, faux pour a dans [0 ; 1]) ; pas `1/(x^2+a^2+1)`,
	// toujours positif, ni `1/(x^2+a^2)` ou `1/(a x)` sur [1 ; 2] (V61)
	const a = numericBound(lower);
	const b = numericBound(upper);
	const segment =
		inBounds.length === 0 && a !== null && b !== null
			? { low: Math.min(a, b), high: Math.max(a, b) }
			: null;
	const poles = new Set<string>();
	mapNode(integrand, (node) => {
		if (
			node.type === 'division' &&
			getVariables(node.denominator).has(variable) &&
			!isPositive(node.denominator) &&
			(segment === null ||
				!nonZeroOnSegment(node.denominator, variable, integrandParameters, segment))
		) {
			for (const p of citedParameters(node.denominator, integrandParameters)) poles.add(p);
		}
		// Revue de V61 : les pôles et les domaines qui ne passent pas par une
		// division — `(x-a)^(-1) de 0 à 1` rendait ln|1 − a| − ln|a|, faux pour a = 0,5
		for (const p of domainParameters(node, variable, integrandParameters, segment)) poles.add(p);
		return node;
	});
	if (poles.size > 0) return dependsOnMessage([...new Set([...poles, ...inBounds])]);
	if (inBounds.length === 0) return null;
	const domain = computeDomain(integrand, variable);
	if (isUniversal(domain.domain) && (domain.unresolved?.length ?? 0) === 0) return null;
	return dependsOnMessage([...new Set(inBounds)]);
}

/** Les fonctions définies sur ℝ : leur argument n'a rien à prouver. */
const DEFINED_EVERYWHERE: ReadonlySet<string> = new Set([
	'sin',
	'cos',
	'exp',
	'arctan',
	'sinh',
	'cosh',
	'tanh',
	'abs'
]);

/** Les fonctions définies pour un argument strictement positif (au moins) : ln, log, √. */
const POSITIVE_ARGUMENT: ReadonlySet<string> = new Set(['ln', 'log', 'sqrt']);

/**
 * Revue de V61 : les paramètres d'un nœud qui peut sortir de son domaine sur le
 * segment selon leur valeur (ou tous ceux qu'il cite, dans le doute) :
 * - puissance d'une base en x à paramètre — exposant entier négatif : base non
 *   nulle (`nonZeroOnSegment`) ; exposant non entier : base positive ;
 * - exposant à paramètre d'une base en x : base positive (`(x-1)^a de 0 à 2`) ;
 * - fonction d'un argument en x à paramètre : ln, log, √ exigent un argument
 *   positif (`\ln(x + a^2)` sur [1 ; 2] gardé, `\ln(x-a)` refusé) ; sin, cos, exp,
 *   arctan, |·|… rien ; toute autre (tan, arcsin…) refuse.
 * `segment` nul (borne à paramètre ou écrite autrement qu'en nombre) : refus.
 */
function domainParameters(
	node: MathNode,
	variable: string,
	parameters: readonly string[],
	segment: Segment | null
): string[] {
	const positive = (n: MathNode) =>
		isPositive(n) || (segment !== null && positiveOnSegment(n, variable, parameters, segment));
	if (node.type === 'superscript' && getVariables(node.base).has(variable)) {
		const cited = citedParameters(node, parameters);
		if (cited.length === 0) return [];
		if (citedParameters(node.superscript, parameters).length > 0) {
			return positive(node.base) ? [] : cited;
		}
		if (getVariables(node.superscript).size > 0) return positive(node.base) ? [] : cited;
		let exponent: number;
		try {
			exponent = compile(node.superscript)({});
		} catch {
			return cited;
		}
		if (Number.isInteger(exponent) && exponent >= 0) return [];
		if (Number.isInteger(exponent)) {
			const nonZero =
				isPositive(node.base) ||
				(segment !== null && nonZeroOnSegment(node.base, variable, parameters, segment));
			return nonZero ? [] : cited;
		}
		return positive(node.base) ? [] : cited;
	}
	if (node.type === 'function') {
		const argument = node.args[0];
		const cited = citedParameters(node, parameters);
		if (argument === undefined || cited.length === 0) return [];
		if (!node.args.some((arg) => getVariables(arg).has(variable))) return [];
		if (DEFINED_EVERYWHERE.has(node.name)) return [];
		if (POSITIVE_ARGUMENT.has(node.name) && node.args.length === 1) {
			return positive(argument) ? [] : cited;
		}
		return cited;
	}
	return [];
}

/** Un segment [low ; high] de nombres, low ⩽ high. */
interface Segment {
	readonly low: number;
	readonly high: number;
}

/**
 * V61 : un dénominateur qui ne s'annule sur le segment pour AUCUNE valeur des
 * paramètres, hors facteurs faits de paramètres seuls (`a` dans `a x`) — ceux-là,
 * la condition « a ≠ 0 » de la ligne les écarte. Chaque autre facteur est :
 * - sans paramètre, et non nul sur le segment (`x` sur [1 ; 2]) ;
 * - ou une somme P + Q, P sans paramètre et > 0 sur le segment, Q ⩾ 0 quelle
 *   que soit la valeur des paramètres (`x^2 + a^2` sur [1 ; 2]).
 * Dans le doute, `false` : le refus reste (`x^2 - a`, `a x^2 + 1`, `x - a`).
 */
function nonZeroOnSegment(
	denominator: MathNode,
	variable: string,
	parameters: readonly string[],
	segment: Segment
): boolean {
	return variableFactors(denominator, variable).every((factor) =>
		citedParameters(factor, parameters).length === 0
			? nonZeroOn(factor, variable, segment)
			: positiveSumOnSegment(factor, variable, parameters, segment)
	);
}

/**
 * Strictement positive sur le segment pour toute valeur des paramètres :
 * toujours positive (`a^2 + 1`), sans paramètre et > 0 sur le segment, ou une
 * somme P + Q (voir `positiveSumOnSegment`). Dans le doute, `false`.
 */
function positiveOnSegment(
	node: MathNode,
	variable: string,
	parameters: readonly string[],
	segment: Segment
): boolean {
	if (isPositive(node)) return true;
	if (citedParameters(node, parameters).length === 0) return positiveOn(node, variable, segment);
	return positiveSumOnSegment(node, variable, parameters, segment);
}

/** P + Q, P sans paramètre et > 0 sur le segment, Q sans x et ⩾ 0 (`x^2 + a^2` sur [1 ; 2]). */
function positiveSumOnSegment(
	node: MathNode,
	variable: string,
	parameters: readonly string[],
	segment: Segment
): boolean {
	const terms = signedTerms(node);
	const withVariable = terms.filter((t) => getVariables(t).has(variable));
	const constant = terms.filter((t) => !getVariables(t).has(variable));
	if (withVariable.length === 0) return false;
	if (withVariable.some((t) => citedParameters(t, parameters).length > 0)) return false;
	if (!constant.every(isNonNegative)) return false;
	return positiveOn(
		withVariable.reduce((sum, term) => add(sum, term)),
		variable,
		segment
	);
}

/** Les facteurs d'un produit qui contiennent la variable : `a x (x+1)^2` → x, x + 1. */
function variableFactors(node: MathNode, variable: string): MathNode[] {
	if (node.type === 'delimiter') return variableFactors(node.content, variable);
	if (node.type === 'opposite') return variableFactors(node.operand, variable);
	if (node.type === 'multiplication') {
		return [...variableFactors(node.left, variable), ...variableFactors(node.right, variable)];
	}
	if (node.type === 'superscript' && isNumber(node.superscript)) {
		return variableFactors(node.base, variable);
	}
	return getVariables(node).has(variable) ? [node] : [];
}

/** Les termes d'une somme, une soustraction lue comme l'ajout de l'opposé. */
function signedTerms(node: MathNode): MathNode[] {
	if (node.type === 'delimiter') return signedTerms(node.content);
	if (node.type === 'addition') return [...signedTerms(node.left), ...signedTerms(node.right)];
	if (node.type === 'subtraction') {
		return [...signedTerms(node.left), ...signedTerms(node.right).map((t) => opposite(t))];
	}
	return [node];
}

/** Une expression sans paramètre, définie et non nulle en tout point du segment. */
function nonZeroOn(factor: MathNode, variable: string, segment: Segment): boolean {
	const result = computeDomain(divide(number('1'), factor, 'fraction'), variable);
	if ((result.unresolved?.length ?? 0) > 0) return false;
	const inside = intervalSet([closedInterval(numericNode(segment.low), numericNode(segment.high))]);
	return isEmpty(domainDifference(inside, expandExcludedPoints(result.domain)));
}

/**
 * Strictement positive sur le segment : non nulle en tout point (donc d'un seul
 * signe, l'expression étant continue là où elle est définie), positive au milieu.
 */
function positiveOn(node: MathNode, variable: string, segment: Segment): boolean {
	if (!nonZeroOn(node, variable, segment)) return false;
	try {
		return compile(node)({ [variable]: (segment.low + segment.high) / 2 }) > 0;
	} catch {
		return false;
	}
}

/** Les paramètres du coefficient dominant d'un polynôme en `unknown`. */
function leadingParameters(
	polynomial: MathNode,
	degree: number,
	unknown: string,
	parameters: readonly string[]
): string[] {
	try {
		const leading = simplify(differentiateN(polynomial, degree, { variable: unknown })).result;
		return citedParameters(leading, parameters);
	} catch {
		return [];
	}
}

/** Les paramètres qui multiplient (ou divisent) l'inconnue : `a x`, `x/a`. */
function multipliedParameters(
	ast: MathNode,
	unknown: string,
	parameters: readonly string[]
): string[] {
	const found = new Set<string>();
	const withUnknown = (n: MathNode) => getVariables(n).has(unknown);
	mapNode(ast, (node) => {
		const pairs: (readonly [MathNode, MathNode])[] =
			node.type === 'multiplication'
				? [
						[node.left, node.right],
						[node.right, node.left]
					]
				: node.type === 'division'
					? [[node.numerator, node.denominator]]
					: [];
		for (const [carrier, factor] of pairs) {
			if (withUnknown(carrier) && !withUnknown(factor)) {
				for (const p of citedParameters(factor, parameters)) found.add(p);
			}
		}
		return node;
	});
	return parameters.filter((p) => found.has(p));
}

/** Les dénominateurs `\dfrac{…}{…}` d'une réponse en LaTeX. */
function latexDenominators(latex: string): string[] {
	const denominators: string[] = [];
	// La fin du groupe `{…}` ouvert en `from`, -1 s'il ne se ferme pas
	const groupEnd = (from: number): number => {
		let depth = 0;
		for (let i = from; i < latex.length; i++) {
			if (latex[i] === '{') depth++;
			else if (latex[i] === '}' && --depth === 0) return i;
		}
		return -1;
	};
	for (const match of latex.matchAll(/\\d?frac\{/g)) {
		const numeratorEnd = groupEnd(match.index + match[0].length - 1);
		if (numeratorEnd === -1 || latex[numeratorEnd + 1] !== '{') continue;
		const denominatorEnd = groupEnd(numeratorEnd + 1);
		if (denominatorEnd !== -1) denominators.push(latex.slice(numeratorEnd + 2, denominatorEnd));
	}
	return denominators;
}

/**
 * Le LaTeX du résultat de `.intégrer`, lu sur la première ligne du moteur :
 * `∫[a→b] … = v` (valeur exacte), `∫[a→b] … ≈ v` (approchée), sinon une
 * primitive, `∫ … = F + C` — la constante y reste, comme dans le texte.
 */
function integralLatex(ast: MathNode, text: string): string {
	const firstLine = text.split('\n')[0] ?? '';
	// `\ln\left| u \right|`, comme les étapes (revue du 2026-10-13) — affichage
	// seul : la garde de concordance compare `ast`, des valeurs
	const latex = collapseLnAbs(toLatex(ast));
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
	return resultWithDecimalComma(computeInput(session, text, provenance));
}

/**
 * Ce qu'affiche une ligne, décimaux écrits à la française (`0,5`, `0{,}5`).
 *
 * L'arbre (`ast`) et l'écho (`input`) ne sont pas convertis.
 */
function resultWithDecimalComma(result: CalcResult): CalcResult {
	switch (result.kind) {
		case 'calcul':
			return {
				...result,
				output: decimalCommaText(result.output),
				...(result.latex !== undefined && { latex: decimalCommaLatex(result.latex) }),
				...alternativeWithDecimalComma(result.alternative),
				...(result.note !== undefined && { note: decimalCommaProse(result.note) })
			};
		case 'commande':
			return {
				...result,
				output: decimalCommaText(result.output),
				...(result.latex !== undefined && { latex: decimalCommaLatex(result.latex) }),
				...(result.steps !== undefined && { steps: result.steps.map(decimalCommaStep) }),
				...(result.summary !== undefined && { summary: result.summary.map(decimalCommaStep) }),
				...(result.table !== undefined && { table: decimalCommaDeep(result.table) }),
				...(result.note !== undefined && { note: decimalCommaProse(result.note) }),
				...alternativeWithDecimalComma(result.alternative)
			};
		// La commande que cite un refus se relit avec ses virgules
		// (`decimalCommaInput`) : il les écrit, comme le reste de la ligne
		case 'refus':
			return {
				...result,
				message: decimalCommaProse(result.message),
				...(result.note !== undefined && { note: decimalCommaProse(result.note) }),
				...(result.steps !== undefined && { steps: result.steps.map(decimalCommaStep) }),
				...(result.summary !== undefined && { summary: result.summary.map(decimalCommaStep) })
			};
		default:
			return result;
	}
}

/** L'autre écriture d'une ligne, décimaux à la française comme la ligne elle-même. */
function alternativeWithDecimalComma(alternative: Alternative | undefined): {
	alternative?: Alternative;
} {
	return alternative === undefined
		? {}
		: { alternative: { ...alternative, latex: decimalCommaLatex(alternative.latex) } };
}

/**
 * La version résumée des étapes, quand la commande en a une (interrupteur
 * « Résumé / Détaillé » du dépliage) — sinon rien, pas de clé `undefined`.
 */
function summaryField(source: { readonly summary?: readonly RenderedStep[] }): {
	summary?: readonly RenderedStep[];
} {
	return source.summary === undefined ? {} : { summary: source.summary };
}

/** Le nom d'une carte dans les étapes : `f^-1` s'écrit `f^{-1}` en LaTeX. */
function latexName(name: string): string {
	const base = reciprocalOf(name);
	return base === null ? name : `${base}^{-1}`;
}

/**
 * « Réciproque » sur la carte de `name` : la même ligne que `.réciproque name`
 * (carte `f⁻¹` comprise), décimaux à la française.
 */
export function runReciprocal(session: CalcSession, name: string): CalcResult {
	syncEngine(session.atelier, session.engine);
	return resultWithDecimalComma(
		reciprocalResult(session.atelier, name, undefined, `.réciproque ${name}`)
	);
}

/** Une action, décimaux à la française — même règle que `resultWithDecimalComma`. */
function outcomeWithDecimalComma(outcome: ActionOutcome): ActionOutcome {
	if (!outcome.ok) return outcome;
	return {
		...outcome,
		output: decimalCommaText(outcome.output),
		...(outcome.latex !== undefined && { latex: decimalCommaLatex(outcome.latex) }),
		...(outcome.steps !== undefined && { steps: outcome.steps.map(decimalCommaStep) }),
		...(outcome.summary !== undefined && { summary: outcome.summary.map(decimalCommaStep) }),
		...(outcome.table !== undefined && { table: decimalCommaDeep(outcome.table) }),
		...alternativeWithDecimalComma(outcome.alternative)
	};
}

/**
 * `u(1,5)` sur une suite EXPLICITE : la virgule est décimale, et un rang
 * décimal n'existe pas. Le moteur, lui, rendait 3 pour `u(n) = 2n`. Même
 * message que pour une récurrence (`recurrenceTermsIn`).
 */
function decimalRankMessage(atelier: Atelier, input: string): string | null {
	for (const [, name, rank] of input.matchAll(TERM)) {
		if (atelier.get(name)?.kind !== 'sequence') continue;
		if (/^\s*[-−]?\d+[.,]\d+\s*$/.test(rank)) {
			return `Le rang de ${name} doit être un entier positif : ${name}(5), pas ${name}(${rank.trim()}).`;
		}
	}
	return null;
}

/** `2,5 h en min` : une grandeur, « en », une unité — rien d'autre (pas de `=`). */
const NATURAL_CONVERSION = /^([^=]*\d[^=]*?)\s+en\s+([^\s=]+)$/;

/**
 * La grandeur et l'unité d'une conversion écrite d'un trait (décision 8 de
 * David, 2026-10-13 : « conversion naturelle `2,5 h en min` »), ou `null`.
 * Mesuré le 2026-10-14 : sans elle, la ligne se lisait comme un produit et
 * montrait « 2,5 h e n m i n », sans refus.
 */
function naturalConversion(input: string): { quantity: string; unit: string } | null {
	const match = NATURAL_CONVERSION.exec(input);
	if (match === null || parseUnit(match[2]) === null) return null;
	return { quantity: match[1].trim(), unit: match[2] };
}

/**
 * Le moteur où la partie gauche d'une conversion est d'abord ESSAYÉE : calculer
 * sur le moteur de l'élève change sa dernière grandeur (`3` l'efface), et une
 * ligne refusée ne doit rien changer (revue : `5 km`, `3 en m` refusé, puis
 * `.convertir m` ne trouvait plus les 5 km). Les objets de l'atelier y sont
 * poussés par `syncEngine`, comme sur tout moteur.
 */
let probeEngine: WebReplEngine | null = null;

/**
 * La grandeur calculée, puis convertie : la même réponse que la ligne suivie de
 * `.convertir`, qui convertit la DERNIÈRE grandeur du moteur. Une partie gauche
 * en erreur rend son erreur (`1/0`, `2 h 30`) ; un calcul juste qui n'est pas
 * une grandeur (`3 en m`) est refusé en la citant — le moteur dirait « calcule
 * d'abord une grandeur », qui ne parle pas de la ligne tapée.
 */
function convertNaturally(
	session: CalcSession,
	input: string,
	conversion: { quantity: string; unit: string },
	provenance: Provenance
): CalcResult {
	probeEngine ??= new WebReplEngine();
	const probe = computeInput({ ...session, engine: probeEngine }, conversion.quantity, provenance);
	if (probe.kind !== 'calcul' || probe.ast === undefined) return probe;
	if (findNodes(probe.ast, isUnit).length === 0) {
		return {
			kind: 'refus',
			message: `« ${conversion.quantity} » n'est pas une grandeur : il n'y a rien à convertir en ${conversion.unit}.`
		};
	}
	computeInput(session, conversion.quantity, provenance);
	const converted = runCommand(session, `.convertir ${conversion.unit}`);
	return converted.kind === 'commande' ? { ...converted, input } : converted;
}

function computeInput(session: CalcSession, text: string, provenance: Provenance): CalcResult {
	// `f^-1`, `f^(-1)`, `f⁻¹` d'une fonction de l'atelier : écrits `f^{-1}`, la
	// réciproque que lisent les parseurs (décision (1) de David, 2026-10-13)
	// `ln\left(x\right)` de MathLive : ln de x, pas l·n·(x) (`withLatexFunctionNames`)
	const input = withReciprocalNotation(session.atelier, withLatexFunctionNames(text.trim()));
	if (input === '') return { kind: 'vide' };

	// Avant tout chemin — commande, définition, calcul : tous lisent `pi` p·i
	if (PI_IN_LETTERS.test(input)) return { kind: 'refus', message: PI_IN_LETTERS_MESSAGE };

	// Avant tout chemin aussi : `racine(x)`, `acoss(x)` se lisaient en produits
	// de lettres, sans erreur. Une commande le vérifie sur son argument de
	// CALCUL (`runCommand`) : les commandes de données lisent des modalités.
	if (!input.startsWith('.')) {
		// V59 : `ln x`, `sin x` se lisaient l·n·x, s·i·n·x, sans erreur — ligne
		// de calcul comme définition. Une commande le vérifie sur son argument
		// Sauf une liste de mots (`L = sin; cos; ln`), que la carte accepte aussi
		const bare = isSemicolonList(input) ? null : bareFunctionRefusal(input);
		if (bare !== null) return { kind: 'refus', message: bare };
		if (EVENT_PROBABILITY.test(input)) return eventProbability(session.atelier, input);
		// `f⁻¹(5)` : f sans réciproque, ou 5 hors de l'ensemble de départ de f⁻¹
		const defined = reciprocalDefinitionRefusal(session.atelier, input);
		if (defined !== null) return { kind: 'refus', message: defined };
		const inverse = reciprocalRefusalIn(session.atelier, input, provenance);
		if (inverse !== null) return { kind: 'refus', ...inverse };
		// Une fonction de la grille (`mediane(L)`, `médiane(L)`, `nb.si(…)`) : le
		// moteur la recopiait sans la calculer, ou lisait « diane » (2026-10-15)
		const gridCall = gridFunctionCalledIn(input);
		if (gridCall !== null) return { kind: 'refus', message: gridCall };
		const unknown = findUnknownFunctionCall(input);
		if (unknown !== null) {
			// Une fonction de la grille (SOMME, RACINE…) : dire où elle vit (Q-L4-6)
			const grid = gridFunctionInCalcul(unknown);
			return { kind: 'refus', message: grid ?? unknownFunctionMessage(unknown) };
		}
	}

	syncEngine(session.atelier, session.engine);

	// Entrée BRUTE : `runCommand` ne réécrit `π` qu'en argument d'une commande
	// de calcul (`.filtrer L = π` lit une modalité), et l'écho reste ce qui a
	// été tapé (revue #911)
	if (input.startsWith('.')) return withListsByRow(session, input);

	const conversion = naturalConversion(input);
	if (conversion !== null) return convertNaturally(session, input, conversion, provenance);

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
		// Une suite se règle par son premier indice, pas par un ensemble
		if (splitInterval(body, readingMode(provenance)).written !== null) {
			return { kind: 'refus', message: ONLY_FUNCTIONS };
		}
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

	// Géométrie : `d : y = 3x − 2` (G0, G5), avant d'y lire une division
	const curve = defineCurve(session, input, provenance);
	if (curve !== null) return curve;

	const definition = DEFINITION.exec(input);
	if (definition !== null) {
		const [, name, parameter, typedBody] = definition;
		const existingObject = session.atelier.get(name);
		if (parameter === undefined) {
			// Q1 (a) : `y` est réservé aux équations (G5) — sauf un couple, refusé comme tout nom réservé
			if (name === 'y' && !looksLikePoint(typedBody)) {
				return { kind: 'refus', message: reservedYDefinition(session.atelier, typedBody) };
			}
			// `A = (1 ; 2)` : un point (G3), plus le refus des couples (#983)
			if (looksLikePoint(typedBody)) return definePoint(session, name, typedBody, provenance);
			// Un point, une courbe gardent leur type (V62) : `A = 5` ne les change pas
			if (existingObject?.kind === 'point' || existingObject?.kind === 'curve') {
				return kindKeptRefusal(name, existingObject.kind);
			}
		}
		// `f(x) = x^2 sur [0;+∞[` : l'ensemble est lu à part (`interval.ts`)
		const { body, written } = splitInterval(typedBody, readingMode(provenance));
		// Le type rangé ne change pas : `a = x^2 sur [0;1]` sur une valeur `a` perdait « sur » en silence
		const existingKind = session.atelier.get(name)?.kind;
		if (
			written !== null &&
			(kindOf(parameter, body) !== 'function' ||
				(existingKind !== undefined && existingKind !== 'function'))
		) {
			return { kind: 'refus', message: ONLY_FUNCTIONS };
		}
		// I4 aussi dans une définition : `a = f(5)` avec f sur [0 ; 2]
		const outsideInDefinition = outsideIntervalRefusal((n) => session.atelier.get(n), body);
		if (outsideInDefinition !== null) return { kind: 'refus', message: outsideInDefinition };
		const commaList = parameter === undefined ? commaListRefusal(name, body) : null;
		if (commaList !== null) return { kind: 'refus', message: commaList };
		const bracketed = parameter === undefined ? bracketedListRefusal(name, body) : null;
		if (bracketed !== null) return { kind: 'refus', message: bracketed };
		// `f(x) = max(1,2)+x` : la virgule est décimale, comme sur une ligne de calcul
		const commaRefused = commaRefusal(body, input);
		if (commaRefused !== null) return { kind: 'refus', message: commaRefused };
		// `A = (1 ; 2)` : le refus d'une saisie (#983), pas un objet en erreur
		const typed = coupleOrSetRefusal(body);
		if (typed !== null) return { kind: 'refus', message: typed };
		const result = defineObject(session, name, parameter, body, provenance, written);
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

	// P5 : `A(1 ; 2)` — l'aide, au lieu de « Il manque « ) » »
	const pointCall = pointCallRefusal(session.atelier, input);
	if (pointCall !== null) return { kind: 'refus', message: pointCall };
	// P4, P9 : `A` répond ses coordonnées, `A + 1` est refusé
	const figure = figureLine(session, input);
	if (figure !== null) return figure;

	// V58 : un objet en erreur cité (`f(2)`, `f'(2)`, `a+1`) — le moteur ne le
	// connaît pas et disait « Fonction inconnue : f — définis-la d'abord ».
	// `g(x) = f⁻¹(x)` en erreur (f plus bijective) : la carte g porte la raison
	const broken = brokenObjectRefusal(session.atelier, input);
	if (broken !== null) return { kind: 'refus', message: broken };
	// ⚠️ Une dérivée d'objet indisponible se refuse ICI, en français : laissée au
	// moteur, elle rendait « Unexpected token: ' » — un message de parseur.
	const blocked = derivativeOfUnusable(session, input);
	if (blocked !== null) return { kind: 'refus', message: blocked };

	// I4 : `f(5)` avec f sur [0 ; 2] se refuse, le moteur ne connaît pas l'ensemble
	const outside = outsideIntervalRefusal((n) => session.atelier.get(n), input);
	if (outside !== null) return { kind: 'refus', message: outside };

	// S3 : les termes d'une récurrence (`u(5)`) sont calculés ici, puis passés au
	// moteur comme des nombres — il ne sait pas itérer une récurrence
	const withTerms = recurrenceTermsIn(session.atelier, input);
	if (!withTerms.ok) return { kind: 'refus', message: withTerms.message };

	const citedList = listCitedAsNumber(session.atelier, input);
	if (citedList !== null) return { kind: 'refus', message: citedList };

	// Le moteur répondrait « Invalid backslash sequence », en anglais (revue #911)
	const mixed = mixedNotationMessage(input);
	if (mixed !== null) return { kind: 'refus', message: mixed };

	// `f'(2)` doit valoir 1 : le moteur ne sait pas lier `f'`, l'atelier traduit.
	// La règle de la virgule (décision de David, 2026-10-09) : `12,15,9`,
	// `max(1,2)` et le couple `(1 ; 2)` sont refusés en français, plutôt que de
	// montrer la réponse du moteur (« x\cdot .3 », une ligne jamais tapée)
	// `(1 ; 2)` seul : un point à qui il manque un nom (G3) — un triplet, un
	// couple dans un calcul gardent le refus des couples
	if (looksLikePoint(input) && splitCoordinates(input).ok) {
		return {
			kind: 'refus',
			message: `Pour définir un point, nomme-le : ${nextName('point', session.atelier.names)} = ${input.trim()}.`
		};
	}
	const commaRefused = commaRefusal(withTerms.text, input, { couples: true });
	if (commaRefused !== null) return { kind: 'refus', message: commaRefused };
	const rank = decimalRankMessage(session.atelier, withTerms.text);
	if (rank !== null) return { kind: 'refus', message: rank };

	// « un nombre, une espace, une unité » est une grandeur (lot C des grandeurs)
	const reading = readNaturalQuantities(decimalCommaInput(withTerms.text), session.atelier.names);
	const misread = naturalReadingRefusal(session.atelier, reading);
	if (misread !== null) return misread;
	// `f(2)` d'une fonction à paramètre → `2a` (V56) ; AVANT `expandInput`,
	// qui développerait `f'(2)` en `2 a * 2`, sans le réduire
	const line = parameterizedLine(session, withPiCommand(reading.text));
	if (line.kind === 'refus') return { kind: 'refus', message: line.message };
	if (line.kind === 'division-by-zero') {
		return { kind: 'calcul', input, output: 'Erreur de calcul : Division par zéro' };
	}
	const result = session.engine.execute(expandInput(session.atelier, line.text));
	// Une cellule de la grille (`B2+1`) : Calcul ne la lit pas (tableur, Q1). Dit
	// seulement quand le calcul échoue — « Nombre 2 écrit après un facteur »
	// faisait chercher une faute de frappe
	const cell = result.success ? null : cellCitedIn(input);
	if (cell !== null) return { kind: 'refus', message: cellInCalculMessage(cell) };
	// Des grandeurs qui ne se combinent pas : un refus, en français (lot A),
	// avec l'aide d'une lettre lue comme unité (`3 t + 2`)
	if (!result.success && STUDENT_FACING_ERRORS.has(result.error?.code ?? '')) {
		const message = result.error?.message ?? UNREADABLE_COMMAND;
		return {
			kind: 'refus',
			message,
			...notesOf(message.includes(UNITLESS) ? singleLetterHint(reading.singleLetters) : null)
		};
	}
	const rendered = renderResult(result);
	return {
		kind: 'calcul',
		input,
		output: rendered.text,
		...(rendered.latex && { latex: approximatedLatex(result, rendered.latex) }),
		// « Garder » range la grandeur exacte, pas son écriture juxtaposée (`2 h 30 min`)
		...(result.success &&
			(result.quantityAst ?? result.ast) !== undefined && {
				ast: result.quantityAst ?? result.ast
			}),
		...calculationAlternative(result),
		...notesOf(...reading.notes, tooLongNote(result))
	};
}

/**
 * Pourquoi la ligne garde l'écriture tapée : son résultat exact serait trop long (option A
 * de David, 2026-10-12). Le nombre de chiffres, arrondi à deux chiffres significatifs, avec
 * une espace fine insécable (« 6 000 » ne se coupe pas en fin de ligne).
 */
function tooLongNote(result: ReplExecutionResult): string | null {
	if (!result.success || result.exactTooLong === undefined) return null;
	const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(result.exactTooLong)) - 1);
	const rounded = Math.round(result.exactTooLong / magnitude) * magnitude;
	const written = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
	return `Valeur exacte trop longue (environ ${written} chiffres) : elle reste écrite telle quelle.`;
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
	return outcomeWithDecimalComma(computeAction(session, actionId, name, argument));
}

function computeAction(
	session: CalcSession,
	actionId: string,
	name: string,
	argument?: string
): ActionOutcome {
	const { atelier, engine } = session;
	syncEngine(atelier, engine);

	// Une fonction à paramètre (`f(x) = a x`) : son expression, a gardé en
	// lettre — le bouton dit ce que dit la commande (Q4, David, 2026-10-14)
	const object = atelier.get(name);
	const parameters = object === undefined ? null : parametersOf(object);
	const substituted = expressionOf(atelier, name, { forDerivation: parameters !== null });
	// Le message vient de l'objet : le panneau et l'action disent la même chose.
	if (!substituted.ok) return { ok: false, message: substituted.message };
	if (parameters !== null && (actionId === 'solve' || actionId === 'variations')) {
		return { ok: false, message: dependsOnMessage(parameters) };
	}

	if (actionId === 'image') {
		const value = argument === undefined ? null : readNumber(argument);
		if (value === null) {
			return { ok: false, message: `« ${argument ?? ''} » n'est pas un nombre.` };
		}
		// I4 : hors de l'ensemble de la fonction, pas d'image
		const domain = intervalDomainOf(atelier.get(name));
		if (domain !== null && !containsValue(domain, value)) {
			return {
				ok: false,
				message: outsideIntervalMessage(displayName(name), (argument ?? '').trim(), domain)
			};
		}
		// À paramètre : `f(2)` → `2a`, comme la ligne tapée (`parameterizedLine`)
		if (parameters !== null) {
			const line = parameterizedLine(session, `${name}(${value})`);
			if (line.kind === 'refus') return { ok: false, message: line.message };
			const computed = line.kind === 'text' ? engine.execute(line.text) : null;
			if (computed === null || !computed.success) {
				return { ok: false, message: `Impossible de calculer ${displayName(name)}(${argument}).` };
			}
			return { ok: true, output: renderResult(computed).text };
		}
		// Ici, citer le nom est SÛR et mesuré : `f(2)` rend `-1`. C'est le chemin
		// d'évaluation, pas une commande symbolique — la substitution du §6 bis ne
		// concerne que les secondes.
		// La carte `f⁻¹` s'appelle `f^-1`, que le moteur lirait comme une puissance :
		// on lui donne sa formule, x remplacé (lot 3 de la réciproque). De même la
		// carte `f′` : le moteur lit `f'(1)` comme la dérivée d'une fonction qu'il
		// n'a pas, « Impossible de calculer f′(1) » (mesuré le 2026-10-14)
		const byFormula = reciprocalOf(name) !== null || derivativeOf(name) !== null;
		const formula = byFormula ? astOf(substituted.expression, 'text') : null;
		if (byFormula && formula === null) {
			return { ok: false, message: `Impossible de calculer ${displayName(name)}(${argument}).` };
		}
		const result = engine.execute(
			formula === null
				? `${name}(${value})`
				: toCustom(substitute(formula, { [INTERNAL_LETTER]: numericNode(value) }))
		);
		if (!result.success) {
			return { ok: false, message: `Impossible de calculer ${displayName(name)}(${argument}).` };
		}
		const rendered = renderResult(result);
		// La ligne de l'image a son bouton ≈, comme `f(2)` tapé
		return {
			ok: true,
			output: rendered.text,
			...(rendered.latex && { latex: approximatedLatex(result, rendered.latex) }),
			...calculationAlternative(result)
		};
	}

	const build = ACTION_COMMANDS[actionId];
	if (build === undefined) {
		return { ok: false, message: `L'action « ${actionId} » n'est pas encore disponible.` };
	}

	// Lot 2 de l'intervalle : « Résoudre » et « Variations » sur l'ensemble de
	// la fonction (f′ a celui de f), passé au moteur par `dans`, comme la commande
	const studied =
		actionId === 'solve' || actionId === 'variations' ? intervalDomainOf(atelier.get(name)) : null;
	const within = studied === null ? null : formatInterval(studied);
	const command = build(substituted.expression) + (within === null ? '' : ` dans ${within}`);
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
		const solved = solveSteps(`${substituted.expression}=0`, studied ?? undefined);
		if (solved !== null) {
			return {
				ok: true,
				output: rendered.text,
				latex: solved.answer,
				steps: solved.steps,
				...summaryField(solved),
				...stepsAlternative(solved)
			};
		}
		// Pas d'étapes : les solutions du moteur en LaTeX, comme `.résoudre`
		if (result.success && result.latex !== undefined) {
			return {
				ok: true,
				output: rendered.text,
				latex: result.latex,
				...solutionsAlternative(result)
			};
		}
	}

	// ⚠️ Même histoire pour les variations : le moteur rendait « Derivee »,
	// « decroissante », « Signe de f'(x) » alignés à l'espace, sans un accent —
	// alors que `VariationTable.svelte` dessine le tableau depuis toujours.
	// ⚠️ « Dériver » rendait la notation d'un terminal : `d/dx(x^2*sin(x)) = …`,
	// avec un `:/` parasite sur les quotients et aucune règle nommée.
	if (actionId === 'derive') {
		const derived = deriveSteps(substituted.expression, latexName(name));
		if (derived !== null) {
			return {
				ok: true,
				output: rendered.text,
				latex: derived.answer,
				steps: derived.steps,
				...summaryField(derived)
			};
		}
	}

	// Le même rendu que `.variations` tapé : dérivée, détail, tableau
	if (actionId === 'variations') {
		const rendering = variationsRendering(substituted.expression, latexName(name), 'x', within);
		if (rendering !== null) {
			return {
				ok: true,
				output: rendered.text,
				latex: rendering.answer,
				steps: rendering.steps,
				...(rendering.table !== undefined && { table: rendering.table })
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
