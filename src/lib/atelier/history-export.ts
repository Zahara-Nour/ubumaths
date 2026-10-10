/**
 * Atelier — exporter l'historique de Calcul
 *
 * Deux formats, décision de David (2026-10-05) :
 *
 * - **JSON** pour rejouer : chaque entrée garde son geste (`ReplayStep`) et sa
 *   réponse — la réponse sert à lire le fichier et à vérifier le rejeu ;
 * - **ubumark** pour lire et recopier dans une fiche : formules en `$…$` LaTeX,
 *   jamais en `~…~` (pièges connus : grec, primes sur une autre lettre que f).
 *
 * Phase 0 : `docs/archive/wip/atelier-suppression-export-phase0.md`, lot C.
 *
 * @module atelier/history-export
 */

import type { Entry, ReplayStep } from './desk.svelte';

// =============================================================================
// Types
// =============================================================================

export type ExportFormat = 'json' | 'ubumark';

/** Une entrée du fichier JSON : le geste, puis ce que l'écran montrait. */
export type ExportedEntry = (ReplayStep | { readonly kind: 'ligne' }) & {
	readonly label: string;
	readonly text: string;
	readonly latex?: string;
	/** L'indication affichée avec la réponse (« Calcul par rapport à x… ») */
	readonly note?: string;
	readonly failed: boolean;
};

export interface ExportedHistory {
	readonly format: typeof HISTORY_FORMAT;
	readonly version: typeof HISTORY_VERSION;
	readonly exportedAt: string;
	readonly entries: readonly ExportedEntry[];
}

// =============================================================================
// Constantes
// =============================================================================

export const HISTORY_FORMAT = 'chiphre-calcul';

/** À incrémenter dès que la forme change : le rejeu refuse une version plus récente (E2). */
export const HISTORY_VERSION = 1;

const EXTENSIONS: Readonly<Record<ExportFormat, string>> = { json: 'json', ubumark: 'md' };

/** Ce qui, en tête de ligne, ferait une liste, un titre, une citation ou un tableau. */
const BLOCK_START = /^\s*([-+>#|]|\d+[.)])/;

// =============================================================================
// Fonctions
// =============================================================================

/** `calcul-2026-10-05.json` */
export function exportFileName(format: ExportFormat, now: Date): string {
	return `calcul-${now.toISOString().slice(0, 10)}.${EXTENSIONS[format]}`;
}

/** L'historique pour le rejeu. Une ligne sans geste (ligne secondaire) est gardée, pour la lecture. */
export function historyToJson(entries: readonly Entry[], now: Date): string {
	const history: ExportedHistory = {
		format: HISTORY_FORMAT,
		version: HISTORY_VERSION,
		exportedAt: now.toISOString(),
		entries: entries.map((entry) => ({
			...(entry.replay ?? { kind: 'ligne' as const }),
			label: entry.label,
			text: entry.text,
			...(entry.latex !== undefined && { latex: entry.latex }),
			...(entry.note !== undefined && { note: entry.note }),
			failed: entry.failed
		}))
	};
	return JSON.stringify(history, null, '\t');
}

/**
 * L'historique à lire : une saisie en code, une action en titre, la réponse
 * dessous.
 *
 * ⚠️ Le parseur ubumark est maison, et mesuré le 2026-10-05 : `$` ET `~`
 * ouvrent une formule (échappés `\$`, `\~`) ; `*` ouvre l'italique et `\*`
 * garde son antislash à l'affichage ; `**f_1**` n'est pas lu comme du gras ;
 * un backtick dans un code en ligne le coupe. Chaque règle ci-dessous en vient.
 */
export function historyToUbumark(entries: readonly Entry[], now: Date): string {
	const date = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
	const blocks = [`# Historique de calcul — ${date}`];
	for (const entry of entries) {
		blocks.push(headOf(entry));
		blocks.push(answerOf(entry));
		// L'indication en italique, après la réponse, comme à l'écran
		if (entry.note !== undefined) blocks.push(`*${plainLine(entry.note)}*`);
		const steps = (entry.steps ?? []).map(
			(step) =>
				`- ${plainLine(step.title)}${step.expressionLatex ? ` : $${step.expressionLatex}$` : ''}`
		);
		if (steps.length > 0) blocks.push(steps.join('\n'));
		if (entry.table !== undefined) blocks.push('(tableau de variations : à voir dans l’atelier)');
		if (entry.chart !== undefined) blocks.push('(graphique : à voir dans l’atelier)');
	}
	return `${blocks.join('\n\n')}\n`;
}

/** Une saisie en code ; une action en titre. */
function headOf(entry: Entry): string {
	// ⚠️ Les formules sont extraites AVANT le code : `~x+1~` en deviendrait une
	// même entre backticks — `\~` et `\$` y sont relus tels quels (mesuré)
	if (entry.replay?.kind === 'saisie' && !entry.label.includes('`')) {
		return `\`${entry.label.replaceAll('$', '\\$').replaceAll('~', '\\~')}\``;
	}
	return `### ${plainLine(entry.label)}`;
}

/** La réponse : en formule quand l'écran en montrait une, sinon en toutes lettres. */
function answerOf(entry: Entry): string {
	if (!entry.failed && entry.latex !== undefined && entry.latex !== '') return `$${entry.latex}$`;
	const text = entry.failed ? `Erreur : ${entry.text}` : entry.text;
	// Plusieurs lignes, ou un début qui ferait une liste ou un titre : en bloc
	// de code, où rien n'est interprété
	if (text.includes('\n') || BLOCK_START.test(text)) {
		return ['```', text.replaceAll('```', 'ʼʼʼ'), '```'].join('\n');
	}
	return plainLine(text);
}

/** Une ligne de texte qui ne doit rien ouvrir : ni formule, ni italique. */
function plainLine(text: string): string {
	return text.replaceAll('*', '×').replaceAll('$', '\\$').replaceAll('~', '\\~');
}
