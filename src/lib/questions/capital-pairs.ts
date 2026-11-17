/**
 * Sens de deux majuscules collées dans une question (`AB`)
 * ========================================================
 *
 * `AB` est la longueur du segment [AB], ou le produit A × B (matrices, physique).
 * Le sens se résout UNE fois, à la génération de l'instance (décision Q-K), dans
 * l'ordre fixé par David (2026-10-12) :
 *
 * 1. la DÉCLARATION du modèle, `shared.capitalPairs` (`'length'` | `'product'`) ;
 * 2. sinon le CONTEXTE : une BRANCHE de l'arbre des notions « produit » (`Matrices`,
 *    `Graphes`) — pour un modèle, la branche où il est rangé, lue par l'éditeur qui
 *    écrit alors la déclaration ; pour un exercice, son champ `topic` (`Graphes et
 *    matrices`, ou un thème de physique, où `U = RI`) — table unique ci-dessous ;
 * 3. sinon une LONGUEUR, par défaut.
 *
 * Le résultat est copié sur l'instance (`QuestionInstance.capitalPairs`) et suit le
 * rail de `genericFunctions` jusqu'au parseur LaTeX (réponse de l'élève ET réponse
 * attendue, toujours lues dans le même sens). Une instance sans le champ (servie
 * avant ce chantier) garde le défaut du parseur : le produit d'avant (Q-L).
 *
 * Module léger (aucun parseur) : le schéma sert à l'éditeur et à la route.
 * Cf. docs/archive/wip/longueurs-segments-progress.md.
 */

import { z } from 'zod';
// Type du parseur seul (aucune logique)
import type { CapitalPairs } from '$lib/mathAST/parser/types';

// Types

/** D'où vient le sens retenu : déclaration du modèle, contexte (branche, sujet), défaut */
export type CapitalPairsSource = 'declaration' | 'context' | 'default';

export interface CapitalPairsResolution {
	capitalPairs: CapitalPairs;
	source: CapitalPairsSource;
	/** Contexte qui a décidé (source `context` seulement) */
	context?: string;
}

// Constantes

/** Valeurs de `shared.capitalPairs` */
export const CAPITAL_PAIRS_VALUES = [
	'length',
	'product'
] as const satisfies readonly CapitalPairs[];

/**
 * Table de CONTEXTE « produit » (décisions Q-I et Q-M) : où deux majuscules collées
 * sont un produit (matrices `AB`, `AX = B`). Seul endroit à compléter.
 * `Matrices` et `Graphes` : branches de l'arbre des notions (ADR 0035), le contexte
 * d'un modèle. `Graphes et matrices` : sujet (`topic`) d'un exercice rédigé.
 */
const PRODUCT_CONTEXTS: ReadonlySet<string> = new Set([
	'Matrices',
	'Graphes',
	'Graphes et matrices'
]);

/**
 * Sujet d'exercice de physique (`Physique-chimie`, `Sciences physiques`) : contexte
 * « produit » (`U = RI`, `P = UI`). Aucun en base au 2026-10-12 ; règle écrite pour un
 * sujet à venir.
 */
const PHYSICS_CONTEXT_REGEX = /physique/i;

/** Lecture française d'un sens, pour l'éditeur */
const MEANING_LABELS: Record<CapitalPairs, string> = {
	length: 'une longueur',
	product: 'un produit'
};

/**
 * Raccourcis MathLive qui transforment deux majuscules collées : `AA` → ∀, `EE` → ∃,
 * `!EE` → ∄, `NN`, `ZZ`, `QQ`, `RR`, `CC` → ensembles, `TT` → ⊤ (liste par défaut de
 * MathLive 0.111.1). Reconnus par leur clé, pour suivre une version future.
 */
const CAPITAL_PAIR_SHORTCUT_REGEX = /[A-Z]{2}/;

// Schémas

/** `shared.capitalPairs` : « longueur » ou « produit » (aucune autre valeur) */
export const capitalPairsSchema = z.enum(CAPITAL_PAIRS_VALUES, {
	message: 'Deux majuscules collées désignent une longueur (« length ») ou un produit (« product »)'
});

// Fonctions

/**
 * Valeur déclarée et recevable, `undefined` sinon. Défensif : `shared` est un
 * jsonb, une valeur écrite hors de l'éditeur est ignorée (contexte, puis défaut).
 */
export function declaredCapitalPairs(value: unknown): CapitalPairs | undefined {
	const result = capitalPairsSchema.safeParse(value);
	return result.success ? result.data : undefined;
}

