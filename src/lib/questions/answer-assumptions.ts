/**
 * Hypothèses de l'énoncé (ADR 0012) — côté modèle de question
 * ============================================================
 *
 * `options.answerAssumptions` : { x: 'positive', n: 'natural' }. Déclarées
 * pour le modèle entier, explicites seulement, transmises telles quelles à
 * `areEquivalent` (`$lib/math`) par la correction.
 *
 * Ce module porte ce que mathAST ne vérifie pas : le vocabulaire fermé, le
 * nom de variable admis, la limite de 10, et l'interdiction de viser une
 * variable TIRÉE du modèle (`{{a}}` est remplacée par un nombre avant la
 * comparaison : une hypothèse sur `a` ne dirait rien, ou tromperait l'auteur).
 *
 * @module questions/answer-assumptions
 */

import { z } from 'zod';
import type { AnswerAssumptionKind, AnswerAssumptions } from '$lib/math';

// ============================================================================
// Types
// ============================================================================

/** Une ligne de l'éditeur (nom encore libre, pas encore validé). */
export interface AnswerAssumptionRow {
	name: string;
	kind: AnswerAssumptionKind;
}

/** Ce dont la recherche de collisions a besoin d'un modèle, typé ou non. */
interface TemplateVariablesSource {
	shared?: unknown;
	variations?: ReadonlyArray<{ variables?: ReadonlyArray<{ name?: unknown }> }>;
}

// ============================================================================
// Constantes
// ============================================================================

/** Le vocabulaire, dans l'ordre d'affichage de l'éditeur. */
export const ANSWER_ASSUMPTION_KINDS = [
	'positive',
	'nonnegative',
	'nonzero',
	'integer',
	'natural'
] as const satisfies readonly AnswerAssumptionKind[];

// Garde d'exhaustivité : une hypothèse ajoutée à mathAST sans être ajoutée ici
// fait échouer le typecheck.
type MissingKinds = Exclude<AnswerAssumptionKind, (typeof ANSWER_ASSUMPTION_KINDS)[number]>;
const kindsAreExhaustive: MissingKinds extends never ? true : never = true;
void kindsAreExhaustive;

/** Libellés de l'éditeur. */
export const ANSWER_ASSUMPTION_LABELS: Readonly<Record<AnswerAssumptionKind, string>> = {
	positive: 'strictement positif',
	nonnegative: 'positif ou nul',
	nonzero: 'non nul',
	integer: 'entier',
	natural: 'entier naturel'
};

/** Notation de l'aperçu : « x > 0 », « n ∈ ℕ ». */
const ANSWER_ASSUMPTION_NOTATION: Readonly<Record<AnswerAssumptionKind, string>> = {
	positive: '> 0',
	nonnegative: '≥ 0',
	nonzero: '≠ 0',
	integer: '∈ ℤ',
	natural: '∈ ℕ'
};

/**
 * Noms de lettres grecques que le parseur LaTeX lit comme variables
 * (`GreekLetter` de mathAST). π n'en fait pas partie : c'est une constante.
 */
const GREEK_LETTERS: Readonly<Record<string, string>> = {
	alpha: 'α',
	beta: 'β',
	gamma: 'γ',
	delta: 'δ',
	epsilon: 'ε',
	zeta: 'ζ',
	eta: 'η',
	theta: 'θ',
	iota: 'ι',
	kappa: 'κ',
	lambda: 'λ',
	mu: 'μ',
	nu: 'ν',
	xi: 'ξ',
	rho: 'ρ',
	sigma: 'σ',
	tau: 'τ',
	upsilon: 'υ',
	phi: 'φ',
	chi: 'χ',
	psi: 'ψ',
	omega: 'ω'
};

/** `e` (Euler) et `i` (imaginaire) sont des constantes pour mathAST. */
const CONSTANT_LETTERS: ReadonlySet<string> = new Set(['e', 'i']);

export const MAX_ANSWER_ASSUMPTIONS = 10;

