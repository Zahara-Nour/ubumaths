/**
 * Atelier — une fonction définie sur un intervalle : `f(x) = x^2 sur [0;+∞[`.
 *
 * Phase 0 `docs/archive/wip/atelier-intervalle-phase0.md` (I1-I6, validée le
 * 2026-10-13), lot 1. L'ensemble s'écrit dans le même champ que la définition,
 * après le mot « sur » ; il est lu par `parseStudentDomain`, le parseur des
 * réponses d'élève (intervalles, réunions, `ℝ \ {0}`, `ℝ₊`…).
 *
 * L'objet range l'ÉCRITURE de l'élève (`FunctionObject.interval`), relue à la
 * demande : la même chaîne sert à réafficher le champ et à retrouver l'ensemble.
 *
 * ⚠️ Mesuré dans Chromium (`intervalle-champ.svelte.test.ts`) : MathLive écrit
 * « sur » en trois lettres collées à ce qui précède (`x^2sur[0;1]`) et retire les
 * espaces. Le mot se reconnaît donc à ce qui le SUIT (un ensemble), pas à un
 * blanc devant : `surface` ou `s·u·r·x` ne sont pas coupés.
 *
 * @module atelier/interval
 */

import type { AtelierObject } from './types';
import { MAX_INTERVAL_LENGTH } from './types';
import type { Domain, Endpoint, Interval } from '$lib/mathAST/domain/types';
import type { MathNode } from '$lib/mathAST/types';
import { parseStudentDomain } from '$lib/mathAST/domain/validation/parse-student-domain';
import { expandExcludedPoints } from '$lib/mathAST/domain/validation/compare-domains';
import { computeDomain } from '$lib/mathAST/domain/compute';
import {
	containsValue,
	difference,
	intersect,
	isEmpty,
	isUniversal
} from '$lib/mathAST/domain/algebra';
import { formatEndpointValue, formatInterval } from '$lib/mathAST/domain/format';
import { bound, endpointToNumber } from '$lib/math/intervals';
import { divide, number, subtract } from '$lib/mathAST/factory';
import { polynomialCoefficients } from '$lib/mathAST/normal/canonical-form';
import { computeNumericValue } from '$lib/mathAST/eval/numeric-value';
import { exactValueToShow } from '$lib/mathAST/eval/exact-value';
import type { CurvePiece } from '$lib/grapheur/restriction';
import { evaluate } from '$lib/mathAST/eval';
import { substitute } from '$lib/mathAST/eval/substitute';
import { constantOf } from './constant';
import { toCustom } from '$lib/mathAST/custom-generator';
import {
	astOf,
	readingMode,
	readNumber,
	referencesOf,
	variablesOf,
	type ReadingMode
} from './parse';
import type { Provenance } from './parse';
import { INTERNAL_LETTER, renameVariableIn } from './letter';
import { derivativeOf, displayName, reciprocalOf } from './names';

// =============================================================================
// Types
// =============================================================================

/** Une saisie coupée au mot « sur » : la définition, et l'ensemble écrit après (`null` sans « sur »). */
export interface SplitDefinition {
	readonly body: string;
	readonly written: string | null;
}

/** L'ensemble lu : `null` pour ℝ (rien à retenir), ou le refus en français. */
export type ReadInterval =
	| { readonly ok: true; readonly domain: Domain | null }
	| { readonly ok: false; readonly message: string };

/** L'écriture à ranger (`undefined` pour ℝ), ou le refus. */
export type CheckedInterval =
	| { readonly ok: true; readonly interval: string | undefined }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

export const UNREADABLE_INTERVAL =
	"Je n'ai pas su lire l'intervalle : écris par exemple sur [0;+∞[.";

export const ONLY_FUNCTIONS = 'Seule une fonction se définit sur un intervalle.';

/** « sur » écrit en mot par MathLive ou par la carte (`\text{ sur }`). */
const SUR_AS_TEXT = /\\(?:text|textrm|mathrm|operatorname)\s*\{\s*sur\s*\}/g;

/**
 * Le mot « sur ». En LaTeX (champ MathLive), collé à ce qui précède (`x^2sur`),
 * jamais une commande (`\surd`). En texte, un mot entier. Dans les deux cas,
 * c'est ce qui SUIT qui décide (`SET_START`).
 */
const SUR_IN_LATEX = /(?<!\\)sur/g;
const SUR_IN_TEXT = /(?<![A-Za-z\\])sur(?![A-Za-z])/g;

