/**
 * Contenu du cahier de texte — format et aperçu
 * =============================================
 *
 * Le cahier de texte (`class_journal_entries.lesson_content`,
 * `journal_entry_homework.content`) est écrit en **ubumark** depuis le chantier
 * cahier-ubumark (décision de David du 2026-10-25). Avant, il l'était en HTML
 * (`bind:htmlValue` de TipTap) ; les lignes HTML ont été converties le
 * 2026-11-08 (migration 20261106164230) et la lecture HTML retirée ensuite.
 *
 * @module journal/content
 */

import { referencesToLabels } from '$lib/resources/references';
import { stripMarkdown } from '$lib/ubumark';

/**
 * Texte brut d'un contenu du cahier, pour les aperçus (grille de la semaine,
 * carte de travail) : ni marque markdown, les références réduites à
 * leur libellé.
 *
 * Les références passent AVANT `stripMarkdown` : un type comme
 * `worksheet_exercise` contient un tiret bas, que la règle de l'italique
 * prendrait pour une marque.
 *
 * `maxLength` : au-delà, le texte est coupé et suivi de « ... ».
 */
export function journalContentPreview(
	content: string | null | undefined,
	maxLength?: number
): string {
	if (!content) return '';
	const text = stripMarkdown(referencesToLabels(content));
	const preview = text.replace(/\s+/g, ' ').trim();
	if (maxLength === undefined || preview.length <= maxLength) return preview;
	return preview.slice(0, maxLength).trimEnd() + '...';
}