const MESSAGES = {
	constant: (name: string) =>
		`« ${name} » désigne une constante (e ≈ 2,718, i² = −1) : choisir une autre lettre`,
	invalidName: (name: string) =>
		`Variable « ${name} » invalide : une seule lettre (x, n) ou le nom d'une lettre grecque (theta), sans indice`,
	unknownKind:
		'Hypothèse inconnue : strictement positif, positif ou nul, non nul, entier ou entier naturel',
	tooMany: `Au plus ${MAX_ANSWER_ASSUMPTIONS} hypothèses par modèle`,
	duplicate: (name: string) => `« ${name} » a déjà une hypothèse (une seule par variable)`,
	drawnVariable: (name: string) =>
		`Hypothèse sur « ${name} » impossible : « ${name} » est une variable tirée du modèle ({{${name}}}), pas une variable libre de la réponse`
} as const;

// ============================================================================
// Fonctions
// ============================================================================

/** Message d'erreur du nom, `undefined` s'il est admis. */
function nameError(name: string): string | undefined {
	if (CONSTANT_LETTERS.has(name)) return MESSAGES.constant(name);
	if (/^[a-zA-Z]$/.test(name) || Object.hasOwn(GREEK_LETTERS, name)) return undefined;
	return MESSAGES.invalidName(name);
}

/** Noms des variables tirées : `shared.variables` et `variations[].variables`. */
function drawnVariableNames(template: TemplateVariablesSource): Set<string> {
	const names = new Set<string>();
	const collect = (variables: unknown) => {
		if (!Array.isArray(variables)) return;
		for (const variable of variables) {
			if (
				typeof variable === 'object' &&
				variable !== null &&
				'name' in variable &&
				typeof variable.name === 'string'
			) {
				names.add(variable.name);
			}
		}
	};
	// `shared` n'est pas typé dans le schéma de l'API (`z.unknown()`)
	const shared = template.shared;
	if (typeof shared === 'object' && shared !== null && 'variables' in shared) {
		collect(shared.variables);
	}
	for (const variation of template.variations ?? []) collect(variation.variables);
	return names;
}

/** Les hypothèses posées sur une variable tirée du modèle (refusées). */
export function findAssumptionCollisions(
	assumptions: AnswerAssumptions | undefined,
	template: TemplateVariablesSource
): string[] {
	if (!assumptions) return [];
	const drawn = drawnVariableNames(template);
	return Object.keys(assumptions).filter((name) => drawn.has(name));
}

/** Message de refus d'une hypothèse posée sur une variable tirée. */
export function assumptionCollisionMessage(name: string): string {
	return MESSAGES.drawnVariable(name);
}

/**
 * Ajoute au contexte Zod une erreur par hypothèse posée sur une variable
 * tirée. Partagé par le schéma strict de l'éditeur et ceux de l'API.
 */
export function refineAssumptionCollisions(
	data: TemplateVariablesSource & { options?: { answerAssumptions?: AnswerAssumptions } | null },
	ctx: z.RefinementCtx
): void {
	for (const name of findAssumptionCollisions(data.options?.answerAssumptions, data)) {
		ctx.addIssue({
			code: 'custom',
			message: MESSAGES.drawnVariable(name),
			path: ['options', 'answerAssumptions', name]
		});
	}
}

// ============================================================================
// Schéma Zod
// ============================================================================

const assumptionKindSchema = z.enum(ANSWER_ASSUMPTION_KINDS, { message: MESSAGES.unknownKind });

/**
 * `options.answerAssumptions`. Utilisé par le schéma strict de l'éditeur, les
 * schémas de l'API et celui de la relecture de migration.
 *
 * Les noms sont vérifiés dans un `superRefine` plutôt que par le schéma de clé
 * du `record` : Zod 4 remplace le message d'une clé refusée par « Invalid key
 * in record », et l'auteur ne saurait pas pourquoi.
 */
