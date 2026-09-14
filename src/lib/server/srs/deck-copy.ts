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

/** Ce qu'il faut du deck source pour en fabriquer une copie. */
export type SourceDeck = {
	name: string;
	description: string | null;
	deck_type: string;
	config: unknown;
};

/**
 * Une copie du deck par élève.
 *
 * ⚠️ `source_deck_id` n'est PAS une commodité d'affichage : la policy élève de
 * `chapter_decks` s'en sert pour n'afficher un deck de chapitre qu'à ceux qui
 * en possèdent une copie. Une copie sans source est invisible dans le
 * chapitre — le deck est bien là, l'élève ne le voit pas, et rien ne le dit.
 */
export function planDeckCopies(
	sourceDeck: SourceDeck,
	sourceDeckId: string,
	studentIds: string[]
): {
	name: string;
	description: string | null;
	owner_id: string;
	deck_type: string;
	is_assigned: true;
	config: unknown;
	source_deck_id: string;
}[] {
	return studentIds.map((studentId) => ({
		name: sourceDeck.name,
		description: sourceDeck.description,
		owner_id: studentId,
		deck_type: sourceDeck.deck_type,
		// La copie est en lecture seule : l'élève révise, il ne réécrit pas le
		// deck du professeur.
		is_assigned: true as const,
		config: sourceDeck.config,
		// D'où vient cette copie. `srs_deck_assignments` ne garde que
		// (source, élève) : sans ce lien, retrouver LA copie d'un élève
		// obligeait à apparier sur le nom du deck.
		source_deck_id: sourceDeckId
	}));
}