/** Le contexte est-il « produit » ? */
function isProductContext(context: string): boolean {
	return PRODUCT_CONTEXTS.has(context) || PHYSICS_CONTEXT_REGEX.test(context);
}

/** Sens de deux majuscules collées pour un modèle : déclaration → contexte → longueur */
export function resolveCapitalPairs({
	declaration,
	context
}: {
	declaration?: unknown;
	context?: string | null;
}): CapitalPairsResolution {
	const declared = declaredCapitalPairs(declaration);
	if (declared) return { capitalPairs: declared, source: 'declaration' };
	const trimmedContext = context?.trim() ?? '';
	if (trimmedContext && isProductContext(trimmedContext)) {
		return { capitalPairs: 'product', source: 'context', context: trimmedContext };
	}
	return { capitalPairs: 'length', source: 'default' };
}

/**
 * Sens de deux majuscules collées dans un EXERCICE rédigé (`~AB^2~`) : le contexte
 * seul, son sujet (`exercises.topic`), sans déclaration (décision Q-J du 2026-10-12).
 * Même table que les questions : `Graphes et matrices` ou un sujet de physique →
 * produit ; tout autre sujet, ou aucun → longueur.
 */
export function exerciseCapitalPairs(topic: string | null | undefined): CapitalPairs {
	return resolveCapitalPairs({ context: topic }).capitalPairs;
}

/** « une longueur, par défaut » / « un produit, contexte Graphes et matrices » */
export function describeCapitalPairs(resolution: CapitalPairsResolution): string {
	const meaning = MEANING_LABELS[resolution.capitalPairs];
	switch (resolution.source) {
		case 'declaration':
			return `${meaning}, déclaré dans le modèle`;
		case 'context':
			return `${meaning}, contexte ${resolution.context ?? ''}`.trimEnd();
		case 'default':
			return `${meaning}, par défaut`;
	}
}

/**
 * Raccourcis d'un champ de réponse en mode « longueur » (Q-N) : la table du champ
 * moins ceux qui transforment deux majuscules collées (`AA'` reste `AA'`, pas `∀'`).
 * Rend une nouvelle table, celle d'origine n'est pas modifiée.
 */
export function withoutCapitalPairShortcuts<T>(
	shortcuts: Readonly<Record<string, T>>
): Record<string, T> {
	return Object.fromEntries(
		Object.entries(shortcuts).filter(([key]) => !CAPITAL_PAIR_SHORTCUT_REGEX.test(key))
	);
}

// Éditeur de modèle

/** Choix de l'éditeur : rien de déclaré (le contexte décide), longueur ou produit */
export type CapitalPairsChoice = 'auto' | CapitalPairs;

/** Choix affiché pour une déclaration lue en base (invalide ou absente → `auto`) */
export function capitalPairsChoiceOf(declaration: unknown): CapitalPairsChoice {
	return declaredCapitalPairs(declaration) ?? 'auto';
}

/**
 * Options de la liste « Deux majuscules collées (AB) désignent : ». La première dit
 * ce que donne le contexte quand rien n'est déclaré (« une longueur, par défaut »).
 */
export function capitalPairsChoiceItems(
	context: string | null | undefined
): { value: CapitalPairsChoice; label: string }[] {
	const resolved = describeCapitalPairs(resolveCapitalPairs({ context }));
	return [
		{ value: 'auto', label: `Selon le contexte : ${resolved}` },
		{ value: 'length', label: 'Une longueur (segment [AB])' },
		{ value: 'product', label: 'Un produit (A × B)' }
	];
}

/**
 * Contexte d'un modèle dans l'éditeur : le nom de la BRANCHE choisie dans « Rangé dans »
 * (ADR 0035). Vide tant que le modèle n'est pas rangé.
 */
export function capitalPairsContextOf(branchName: string | null | undefined): string {
	return branchName?.trim() || '';
}

/**
 * Valeur de `shared.capitalPairs` à enregistrer : le choix explicite, sinon « product » si le
 * contexte l'impose (le modèle se suffit à lui-même, le générateur ne lit pas l'arbre), sinon
 * rien (longueur par défaut).
 */
export function capitalPairsToWrite(
	choice: CapitalPairsChoice,
	context: string
): CapitalPairs | undefined {
	if (choice !== 'auto') return choice;
	const resolution = resolveCapitalPairs({ context });
	return resolution.source === 'context' ? resolution.capitalPairs : undefined;
}
