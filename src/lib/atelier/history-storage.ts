/**
 * Atelier — garder les lignes de Calcul d'un rechargement à l'autre
 *
 * Décision de David du 2026-10-13 (« option 1 »). Clé À PART de l'atelier : le
 * lien `?a=` n'encode que `Atelier.serialize()`, et un historique trop gros ou
 * un stockage plein ne coûte jamais les cartes (on garde les lignes les plus
 * récentes, en silence).
 *
 * On range ce que l'écran MONTRE et le geste rejouable, jamais l'arbre du
 * résultat : une ligne restaurée n'a ni « Garder », ni « Comment ? », ni
 * tableau. Rien n'est recalculé.
 *
 * ⚠️ SÉCURITÉ : ce qui revient du `localStorage` est NON FIABLE. Zod, bornes, et
 * une formule n'est gardée que si elle passe la liste blanche de `safe-latex.ts`
 * (la vue la compose en `{@html}`). Abîmé : Calcul repart vide, sans exception.
 *
 * @module atelier/history-storage
 */

import { z } from 'zod';
import type { Alternative } from './calcul';
import type { Entry, ReplayStep } from './desk.svelte';
import { isQuotaExceeded } from './persistence';
import { messageParts } from './reciprocal';
import { isSafeLatex } from './safe-latex';
import { MAX_DEFINITION_LENGTH } from './types';

// =============================================================================
// Types
// =============================================================================

/** Une ligne rangée : ce que l'écran montre, et le geste rejouable. */
export interface KeptLine {
	readonly label: string;
	/** La saisie écrite dans le champ mathématique (`Entry.inputLatex`) */
	readonly inputLatex?: string;
	readonly text: string;
	readonly failed: boolean;
	readonly latex?: string;
	readonly note?: string;
	readonly alternative?: Alternative;
	readonly formulas?: true;
	readonly replay?: ReplayStep;
	/** Ligne barrée : son étape a été annulée (lot 5, PR 2) — elle le reste. */
	readonly undone?: true;
}

export interface KeptHistory {
	readonly lines: readonly KeptLine[];
	/** Les saisies tapées, pour ↑ / ↓ — de la plus ancienne à la plus récente. */
	readonly typed: readonly string[];
}

export type LoadedHistory =
	| { readonly kind: 'loaded'; readonly history: KeptHistory }
	/** Rangé par une version plus récente : ni relu, ni écrasé. */
	| { readonly kind: 'too-recent' };

// =============================================================================
// Constantes
// =============================================================================

export const CALC_HISTORY_STORAGE_KEY = 'chiphre-atelier-historique';

/** À incrémenter dès que la forme rangée change. */
export const CALC_HISTORY_VERSION = 1;

/** Les 100 dernières lignes, comme `/calc` (`chiphre-calc-history`). */
export const MAX_KEPT_LINES = 100;

/**
 * En caractères ; les cartes ont droit à 500 000 (`MAX_SERIALIZED_LENGTH`) : à
 * deux, loin des ~5 Mo du navigateur. Plus long à la relecture : forgé, pas lu.
 */
export const MAX_KEPT_HISTORY_LENGTH = 200_000;

/** Les saisies rappelables par ↑ : une part fixe du plafond, le reste aux lignes. */
const MAX_TYPED_LENGTH = 40_000;

/** Une saisie : la plus longue définition permise (200 modalités d'une liste) y tient. */
const MAX_INPUT_LENGTH = MAX_DEFINITION_LENGTH;
const MAX_TEXT_LENGTH = 10_000;
const MAX_LATEX_LENGTH = 5_000;
const MAX_NOTE_LENGTH = 1_000;

// =============================================================================
// Forme rangée
// =============================================================================

const formula = z.string().max(MAX_LATEX_LENGTH).refine(isSafeLatex);
const name = z.string().min(1).max(100);

/** Le geste, pour qu'un export d'après rechargement se rejoue (`ReplayStep`). */
const replaySchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('saisie'), input: z.string().max(MAX_INPUT_LENGTH) }),
	z.object({
		kind: z.literal('action'),
		action: name,
		name,
		value: z.string().max(MAX_INPUT_LENGTH).optional()
	}),
	z.object({ kind: z.literal('supprimer'), name }),
	z.object({ kind: z.literal('annuler') }),
	z.object({ kind: z.literal('rétablir') }),
	z.object({ kind: z.literal('vider') }),
	z.object({ kind: z.literal('rupture'), reason: z.string().min(1).max(MAX_TEXT_LENGTH) }),
	z.object({ kind: z.literal('garder'), line: z.number().int().min(0).max(MAX_KEPT_LINES) })
]);

