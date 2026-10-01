/**
 * Blocs ```courbe, ```figure, statistiques : un ``` lointain les ferme-t-il ?
 * =========================================================================
 *
 * Q25 / Q47 (2026-10-02) : un bloc NON FERMÉ suivi plus loin d'un ``` seul
 * était pris pour fermé — il avalait le texte intermédiaire, et le ```
 * suivant ouvrait un bloc de code jamais refermé.
 *
 * ⚠️ La règle doit rester étroite. Une première version (« toute ligne non
 * conforme empêche la fermeture ») transformait une simple faute de frappe
 * dans un bloc FERMÉ en bloc non fermé : son ``` de fin ouvrait alors un bloc
 * de code qui avalait TOUTE la suite de la fiche (revue de la PR). Seule une
 * ligne qui OUVRE UN PARAGRAPHE MARKDOWN interdit donc la fermeture :
 * - elle suit une ligne vide ;
 * - elle n'a pas la forme d'une ligne du bloc ;
 * - elle ressemble à du texte : un item de liste, un `$$`, ou au moins deux
 *   mots sans `=`, `(`, `:` ni `;`. Jamais une ligne qui commence par `#`
 *   (commentaire du langage des figures, `##` compris).
 *
 * @module ubumark/parser/block-closure
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/** Au moins deux mots (lettres, accents compris) */
const TWO_WORDS = /\p{L}{2,}.*\s\p{L}{2,}/u;

/** Ce qu'aucune phrase de texte ordinaire ne contient, et toute ligne de bloc presque toujours */
const BLOCK_SYNTAX = /[=(:;]/;

const LIST_ITEM = /^([-*+]|\d+\.)\s/;

// ============================================================================
// FONCTIONS
// ============================================================================

function looksLikeProse(line: string): boolean {
	const trimmed = line.trim();
	if (trimmed.startsWith('#')) return false;
	if (LIST_ITEM.test(trimmed) || trimmed.startsWith('$$')) return true;
	return TWO_WORDS.test(trimmed) && !BLOCK_SYNTAX.test(trimmed);
}

/**
 * Le corps entre l'ouverture et un ``` lointain contient-il une ligne qui
 * ouvre un paragraphe markdown ? Si oui, ce ``` ne ferme PAS le bloc.
 *
 * @param isBlockLine ce qui a la forme d'une ligne du bloc (jamais du texte)
 */
export function bodyOpensParagraph(
	body: readonly string[],
	isBlockLine: (line: string) => boolean
): boolean {
	return body.some((line, k) => {
		const afterBlank = k > 0 && body[k - 1].trim() === '';
		if (!afterBlank || line.trim() === '') return false;
		// Une ligne en retrait continue une instruction (langage des figures)
		if (line.startsWith(' ') || line.startsWith('\t')) return false;
		return !isBlockLine(line) && looksLikeProse(line);
	});
}
