/**
 * Cartes partagées entre plusieurs référentiels
 * ==============================================
 *
 * Un modèle de question peut être rattaché (`question_template_points`) à des
 * points de PLUSIEURS niveaux — ex. une même carte en Terminale spécialité
 * (`T_SPE`) et en maths complémentaires (`T_COMP`). Un lecteur qui sert UN
 * niveau (l'élève, la classe) ne doit alors retenir que les points de ce
 * niveau : sinon il affiche les objectifs de l'autre programme, ou compte deux
 * fois la même capacité.
 *
 * Règle, carte par carte :
 *   - pas de niveau connu → tous les points (comportement d'avant) ;
 *   - la carte a au moins un point du niveau → seulement ceux-là ;
 *   - la carte n'a AUCUN point du niveau → tous ses points (comportement
 *     d'avant). Une classe de 2ⁿᵈᵉ qui retravaille une carte de 3ᵉ garde sa
 *     colonne : le filtre ne tranche qu'entre niveaux d'une même carte.
 *
 * Filtré en mémoire, pas dans la requête : un `!inner` filtré sur le niveau
 * ferait disparaître les cartes du troisième cas.
 */

/** Ligne de rattachement, réduite à ce que la règle lit. */
export interface GradedTemplateLink {
	template_id: string;
	/** `curriculum_themes.grade` du point, `null` si la jointure est vide. */
	grade: string | null;
}

/**
 * Garde, pour chaque carte, les rattachements du niveau demandé quand elle en
 * a ; sinon tous. L'ordre d'entrée est conservé (le tri de la requête compte).
 */
export function keepLinksOfGrade<T>(
	links: readonly T[],
	grade: string | null | undefined,
	read: (link: T) => GradedTemplateLink
): T[] {
	if (!grade) return [...links];

	const templatesWithGrade = new Set<string>();
	for (const link of links) {
		const { template_id, grade: linkGrade } = read(link);
		if (linkGrade === grade) templatesWithGrade.add(template_id);
	}

	return links.filter((link) => {
		const { template_id, grade: linkGrade } = read(link);
		return !templatesWithGrade.has(template_id) || linkGrade === grade;
	});
}
