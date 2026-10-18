/**
 * Renvois de numérotation : logique pure de `fix-renvois-numerotation.ts`
 * =======================================================================
 *
 * Une proposition remplace une phrase entière (`avant` → `apres`) dans un champ
 * texte d'une variation, désigné par son chemin (`variations[0].solution_md`,
 * `variations[0].translations.en.statement_md`). Le plan d'un exercice est tout ou
 * rien : il est refusé si l'exercice a changé depuis la lecture du 2026-10-18, ou si
 * une seule de ses phrases n'est pas trouvée exactement une fois.
 *
 * @module scripts/lib/renvois-numerotation
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Proposal {
	exerciseId: string;
	field: string;
	avant: string;
	apres: string;
}

export interface ExerciseRow {
	id: string;
	updated_at: string;
	variations: unknown;
}

export type Variation = Record<string, unknown>;

export type ExercisePlan =
	{ ok: true; variations: Variation[]; replacements: number } | { ok: false; reason: string };

// ============================================================================
// CONSTANTES
// ============================================================================

/** Seuls champs visés : énoncé et corrigé, en direct ou dans une traduction */
const FIELD_PATH =
	/^variations\[(\d+)\]\.((?:translations\.[a-z]{2}\.)?(?:statement_md|solution_md))$/;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Le chemin d'un champ : l'indice de la variation, puis les clés jusqu'au texte. */
export function parseFieldPath(field: string): { variationIndex: number; keys: string[] } {
	const match = FIELD_PATH.exec(field);
	if (!match) throw new Error(`Chemin de champ inattendu : ${field}`);
	return { variationIndex: Number(match[1]), keys: match[2].split('.') };
}

const occurrences = (text: string, pattern: string) => text.split(pattern).length - 1;

/** Le texte au bout des clés, ou null si un maillon manque ou n'est pas un texte */
function readText(variation: Variation, keys: string[]): string | null {
	let node: unknown = variation;
	for (const key of keys) {
		if (typeof node !== 'object' || node === null) return null;
		node = (node as Record<string, unknown>)[key];
	}
	return typeof node === 'string' ? node : null;
}

function writeText(variation: Variation, keys: string[], value: string): void {
	let node = variation;
	for (const key of keys.slice(0, -1)) node = node[key] as Variation;
	node[keys[keys.length - 1]] = value;
}

/**
 * Les variations réécrites d'un exercice, sur une COPIE (la ligne lue reste la
 * sauvegarde), ou la raison du refus.
 */
export function planExercise(
	row: ExerciseRow,
	expectedUpdatedAt: string,
	proposals: readonly Proposal[]
): ExercisePlan {
	if (row.updated_at !== expectedUpdatedAt) {
		return {
			ok: false,
			reason: `modifié depuis la lecture (${row.updated_at}, lu ${expectedUpdatedAt})`
		};
	}
	if (!Array.isArray(row.variations)) return { ok: false, reason: 'variations illisibles' };

	const variations = structuredClone(row.variations) as Variation[];
	for (const proposal of proposals) {
		const { variationIndex, keys } = parseFieldPath(proposal.field);
		const variation = variations[variationIndex];
		if (typeof variation !== 'object' || variation === null) {
			return { ok: false, reason: `${proposal.field} : variation absente` };
		}
		const text = readText(variation, keys);
		if (text === null) return { ok: false, reason: `${proposal.field} : champ absent` };

		const found = occurrences(text, proposal.avant);
		if (found !== 1) {
			return {
				ok: false,
				reason: `${proposal.field} : « ${proposal.avant} » trouvé ${found} fois, 1 attendue`
			};
		}
		writeText(
			variation,
			keys,
			text.replace(proposal.avant, () => proposal.apres)
		);
	}
	return { ok: true, variations, replacements: proposals.length };
}

/** Clés triées à toutes les profondeurs : Postgres (jsonb) ne garde pas leur ordre */
function canonical(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonical);
	if (typeof value !== 'object' || value === null) return value;
	return Object.fromEntries(
		Object.keys(value)
			.sort()
			.map((key) => [key, canonical((value as Record<string, unknown>)[key])])
	);
}

/** Même contenu JSON, quel que soit l'ordre des clés */
export function sameContent(a: unknown, b: unknown): boolean {
	return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