/** Le cœur est exigé ; le reste, abîmé, est OUBLIÉ (une formule refusée : la ligne en texte). */
const keptLineSchema = z
	.object({
		label: z.string().max(MAX_INPUT_LENGTH),
		// Composée en `{@html}` comme une réponse : même liste blanche
		inputLatex: formula.optional().catch(undefined),
		text: z.string().max(MAX_TEXT_LENGTH),
		failed: z.boolean(),
		latex: formula.optional().catch(undefined),
		note: z.string().max(MAX_NOTE_LENGTH).optional().catch(undefined),
		alternative: z
			.object({ label: z.enum(['Valeur approchée', 'Valeur exacte']), latex: formula })
			.optional()
			.catch(undefined),
		formulas: z.literal(true).optional().catch(undefined),
		replay: replaySchema.optional().catch(undefined),
		undone: z.literal(true).optional().catch(undefined)
	})
	// Les formules `$…$` d'un refus vont aussi à MathLive (`FormulaText`), par le
	// même découpage (`messageParts`) : une seule refusée, le texte reste brut
	.transform(({ formulas, ...line }): KeptLine =>
		formulas === true &&
		messageParts(line.text).every((part) => !part.math || isSafeLatex(part.text))
			? { ...line, formulas }
			: line
	);

/** L'enveloppe : la version et deux tableaux, triés un élément à la fois. */
const shellSchema = z.object({
	version: z.literal(CALC_HISTORY_VERSION),
	lines: z.array(z.unknown()),
	typed: z.array(z.unknown()).catch([])
});

const EMPTY: LoadedHistory = { kind: 'loaded', history: { lines: [], typed: [] } };

// =============================================================================
// Lire
// =============================================================================

/** Relire l'historique rangé. Abîmé, illisible, refusé : vide, jamais d'exception. */
export function loadCalcHistory(storage: Storage | null): LoadedHistory {
	let parsed: unknown;
	try {
		const raw = storage?.getItem(CALC_HISTORY_STORAGE_KEY) ?? null;
		// Plus gros que ce qu'on écrit : forgé, on ne le lit même pas
		if (raw === null || raw.length > MAX_KEPT_HISTORY_LENGTH) return EMPTY;
		parsed = JSON.parse(raw);
	} catch {
		return EMPTY;
	}
	return readKeptHistory(parsed);
}

/**
 * Relire un historique déjà décodé : celui du navigateur, ou celui d'un fichier
 * `.atelier.json` (`atelier-file.ts`). Même tri, même liste blanche.
 */
export function readKeptHistory(parsed: unknown): LoadedHistory {
	const version = (parsed as { version?: unknown } | null)?.version;
	if (typeof version === 'number' && version > CALC_HISTORY_VERSION) return { kind: 'too-recent' };

	const shell = shellSchema.safeParse(parsed);
	if (!shell.success) return EMPTY;
	// Une ligne abîmée est écartée seule, comme un objet de l'atelier
	const lines = shell.data.lines.slice(-MAX_KEPT_LINES).flatMap((candidate) => {
		const one = keptLineSchema.safeParse(candidate);
		return one.success ? [one.data] : [];
	});
	const typed = shell.data.typed
		.filter((t): t is string => typeof t === 'string' && t.length <= MAX_INPUT_LENGTH)
		.slice(-MAX_KEPT_LINES);
	return { kind: 'loaded', history: { lines, typed } };
}

/**
 * Combien de lignes `readKeptHistory` examinerait (les plus récentes, au plus
 * `MAX_KEPT_LINES`), ou `null` si l'enveloppe elle-même est illisible. Sert au
 * fichier `.atelier.json` à dire ce qui s'est perdu, jamais en silence.
 */
export function offeredLineCount(parsed: unknown): number | null {
	const shell = shellSchema.safeParse(parsed);
	return shell.success ? Math.min(shell.data.lines.length, MAX_KEPT_LINES) : null;
}

// =============================================================================
// Ranger
// =============================================================================

