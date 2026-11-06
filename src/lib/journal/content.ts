/**
 * Contenu du cahier de texte — format et aperçu
 * =============================================
 *
 * Le cahier de texte (`class_journal_entries.lesson_content`,
 * `journal_entry_homework.content`) est écrit en **ubumark** depuis le chantier
 * cahier-ubumark (décision de David du 2026-10-25). Avant, il l'était en HTML
 * (`bind:htmlValue` de TipTap).
 *
 * ⚠️ TRANSITOIRE : tant que les lignes écrites en HTML ne sont pas converties
 * (migration de données qui suit la mise en prod de ce code), les deux formats
 * coexistent. `isLegacyHtmlContent` les distingue ; elle disparaîtra avec la
 * lecture HTML, une fois la conversion faite.
 *
 * @module journal/content
 */

import { referencesToLabels } from '$lib/resources/references';
import { stripMarkdown } from '$lib/ubumark';

/**
 * Le HTML de TipTap commence toujours par une balise de bloc. On la reconnaît
 * par son NOM, pas par le seul `<` : un markdown peut commencer par une
 * comparaison (« < 3 élèves absents »).
 */
const LEGACY_HTML_START = /^<(p|h[1-6]|ul|ol|li|blockquote|pre|table|div|hr|img|span)\b/i;

/** Entités que TipTap écrit dans du texte, décodées pour l'aperçu. */
const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'",
	'&nbsp;': ' '
};

/** Le contenu est-il encore dans l'ancien format HTML ? */
export function isLegacyHtmlContent(content: string | null | undefined): boolean {
	if (!content) return false;
	return LEGACY_HTML_START.test(content.trimStart());
}

/**
 * Texte brut d'un contenu du cahier, pour les aperçus (grille de la semaine,
 * carte de travail) : ni balise, ni marque markdown, les références réduites à
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
	const labelled = referencesToLabels(content);
	const text = isLegacyHtmlContent(content)
		? labelled
				.replace(/<[^>]*>/g, ' ')
				.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
		: stripMarkdown(labelled);
	const preview = text.replace(/\s+/g, ' ').trim();
	if (maxLength === undefined || preview.length <= maxLength) return preview;
	return preview.slice(0, maxLength).trimEnd() + '...';
}
