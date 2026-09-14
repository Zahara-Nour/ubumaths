/**
 * Copie d'un deck assigné — la correspondance des sections
 *
 * Assigner un deck crée une COPIE par élève. Les cartes doivent retrouver LEUR
 * section dans la copie, jamais celle du deck source.
 *
 * ⚠️ Pourquoi cette logique vit ici plutôt que dans la route : `srs_cards`
 * n'a PAS de clé étrangère composite `(section_id, deck_id)`. La base
 * accepterait donc sans broncher une carte de l'élève pointant vers une section
 * du professeur. Une correspondance fausse ne serait rattrapée par rien —
 * d'où un module testable, plutôt qu'une boucle enfouie dans un handler.
 *
 * @module server/srs/deck-copy
 */

/** Une section telle qu'elle existe dans le deck source. */
export type SourceSection = { id: string; name: string; description: string | null };

/** Ce qu'il faut de la carte source pour la ranger dans la copie. */
export type SourceCard = { section_id: string | null };

/**
 * Les sections à créer, pour chaque deck copié.
 *
 * ⚠️ `display_order` est RENUMÉROTÉ de 0 à n, et ce n'est pas cosmétique :
 * c'est la clé qui permettra de retrouver la copie d'une section. L'ordre de
 * retour d'un `insert().select()` n'est pas garanti, et deux sections peuvent
 * porter le même nom — le rang, lui, est unique par deck parce que nous le
 * fabriquons.
 */
export function planSectionCopies(
	sourceSections: SourceSection[],
	deckIds: string[]
): { deck_id: string; name: string; description: string | null; display_order: number }[] {
	return deckIds.flatMap((deckId) =>
		sourceSections.map((section, rang) => ({
			deck_id: deckId,
			name: section.name,
			description: section.description,
			display_order: rang
		}))
	);
}

/** Indexe les sections créées par `deck|rang`. */
export function indexCopiedSections(
	createdSections: { id: string; deck_id: string; display_order: number }[]
): Map<string, string> {
	return new Map(createdSections.map((s) => [`${s.deck_id}|${s.display_order}`, s.id]));
}

/**
 * La section de la COPIE pour une carte donnée.
 *
 * Rend `null` pour une carte hors section — elle doit le rester — et pour une
 * carte dont la section source n'a pas été copiée, plutôt que de la rattacher
 * au hasard.
 */
export function resolveCardSection(
	card: SourceCard,
	sourceSections: SourceSection[],
	copiedSections: Map<string, string>,
	deckId: string
): string | null {
	if (!card.section_id) return null;

	const rang = sourceSections.findIndex((s) => s.id === card.section_id);
	if (rang === -1) return null;

	return copiedSections.get(`${deckId}|${rang}`) ?? null;
}