/** Raccourcir un texte trop long : il reste lisible, on le dit par « … ». */
function clip(text: string, max: number): string {
	return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Le geste d'une ligne, ou rien s'il ne tiendrait pas à la relecture. */
function keptReplay(replay: ReplayStep | undefined): ReplayStep | undefined {
	if (replay === undefined) return undefined;
	if (replay.kind === 'saisie' && replay.input.length > MAX_INPUT_LENGTH) return undefined;
	if (replay.kind === 'action' && (replay.value?.length ?? 0) > MAX_INPUT_LENGTH) return undefined;
	return replay;
}

/** Ce qu'on range d'une ligne : ce que l'écran montre, borné. */
function keptLineOf(entry: Entry): KeptLine {
	const replay = keptReplay(entry.replay);
	return {
		label: clip(entry.label, MAX_INPUT_LENGTH),
		// Hors liste blanche, la relecture la refuserait : pas la peine de la ranger
		...(entry.inputLatex !== undefined &&
			entry.inputLatex.length <= MAX_LATEX_LENGTH &&
			isSafeLatex(entry.inputLatex) && { inputLatex: entry.inputLatex }),
		text: clip(entry.text, MAX_TEXT_LENGTH),
		failed: entry.failed,
		// Une formule ne se raccourcit pas : trop longue, la ligne reste en texte
		...(entry.latex !== undefined &&
			entry.latex.length <= MAX_LATEX_LENGTH && { latex: entry.latex }),
		...(entry.note !== undefined && { note: clip(entry.note, MAX_NOTE_LENGTH) }),
		...(entry.alternative !== undefined &&
			entry.alternative.latex.length <= MAX_LATEX_LENGTH && { alternative: entry.alternative }),
		...(entry.formulas === true && entry.text.length <= MAX_TEXT_LENGTH && { formulas: true }),
		...(replay !== undefined && { replay }),
		...(entry.undone === true && { undone: true })
	};
}

/**
 * Les `count` lignes les plus récentes au plus, sous `budget`. Un « Garder » vise
 * une ligne par son rang : recalé sur les lignes gardées, oublié si la sienne est tombée.
 */
function recentLines(entries: readonly Entry[], budget: number, count: number): KeptLine[] {
	const recent = count > 0 ? entries.slice(-count).map(keptLineOf) : [];
	let start = recent.length;
	let size = 0;
	while (start > 0) {
		size += JSON.stringify(recent[start - 1]).length + 1;
		if (size > budget) break;
		start--;
	}
	const offset = entries.length - (recent.length - start);
	return recent.slice(start).map(({ replay, ...line }): KeptLine => {
		if (replay?.kind !== 'garder') return replay === undefined ? line : { ...line, replay };
		const kept = replay.line - offset;
		return kept >= 0 ? { ...line, replay: { kind: 'garder', line: kept } } : line;
	});
}

/** Les saisies à rappeler, les plus récentes, sous leur part du plafond. */
function recentTyped(typed: readonly string[]): string[] {
	const recent = typed.filter((t) => t.length <= MAX_INPUT_LENGTH).slice(-MAX_KEPT_LINES);
	let size = 0;
	let start = recent.length;
	while (start > 0 && size + recent[start - 1].length + 3 <= MAX_TYPED_LENGTH) {
		size += recent[start - 1].length + 3;
		start--;
	}
	return recent.slice(start);
}

/** La place des lignes : le plafond, moins les saisies et une marge pour l'enveloppe. */
function linesBudget(typed: readonly string[]): number {
	// La marge couvre l'enveloppe (`version`, clés, crochets)
	return MAX_KEPT_HISTORY_LENGTH - JSON.stringify(typed).length - 1_000;
}

/**
 * L'historique tel qu'on le range, sans le ranger : celui que porte un fichier
 * `.atelier.json` (`atelier-file.ts`). Mêmes bornes que le navigateur, donc
 * toujours relisible par `readKeptHistory`.
 */
export function keptHistoryOf(
	entries: readonly Entry[],
	typed: readonly string[]
): { version: typeof CALC_HISTORY_VERSION; lines: KeptLine[]; typed: string[] } {
	const kept = recentTyped(typed);
	return {
		version: CALC_HISTORY_VERSION,
		lines: recentLines(entries, linesBudget(kept), MAX_KEPT_LINES),
		typed: kept
	};
}

/**
 * Ranger l'historique ; vide (console vidée) : la clé est retirée. Stockage
 * plein : les lignes les plus récentes, par moitiés, puis rien — jamais d'exception.
 */
export function saveCalcHistory(
	storage: Storage | null,
	entries: readonly Entry[],
	typed: readonly string[]
): 'saved' | 'removed' | 'unavailable' {
	if (storage === null) return 'unavailable';
	try {
		if (entries.length === 0 && typed.length === 0) {
			storage.removeItem(CALC_HISTORY_STORAGE_KEY);
			return 'removed';
		}
		const kept = recentTyped(typed);
		const budget = linesBudget(kept);
		let lines = recentLines(entries, budget, MAX_KEPT_LINES);
		for (;;) {
			try {
				storage.setItem(
					CALC_HISTORY_STORAGE_KEY,
					JSON.stringify({ version: CALC_HISTORY_VERSION, lines, typed: kept })
				);
				return 'saved';
			} catch (error) {
				if (!isQuotaExceeded(error) || lines.length === 0) throw error;
				lines = recentLines(entries, budget, Math.floor(lines.length / 2));
			}
		}
	} catch {
		try {
			storage.removeItem(CALC_HISTORY_STORAGE_KEY);
		} catch {
			// Stockage refusé jusqu'à l'effacement : il n'y a rien à garder
		}
		return 'unavailable';
	}
}