export const answerAssumptionsSchema = z
	.record(z.string(), assumptionKindSchema)
	.superRefine((value, ctx) => {
		const names = Object.keys(value);
		for (const name of names) {
			const message = nameError(name);
			if (message) ctx.addIssue({ code: 'custom', message, path: [name] });
		}
		if (names.length > MAX_ANSWER_ASSUMPTIONS) {
			ctx.addIssue({ code: 'custom', message: MESSAGES.tooMany });
		}
	});

// ============================================================================
// Éditeur et aperçu
// ============================================================================

/**
 * Valide les lignes de l'éditeur : un message par ligne (`undefined` si
 * valide) et l'objet à enregistrer (`undefined` s'il est vide). Une ligne au
 * nom vide est ignorée (ligne en cours de saisie).
 */
export function validateAssumptionRows(
	rows: readonly AnswerAssumptionRow[],
	drawnNames: Iterable<string>
): { errors: (string | undefined)[]; assumptions: AnswerAssumptions | undefined } {
	const drawn = new Set(drawnNames);
	const seen = new Set<string>();
	const assumptions: Record<string, AnswerAssumptionKind> = {};
	const errors = rows.map((row): string | undefined => {
		const name = row.name.trim();
		if (name === '') return undefined;
		const invalid = nameError(name);
		if (invalid) return invalid;
		if (seen.has(name)) return MESSAGES.duplicate(name);
		if (drawn.has(name)) return MESSAGES.drawnVariable(name);
		if (seen.size >= MAX_ANSWER_ASSUMPTIONS) return MESSAGES.tooMany;
		seen.add(name);
		assumptions[name] = row.kind;
		return undefined;
	});
	return { errors, assumptions: seen.size > 0 ? assumptions : undefined };
}

/** Les noms des variables tirées d'un modèle (pour l'éditeur). */
export function templateDrawnVariableNames(template: TemplateVariablesSource): string[] {
	return [...drawnVariableNames(template)];
}

/** « x > 0 ; n ∈ ℕ » — chaîne vide sans hypothèse. */
export function formatAnswerAssumptions(assumptions: AnswerAssumptions | undefined): string {
	if (!assumptions) return '';
	return Object.entries(assumptions)
		.filter(([, kind]) => Object.hasOwn(ANSWER_ASSUMPTION_NOTATION, kind))
		.map(
			([name, kind]) =>
				`${Object.hasOwn(GREEK_LETTERS, name) ? GREEK_LETTERS[name] : name} ${ANSWER_ASSUMPTION_NOTATION[kind]}`
		)
		.join(' ; ');
}

/**
 * Catégorie « Suites » (thème ou domaine) : l'éditeur y PROPOSE « n ∈ ℕ ».
 * Jamais appliqué d'office (ADR 0012 : hypothèses explicites seulement).
 */
export function isSequenceCategory(theme: string, domain: string): boolean {
	return [theme, domain].some((label) => /^suites?\b/i.test(label.trim()));
}

/** Lignes de l'éditeur à partir des hypothèses enregistrées (hypothèses inconnues écartées). */
export function assumptionsToRows(
	assumptions: AnswerAssumptions | undefined | null
): AnswerAssumptionRow[] {
	if (!assumptions) return [];
	return Object.entries(assumptions)
		.filter(([, kind]) => (ANSWER_ASSUMPTION_KINDS as readonly string[]).includes(kind))
		.map(([name, kind]) => ({ name, kind }));
}

/**
 * Hypothèses à enregistrer à partir des lignes : toutes les lignes nommées,
 * TELLES QUELLES (nom rogné). Une ligne invalide n'est pas écartée ici : le
 * schéma Zod (éditeur JSON, API) la refuse avec son message, au lieu de la
 * perdre en silence à l'enregistrement.
 */
export function rowsToAssumptions(
	rows: readonly AnswerAssumptionRow[]
): AnswerAssumptions | undefined {
	const named = rows.filter((row) => row.name.trim() !== '');
	if (named.length === 0) return undefined;
	return Object.fromEntries(named.map((row) => [row.name.trim(), row.kind]));
}