/**
 * Le début d'un ensemble que `parseStudentDomain` lit : un crochet (aussi en
 * LaTeX), une accolade échappée, ℝ (`ℝ`, `\R`, `\mathbb{R}`, `R` seul, `R*`,
 * `R+`). `\left` compte seulement devant un crochet ou une accolade :
 * `\left(` et `\left|` (smartFence) sont des parenthèses, pas un ensemble.
 * Sans lui, « sur » n'est pas le mot de l'intervalle : `a = 3 sur 4`,
 * `x^{sur}`, `\text{surélevé}` restent entiers, comme avant le lot 1.
 */
const SET_START =
	/^(?:\\[,;:! ]|~|\s)*(?:\[|\]|\\left(?:\[|\]|\\lbrack|\\rbrack|\\\{|\\lbrace)|\\lbrack|\\rbrack|\\\{|\\lbrace|ℝ|\\R(?![A-Za-z])|\\mathbb|R(?![A-Za-z0-9]))/;

/**
 * `ℝ\{1}` tapé collé : le parseur y lirait l'accolade échappée de LaTeX. En
 * texte, c'est la différence `ℝ \ {1}` (revue de #1337). `\R\{1\}` (LaTeX,
 * accolade fermante échappée) n'est pas touché.
 */
const GLUED_SETMINUS = /(ℝ|(?<![A-Za-z\\])R|\\R)\\\{([^{}\\]*)\}/g;

/** Seulement des espaces après « sur » : l'élève est en train de l'écrire. */
const NOTHING_YET = /^(?:\\[,;:! ]|~|\s)*$/;

/**
 * Un appel `f(…)` sans parenthèse dans l'argument — la forme de `TERM`
 * (`calcul.ts`) —, dérivée comprise (`f'(5)`, `f′(5)` : f′ hérite de
 * l'ensemble de f, lot 2).
 */
const CALL = /(?<![A-Za-z_\\])([A-Za-z](?:_\d+)?)(['′]*)\(([^()]*)\)/g;

/** Un nom de fonction cité, dérivée comprise : `f`, `f'`, `f′`, `f_1`. */
const CITED_NAME = /(?<![A-Za-z_\\])([A-Za-z](?:_\d+)?)(['′]*)/g;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Où commence le mot « sur » d'un intervalle, et ce qui le suit — ou `null`.
 *
 * @param typing - Accepter aussi « sur » en fin de saisie (rien encore derrière) :
 *   la carte coupe `smartFence` avant que le crochet ne soit tapé.
 */
export function intervalWord(
	typed: string,
	mode: ReadingMode,
	typing = false
): { readonly before: string; readonly after: string } | null {
	const text = typed.replace(SUR_AS_TEXT, ' sur ');
	for (const match of text.matchAll(mode === 'latex' ? SUR_IN_LATEX : SUR_IN_TEXT)) {
		const after = text.slice(match.index + match[0].length);
		if (SET_START.test(after) || (typing && NOTHING_YET.test(after))) {
			return { before: text.slice(0, match.index), after };
		}
	}
	return null;
}

/** Couper une saisie au mot « sur » suivi d'un ensemble ; sinon la saisie reste entière. */
export function splitInterval(typed: string, mode: ReadingMode): SplitDefinition {
	const word = intervalWord(typed, mode);
	if (word === null) return { body: typed, written: null };
	return { body: word.before.trim(), written: word.after.trim() };
}

/** Lire l'ensemble écrit après « sur ». */
export function readInterval(written: string, letter: string = INTERNAL_LETTER): ReadInterval {
	if (written.trim() === '' || written.length > MAX_INTERVAL_LENGTH) {
		return { ok: false, message: UNREADABLE_INTERVAL };
	}
	const read = parseStudentDomain(written.replace(GLUED_SETMINUS, '$1 \\ {$2}'), letter);
	if (!read.success) return { ok: false, message: UNREADABLE_INTERVAL };
	const domain = read.domain;
	if (isUniversal(domain)) return { ok: true, domain: null };
	if (isEmpty(domain)) return { ok: false, message: "L'intervalle est vide." };
	const points = isolatedPoints(domain);
	if (points === 1) return { ok: false, message: "L'intervalle est réduit à un point." };
	if (points > 1) return { ok: false, message: "L'ensemble est réduit à des points isolés." };
	return { ok: true, domain };
}

/**
 * L'ensemble à ranger pour une définition (déjà en x), ou le refus : illisible,
 * vide, réduit à un point, ou qui déborde du domaine de la fonction (I3).
 *
 * La définition qui cite d'autres objets n'est pas jugée sur son domaine : il
 * dépend de leurs valeurs.
 */
export function checkInterval(
	written: string,
	definition: string,
	provenance: Provenance,
	functionNames: readonly string[],
	letter: string = INTERNAL_LETTER
): CheckedInterval {
	const read = readInterval(written, letter);
	if (!read.ok) return read;
	if (read.domain === null) return { ok: true, interval: undefined };

	const ast = astOf(definition, provenance, functionNames);
	const cites = referencesOf(definition, provenance, functionNames).some(
		(r) => r.name !== INTERNAL_LETTER
	);
	if (ast === null || cites) return { ok: true, interval: written.trim() };

	const computed = computeDomain(ast, INTERNAL_LETTER);
	if (computed.unresolved !== undefined) return { ok: true, interval: written.trim() };
	const outside = difference(
		expandExcludedPoints(read.domain),
		expandExcludedPoints(computed.domain)
	);
	if (isEmpty(outside)) return { ok: true, interval: written.trim() };

	const shown = letter === INTERNAL_LETTER ? ast : renameVariableIn(ast, INTERNAL_LETTER, letter);
	const point = faultyPoint(outside);
	return {
		ok: false,
		message: `${toCustom(shown)} n'est pas défini sur tout ${intervalText(read.domain)}${point === null ? '' : ` (pas en ${point})`}.`
	};
}

/**
 * L'ensemble d'une fonction, ou `null` (pas une fonction, ou définie sur son
 * domaine) : le sien (`interval`) croisé avec celui qu'elle hérite des
 * fonctions qu'elle cite (`inheritedInterval`, décision d).
 */
export function intervalDomainOf(object: AtelierObject | undefined): Domain | null {
	if (object?.kind !== 'function') return null;
	const read =
		object.interval === undefined
			? null
			: readInterval(object.interval, object.letter ?? INTERNAL_LETTER);
	const own = read?.ok ? read.domain : null;
	const inherited = object.inheritedInterval ?? null;
	if (own === null || inherited === null) return own ?? inherited;
	return intersect(own, inherited);
}

/**
 * Décision d (2026-10-13) : ce que chaque fonction hérite des fonctions qu'elle
 * cite (`g(x) = f(x) + 1` → l'ensemble de f ; plusieurs → l'intersection), en
 * chaîne (`h = 2g`), et pour une dérivée celui de sa fonction — plus le refus
 * des définitions qu'on ne sait pas restreindre (`g(x) = f(2x)`, décision c)
 * ou dont l'ensemble est vide. Points fixes : un passage par maillon de chaîne.
 *
 * @param functionNames - Les noms citables, pour relire les définitions
 */
export function citedIntervals(
	objects: readonly AtelierObject[],
	functionNames: readonly string[],
	/** `g(x) = f⁻¹(x)` : l'ensemble de départ de f⁻¹, pas celui de f (`citedReciprocalInterval`). */
	withReciprocals?: (
		text: string,
		others: (text: string) => CitedInterval | null
	) => CitedInterval | null
): {
	inherited: Map<string, Domain>;
	refused: Map<string, string>;
	/** Les conditions des composées (`g(x) = f(2x)` → « 2x doit être dans [0 ; +∞[ ») */
	conditions: Map<string, readonly string[]>;
} {
	const inherited = new Map<string, Domain>();
	const refused = new Map<string, string>();
	const conditions = new Map<string, readonly string[]>();
	const byName = new Map(objects.map((o) => [o.name, o]));
	const get = (name: string): AtelierObject | undefined => {
		const object = byName.get(name);
		if (object?.kind !== 'function') return object;
		const { inheritedInterval: _stale, ...rest } = object;
		const domain = inherited.get(name);
		return domain === undefined ? rest : { ...rest, inheritedInterval: domain };
	};
	// La définition en texte, appels compris (`f(x)+1`), relue une seule fois
	const texts = new Map<string, string>();
	for (const o of objects) {
		if (o.kind !== 'function' || derivativeOf(o.name) !== null || reciprocalOf(o.name) !== null) {
			continue;
		}
		const ast = astOf(o.definition, o.provenance, functionNames);
		if (ast !== null) texts.set(o.name, toCustom(ast));
	}
	for (let pass = 0; pass <= objects.length; pass++) {
		let changed = false;
		refused.clear();
		conditions.clear();
		for (const o of objects) {
			if (o.kind !== 'function') continue;
			let domain: Domain | null = null;
			const derivative = derivativeOf(o.name);
			if (derivative !== null) {
				domain = inherited.get(derivative.base) ?? null;
			} else {
				const text = texts.get(o.name);
				if (text === undefined) continue;
				const others = (typed: string) =>
					citedIntervalDomain((n) => (n === o.name ? undefined : get(n)), typed, INTERNAL_LETTER);
				const cited = withReciprocals === undefined ? others(text) : withReciprocals(text, others);
				if (cited?.kind === 'composed') refused.set(o.name, composedMessage(cited));
				else if (cited !== null) {
					domain = cited.domain;
					if (cited.conditions.length > 0) {
						conditions.set(o.name, [...new Set(cited.conditions.map(conditionText))]);
					}
				}
			}
			const before = inherited.get(o.name);
			if (domain === null) {
				if (before !== undefined) {
					inherited.delete(o.name);
					changed = true;
				}
			} else if (before === undefined || JSON.stringify(before) !== JSON.stringify(domain)) {
				inherited.set(o.name, domain);
				changed = true;
			}
		}
		if (!changed) break;
	}
	for (const [name, domain] of inherited) {
		const effective = intervalDomainOf(get(name));
		if (refused.has(name) || effective === null || !isEmpty(effective)) continue;
		const why = isEmpty(domain)
			? "les ensembles des fonctions qu'elle cite n'ont aucun nombre en commun"
			: `les fonctions qu'elle cite ne le sont que sur ${intervalText(domain)}`;
		refused.set(name, `${displayName(name)} n'est définie nulle part : ${why}.`);
	}
	return { inherited, refused, conditions };
}

/** `.domaine f`, `.domaine f(x)`, `.domaine f'` : le nom visé. */
const DOMAIN_TARGET = /^([A-Za-z](?:_\d+)?)(['′]*)\s*(?:\(\s*[A-Za-z]\s*\))?$/;

/**
 * Décision a : `.domaine f` quand f a un ensemble — « f est définie sur
 * [0 ; +∞[ (ensemble choisi) ; sans ce choix, elle le serait sur ℝ. » La
 * seconde moitié se tait quand l'ensemble EST le domaine (ou qu'il ne se
 * calcule pas). `null` : pas une fonction à ensemble, la commande suit son cours.
 *
 * @param typed - L'argument tapé (`f`, `f(x)`)
 * @param expression - Son expression, noms remplacés (`(x^2)`)
 */
export function chosenDomainAnswer(
	get: (name: string) => AtelierObject | undefined,
	typed: string,
	expression: string
): string | null {
	const match = DOMAIN_TARGET.exec(typed.trim());
	if (match === null) return null;
	const name = match[1] + "'".repeat(match[2].length);
	const object = get(name);
	const domain = intervalDomainOf(object);
	// En erreur (`f(2x)`, ensemble vide) : la commande suit son cours, rien à affirmer
	if (domain === null || object?.status !== 'ok' || isEmpty(domain)) return null;
	// Sans « sur » à elle, l'ensemble vient des fonctions citées (décision d)
	const origin =
		object?.kind === 'function' && object.interval === undefined
			? 'ensemble hérité'
			: 'ensemble choisi';
	// Q2 du chantier composees : `g(x) = f(2x)` dit pourquoi
	const conditions = object?.kind === 'function' ? (object.inheritedConditions ?? []) : [];
	const why =
		origin === 'ensemble hérité' && conditions.length > 0
			? `${origin} : ${conditions.join(' et ')}`
			: origin;
	const chosen = `${displayName(name)} est définie sur ${intervalText(domain)} (${why})`;
	const ast = astOf(expression);
	const natural = ast === null ? null : computeDomain(ast, INTERNAL_LETTER);
	if (natural === null || natural.unresolved !== undefined) return `${chosen}.`;
	const a = expandExcludedPoints(domain);
	const b = expandExcludedPoints(natural.domain);
	const same = isEmpty(difference(a, b)) && isEmpty(difference(b, a));
	return same
		? `${chosen}.`
		: `${chosen} ; sans ${origin === 'ensemble hérité' ? 'cet héritage' : 'ce choix'}, elle le serait sur ${intervalText(natural.domain)}.`;
}

/**
 * `f(x²)` quand f a un ensemble : x² devrait y être, mais seule une expression
 * affine se traduit en un ensemble pour x (chantier composees, Q1 ; E1 : le
 * message dit quelle expression, et dans quel ensemble).
 */
export function composedMessage(cited: {
	readonly call: string;
	readonly name: string;
	readonly argument: string;
	readonly set: Domain;
}): string {
	const call = cited.call.replace(/-/g, '−');
	return `${cited.name} est définie sur ${intervalText(cited.set)} : dans ${call}, ${cited.argument.replace(/-/g, '−')} doit y être, et l'atelier ne sait en tirer l'ensemble de l'inconnue que pour une expression de la forme ax + b (2x, x − 3, 2x + 1). Écris l'expression de ${call} en toutes lettres.`;
}

/** La condition d'une composée, en français : « 2x doit être dans [0 ; +∞[ ». */
export function conditionText(condition: ComposedCondition): string {
	return `${condition.argument.replace(/-/g, '−')} doit être dans ${intervalText(condition.set)}`;
}

/**
 * L'ensemble d'une fonction en morceaux numériques, pour le tracé (lot 3, I5) :
 * `π` devient `3,14…`, `ℝ \ {0}` deux morceaux. `undefined` sans ensemble — et
 * aussi pour un ensemble que le grapheur ne saurait pas couper (borne non
 * numérique, ensemble par conditions) : la courbe se trace alors entière.
 */
export function plotRestrictionOf(object: AtelierObject | undefined): CurvePiece[] | undefined {
	const domain = intervalDomainOf(object);
	// `sur ℝ` équivaut à pas d'ensemble : rien à poser
	if (domain === null || isUniversal(domain)) return undefined;
	const expanded = expandExcludedPoints(domain);
	if (expanded.kind !== 'interval_set') return undefined;
	const pieces = expanded.intervals.map((interval) => ({
		from: endpointToNumber(interval.lower.value),
		to: endpointToNumber(interval.upper.value),
		fromClosed: interval.lower.type === 'closed',
		toClosed: interval.upper.type === 'closed'
	}));
	if (pieces.some((p) => Number.isNaN(p.from) || Number.isNaN(p.to))) return undefined;
	return pieces.sort((a, b) => a.from - b.from);
}

/** L'ensemble à l'écran : `[0 ; +∞[`, signe moins typographique. */
export function intervalText(domain: Domain): string {
	return formatInterval(domain).replace(/-/g, '−');
}

/** L'ensemble d'une fonction à l'écran, ou `null`. */
export function intervalLabelOf(object: AtelierObject): string | null {
	const domain = intervalDomainOf(object);
	return domain === null ? null : intervalText(domain);
}

/**
 * L'ensemble dans le champ MathLive de la carte. Venu d'un champ de maths, il
 * est rendu tel quel ; venu de Calcul (texte), il est réécrit en LaTeX depuis
 * sa lecture — l'écriture que `parseStudentDomain` relit.
 */
export function intervalFieldLatex(object: AtelierObject): string | null {
	if (object.kind !== 'function' || object.interval === undefined) return null;
	if (readingMode(object.provenance ?? 'url') === 'latex') return object.interval;
	// L'ensemble PROPRE, jamais l'héritage (décision d) : le champ relu le rangerait
	const read = readInterval(object.interval, object.letter ?? INTERNAL_LETTER);
	const domain = read.ok ? read.domain : null;
	if (domain === null) return null;
	return formatInterval(domain)
		.replace(/∞/g, '\\infty ')
		.replace(/ℝ/g, '\\R ')
		.replace(/∪/g, '\\cup ')
		.replace(/π/g, '\\pi ')
		.replace(/\s\\\s/g, '\\setminus ')
		.replace(/\{/g, '\\{')
		.replace(/\}/g, '\\}')
		.replace(/\s+/g, '');
}

/**
 * I4 : le refus d'un calcul qui évalue une fonction hors de son ensemble
 * (`f(5)` avec f sur [0 ; 2]), ou `null`. Seuls les arguments NOMBRES sont
 * jugés (`f(2+3)` compris) ; `f(x+1)` est une expression, pas une image.
 */
export function outsideIntervalRefusal(
	get: (name: string) => AtelierObject | undefined,
	input: string
): string | null {
	for (const [, name, primes, argument] of input.matchAll(CALL)) {
		const domain = intervalDomainOf(get(name));
		if (domain === null) continue;
		const value = constantValue(argument, get);
		if (value === null || containsValue(domain, value)) continue;
		return outsideIntervalMessage(
			displayName(name + "'".repeat(primes.length)),
			argument.trim(),
			domain
		);
	}
	return null;
}

/** Ce que l'étude d'une commande tire des fonctions qu'elle cite (`citedIntervalDomain`). */
export type CitedInterval =
	| {
			readonly kind: 'restricted';
			readonly domain: Domain;
			readonly name: string;
			/** Les composées traduites (`f(2x)`, u affine) : la condition de chacune */
			readonly conditions: readonly ComposedCondition[];
	  }
	/** `f(x²)` : u n'est pas affine, l'ensemble de x ne se calcule pas — refusé (Q1) */
	| {
			readonly kind: 'composed';
			readonly call: string;
			readonly name: string;
			readonly argument: string;
			readonly set: Domain;
	  };

/**
 * Chantier composees (2026-10-26) : dans `f(2x)`, avec f définie sur I,
 * `argument` (2x) doit être dans `set` (I), donc x dans `within`.
 */
export interface ComposedCondition {
	readonly argument: string;
	readonly set: Domain;
	readonly within: Domain;
}

/**
 * Lot 2 : l'ensemble sur lequel une commande étudie les fonctions qu'elle cite
 * (`.variations f`, `.résoudre f(x) = 4`, `f′` compris) — l'intersection de
 * leurs ensembles —, ou `null` si aucune n'en a.
 *
 * Une fonction citée SEULE ou appelée sur l'inconnue (`f`, `f(x)`, `f'(t)`)
 * restreint l'inconnue. Appelée sur un nombre ou une autre lettre (`f(a)`),
 * elle vaut un nombre : rien à restreindre. Appelée sur une expression de
 * l'inconnue (`f(2x)`), c'est 2x qui devrait être dans l'ensemble : refus
 * (`composed`) plutôt qu'une réponse sur tout le domaine (revue du lot 2).
 *
 * @param typed - L'expression tapée, AVANT le remplacement des noms
 * @param variable - L'inconnue étudiée
 */
export function citedIntervalDomain(
	get: (name: string) => AtelierObject | undefined,
	typed: string,
	variable: string
): CitedInterval | null {
	const unknown = new RegExp(`(?<![A-Za-z_\\\\])${variable}(?![A-Za-z_0-9])`);
	let domain: Domain | null = null;
	let first: string | null = null;
	const conditions: ComposedCondition[] = [];
	for (const match of typed.matchAll(CITED_NAME)) {
		const [whole, name, primes] = match;
		const after = typed.slice(match.index + whole.length);
		// Un mot plus long (`sin`, `ln`) n'est pas un nom
		if (/^[A-Za-z0-9_]/.test(after)) continue;
		const own = intervalDomainOf(get(name));
		if (own === null) continue;
		const shown = displayName(name + "'".repeat(primes.length));
		const argument = callArgument(after);
		let within = own;
		if (argument !== null && argument !== variable) {
			if (!unknown.test(argument)) continue;
			const node = astOf(argument, 'text');
			const preimage = node === null ? null : affinePreimage(node, variable, own);
			if (preimage === null) {
				return { kind: 'composed', call: `${shown}(${argument})`, name: shown, argument, set: own };
			}
			within = preimage;
			conditions.push({ argument, set: own, within });
		}
		domain = domain === null ? within : intersect(domain, within);
		first ??= shown;
	}
	return domain === null || first === null
		? null
		: { kind: 'restricted', domain, name: first, conditions };
}

/**
 * Chantier composees (Q1) : {x : ax + b ∈ I}, bornes EXACTES — chaque borne e
 * devient (e − b)/a, les bornes échangées quand a < 0. `null` quand u n'est pas
 * affine à coefficients nombres (`x²`, `ln x`, `ax` avec a libre) ou que I
 * n'est pas une réunion d'intervalles.
 */
export function affinePreimage(u: MathNode, variable: string, set: Domain): Domain | null {
	let coefficients: MathNode[] | null;
	try {
		coefficients = polynomialCoefficients(u, variable, 1);
	} catch {
		return null;
	}
	if (coefficients === null) return null;
	const [b, a] = coefficients;
	const slope = computeNumericValue(a);
	const intercept = computeNumericValue(b);
	if (slope === null || intercept === null || Math.abs(slope) < 1e-12) return null;
	// La forme lue doit VALOIR u : un terme mal classé (`ln x` pris pour une constante) ne passe pas
	for (const t of [0.37, 2.9]) {
		const value = computeNumericValue(substitute(u, { [variable]: number(String(t)) }));
		if (value === null || Math.abs(value - (slope * t + intercept)) > 1e-9) return null;
	}
	const image = (value: MathNode): MathNode => {
		const infinite = endpointToNumber(value);
		if (infinite === Infinity || infinite === -Infinity) {
			return slope > 0 ? value : bound(infinite > 0 ? '-inf' : '+inf');
		}
		const result = evaluate(divide(subtract(value, b), a, 'fraction'), { mode: 'exact' });
		return result.status === 'value'
			? exactValueToShow(result.node)
			: divide(subtract(value, b), a, 'fraction');
	};
	const endpointOf = (e: Endpoint): Endpoint => ({ value: image(e.value), type: e.type });
	switch (set.kind) {
		case 'empty':
		case 'universal':
			return set;
		case 'interval_set': {
			const intervals = set.intervals.map((i): Interval =>
				slope > 0
					? { kind: 'interval', lower: endpointOf(i.lower), upper: endpointOf(i.upper) }
					: { kind: 'interval', lower: endpointOf(i.upper), upper: endpointOf(i.lower) }
			);
			return {
				kind: 'interval_set',
				intervals: slope > 0 ? intervals : intervals.reverse(),
				excludedPoints: set.excludedPoints.map((p) => ({ ...p, value: image(p.value) }))
			};
		}
		default:
			return null;
	}
}

/** L'argument de l'appel qui ouvre `after` (`(2x)…` → `2x`, parenthèses imbriquées comprises), ou `null`. */
function callArgument(after: string): string | null {
	const open = /^\s*\(/.exec(after);
	if (open === null) return null;
	let depth = 0;
	for (let i = open[0].length - 1; i < after.length; i++) {
		if (after[i] === '(') depth++;
		else if (after[i] === ')' && --depth === 0) return after.slice(open[0].length, i).trim();
	}
	return null;
}

/**
 * Décision b : `.évaluer f en x=5` hors de l'ensemble — même refus que `f(5)`,
 * ou `null` (valeur dedans, ou qui dépend d'une lettre libre).
 */
export function valueOutsideRefusal(
	get: (name: string) => AtelierObject | undefined,
	cited: { readonly domain: Domain; readonly name: string },
	written: string
): string | null {
	const value = constantValue(written, get);
	if (value === null || containsValue(cited.domain, value)) return null;
	return outsideIntervalMessage(cited.name, shownWritten(written), cited.domain);
}

/**
 * Décision b : `.intégrer f de a à b` — la borne qui sort, sinon la partie de
 * [a ; b] qui sort (un trou entre deux morceaux), ou `null`.
 */
export function segmentOutsideRefusal(
	get: (name: string) => AtelierObject | undefined,
	cited: { readonly domain: Domain; readonly name: string },
	lower: string,
	upper: string
): string | null {
	const a = constantValue(lower, get);
	const b = constantValue(upper, get);
	if (a === null || b === null) return null;
	return segmentRefusal(cited, [
		{ written: shownWritten(lower), value: a },
		{ written: shownWritten(upper), value: b }
	]);
}

/**
 * Décision f : la tangente en x₀ hors de l'ensemble de la fonction (une borne
 * fermée est dedans), ou `null`.
 */
export function tangentRefusal(object: AtelierObject | undefined, at: number): string | null {
	const domain = intervalDomainOf(object);
	if (object === undefined || domain === null || containsValue(domain, at)) return null;
	return outsideIntervalMessage(displayName(object.name), `x₀ = ${shownNumber(at)}`, domain);
}

/** Décision f : l'aire sous la courbe sur un [a ; b] qui sort de l'ensemble, ou `null`. */
export function areaRefusal(
	object: AtelierObject | undefined,
	from: number,
	to: number
): string | null {
	const domain = intervalDomainOf(object);
	if (object === undefined || domain === null) return null;
	return segmentRefusal({ domain, name: displayName(object.name) }, [
		{ written: shownNumber(from), value: from },
		{ written: shownNumber(to), value: to }
	]);
}

/** Les réglages à dessiner : sans la tangente ni l'aire refusées (décision f). */
export function allowedDisplay<
	D extends {
		readonly tangentAt: number | null;
		readonly integral: { readonly from: number; readonly to: number } | null;
	}
>(object: AtelierObject, display: D): D {
	const tangentOut =
		display.tangentAt !== null && tangentRefusal(object, display.tangentAt) !== null;
	const areaOut =
		display.integral !== null &&
		areaRefusal(object, display.integral.from, display.integral.to) !== null;
	if (!tangentOut && !areaOut) return display;
	return {
		...display,
		...(tangentOut && { tangentAt: null }),
		...(areaOut && { integral: null })
	};
}

/** « 5 n'est pas dans l'ensemble de définition de f, [0 ; 2]. » */
export function outsideIntervalMessage(name: string, written: string, domain: Domain): string {
	return `${written} n'est pas dans l'ensemble de définition de ${name}, ${intervalText(domain)}.`;
}

/**
 * La valeur d'un argument, ou `null` s'il dépend d'une variable. Les VALEURS de
 * l'atelier y sont remplacées par la leur (`f(b)` avec b = 5, revue du lot 1).
 */
function constantValue(
	argument: string,
	get: (name: string) => AtelierObject | undefined
): number | null {
	const direct = readNumber(argument);
	if (direct !== null) return direct;
	const ast = astOf(argument);
	if (ast === null) return null;
	const bindings: Record<string, number> = {};
	// `a_1` sous son nom entier : la valeur de a_1, jamais celle de a (`variablesOf`)
	for (const variable of variablesOf(ast, undefined)) {
		const object = get(variable);
		const value =
			object?.kind === 'value' && object.status === 'ok' && object.unit === undefined
				? constantOf(object.definition, object.provenance, [])
				: null;
		if (value === null) return null;
		bindings[variable] = value;
	}
	return numericValue(substitute(ast, bindings));
}

function numericValue(node: MathNode): number | null {
	try {
		const result = evaluate(node, { mode: 'decimal' });
		return result.status === 'value' &&
			typeof result.value === 'number' &&
			Number.isFinite(result.value)
			? result.value
			: null;
	} catch {
		return null;
	}
}

/** Une borne hors de l'ensemble (nommée), sinon la partie de [a ; b] qui sort, sinon `null`. */
function segmentRefusal(
	cited: { readonly domain: Domain; readonly name: string },
	bounds: readonly { readonly written: string; readonly value: number }[]
): string | null {
	const [low, high] = [...bounds].sort((p, q) => p.value - q.value);
	const endpoint = (value: number) => ({
		type: 'closed' as const,
		value: { type: 'number' as const, value: String(value) }
	});
	const segment: Domain = {
		kind: 'interval_set',
		intervals: [{ kind: 'interval', lower: endpoint(low.value), upper: endpoint(high.value) }],
		excludedPoints: []
	};
	const outside = difference(segment, expandExcludedPoints(cited.domain));
	if (isEmpty(outside)) return null;
	// Seule une partie de longueur NON NULLE compte : une borne ouverte ou un point
	// exclu ne changent pas l'intégrale (]0;2] de 0 à 2 vaut 8/3) ; une divergence
	// en un point, `.intégrer` la dit lui-même (revue de #1337)
	if (outside.kind === 'interval_set') {
		const pieces = outside.intervals.map((interval) => ({
			from: numericValue(interval.lower.value),
			to: numericValue(interval.upper.value)
		}));
		const long = pieces.filter((p) => p.from === null || p.to === null || p.to > p.from);
		if (long.length === 0) return null;
		// Une borne dans une partie qui sort : c'est elle qu'on nomme
		for (const bound of bounds) {
			const inside = long.some(
				(p) => p.from !== null && p.to !== null && p.from <= bound.value && bound.value <= p.to
			);
			if (inside && !containsValue(cited.domain, bound.value)) {
				return outsideIntervalMessage(cited.name, bound.written, cited.domain);
			}
		}
	}
	const whole = `[${low.written} ; ${high.written}]`.replace(/-/g, '−');
	return `Une partie de ${whole}, ${intervalText(outside)}, n'est pas dans l'ensemble de définition de ${cited.name}, ${intervalText(cited.domain)}.`;
}

/** Une valeur tapée dans une commande, à l'écran : `\pi` (relu ainsi par Calcul) redevient π. */
function shownWritten(written: string): string {
	return written.trim().replace(/\\pi(?![A-Za-z])/g, 'π');
}

/** Un nombre à l'écran : virgule décimale, signe moins typographique. */
function shownNumber(value: number): string {
	return String(Math.round(value * 1e4) / 1e4)
		.replace('.', ',')
		.replace('-', '−');
}

/** Nombre de points isolés d'un ensemble fait SEULEMENT de points (`[2;2]`, `{1;2}`), sinon 0. */
function isolatedPoints(domain: Domain): number {
	if (domain.kind !== 'interval_set' || domain.intervals.length === 0) return 0;
	const degenerate = domain.intervals.every((interval) => {
		const lower = numericValue(interval.lower.value);
		return lower !== null && lower === numericValue(interval.upper.value);
	});
	return degenerate ? domain.intervals.length : 0;
}

/** Un point de l'ensemble où la fonction n'est pas définie, à l'écran — une borne fermée d'abord. */
function faultyPoint(outside: Domain): string | null {
	if (outside.kind !== 'interval_set' || outside.intervals.length === 0) return null;
	const [first]: readonly Interval[] = outside.intervals;
	const lower = numericValue(first.lower.value);
	const upper = numericValue(first.upper.value);
	const shown = (node: MathNode) => formatEndpointValue(node).replace(/-/g, '−');
	if (first.lower.type === 'closed' && lower !== null) return shown(first.lower.value);
	if (first.upper.type === 'closed' && upper !== null) return shown(first.upper.value);
	if (lower !== null && upper !== null) {
		return String((lower + upper) / 2)
			.replace('.', ',')
			.replace('-', '−');
	}
	return null;
}
