/**
 * Nombre de pages d'un PDF compilé par Typst
 * ==========================================
 *
 * Pour l'aperçu de la fiche (« Aperçu : N pages », ADR 0030 lot 4) : les PDF de
 * Typst écrivent chaque objet page en clair (`/Type /Page`) ; l'arbre des pages
 * (`/Type /Pages`) ne compte pas. Pas un lecteur de PDF général : un PDF dont
 * les objets seraient compressés rendrait 0, et l'aperçu n'afficherait rien.
 *
 * @module typst/pdf-page-count
 */

/** `/Type /Page` (espaces facultatifs), mais pas `/Type /Pages` */
const PAGE_OBJECT = /\/Type\s*\/Page(?![A-Za-z])/g;

export function pdfPageCount(pdf: Uint8Array): number {
	// latin1 : un octet, un caractère ; les flux binaires ne gênent pas la recherche
	const text = new TextDecoder('latin1').decode(pdf);
	return text.match(PAGE_OBJECT)?.length ?? 0;
}
