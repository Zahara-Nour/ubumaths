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
 * Phase 0 : `docs/wip/atelier-suppression-export-phase0.md`, lot C.
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
			failed: entry.failed
		}))
	};
	return JSON.stringify(history, null, '\t');
}

/** L'historique à lire : une saisie en code, une action en gras, la réponse dessous. */
export function historyToUbumark(entries: readonly Entry[], now: Date): string {
	const date = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
	const blocks = [`# Historique de calcul — ${date}`];
	for (const entry of entries) {
		blocks.push(entry.replay?.kind === 'saisie' ? `\`${entry.label}\`` : `**${entry.label}**`);
		blocks.push(answerOf(entry));
		const steps = (entry.steps ?? []).map(
			(step) => `- ${step.title}${step.expressionLatex ? ` : $${step.expressionLatex}$` : ''}`
		);
		if (steps.length > 0) blocks.push(steps.join('\n'));
		if (entry.table !== undefined) blocks.push('_(tableau de variations : à voir dans l’atelier)_');
		if (entry.chart !== undefined) blocks.push('_(graphique : à voir dans l’atelier)_');
	}
	return `${blocks.join('\n\n')}\n`;
}

/** La réponse : en formule quand l'écran en montrait une, sinon en toutes lettres. */
function answerOf(entry: Entry): string {
	if (entry.failed) return `Erreur : ${entry.text}`;
	return entry.latex !== undefined && entry.latex !== '' ? `$${entry.latex}$` : entry.text;
}
