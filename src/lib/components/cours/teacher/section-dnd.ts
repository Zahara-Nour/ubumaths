/**
 * Logique de dépose des ressources d'un chapitre — sans le geste
 *
 * Extraite du composant pour être testable : un test de glisser-déposer ne
 * peut que FABRIQUER les événements que la bibliothèque émet, et prouverait
 * alors surtout que la simulation est fidèle. Ce qui mérite un test, c'est ce
 * qui suit la dépose — d'où vient la ressource, la dépose est-elle sans effet,
 * quelles zones renuméroter.
 *
 * @module components/cours/teacher/section-dnd
 */

/** Une ressource telle que la zone de dépose la manipule. */
export type DndItem = { id: string };

/** L'état des zones avant la dépose. `null` = « Non classé ». */
export type ZonesSnapshot = {
	sections: { id: string; items: DndItem[] }[];
	unassigned: DndItem[];
};

export type DropOutcome =
	| { kind: 'ignored'; reason: 'not-landed' | 'unchanged' }
	| { kind: 'moved'; from: string | null; to: string | null }
	| { kind: 'reordered'; zone: string | null };

/**
 * Que faut-il faire d'une dépose ?
 *
 * @param snapshot  l'état des zones AVANT la dépose
 * @param targetId  la zone qui reçoit (`null` = « Non classé »)
 * @param arrived   les éléments de la zone d'arrivée, dédoublonnés
 * @param movedId   l'identifiant rendu par la bibliothèque
 */
export function resolveDrop(
	snapshot: ZonesSnapshot,
	targetId: string | null,
	arrived: DndItem[],
	movedId: string
): DropOutcome {
	// Déposée hors de toute zone : la bibliothèque rend quand même un finalize.
	if (!arrived.some((item) => item.id === movedId)) {
		return { kind: 'ignored', reason: 'not-landed' };
	}

	const sourceSection = snapshot.sections.find((s) => s.items.some((i) => i.id === movedId));
	const venaitDesNonClassees = snapshot.unassigned.some((i) => i.id === movedId);

	// Introuvable dans l'instantané : course rare entre `consider` et
	// `finalize`. On persiste plutôt que de deviner — l'API traitera ça comme
	// une mise à jour d'ordre.
	if (!sourceSection && !venaitDesNonClassees) {
		return { kind: 'reordered', zone: targetId };
	}

	const sourceId = sourceSection ? sourceSection.id : null;

	if (sourceId !== targetId) {
		return { kind: 'moved', from: sourceId, to: targetId };
	}

	// Même zone : si l'index n'a pas bougé, il n'y a rien à persister.
	const avant = sourceSection ? sourceSection.items : snapshot.unassigned;
	const ancienIndex = avant.findIndex((i) => i.id === movedId);
	const nouvelIndex = arrived.findIndex((i) => i.id === movedId);

	if (ancienIndex === nouvelIndex) {
		return { kind: 'ignored', reason: 'unchanged' };
	}

	return { kind: 'reordered', zone: targetId };
}

/**
 * Ce que l'affichage du plan doit à ses props.
 *
 * ⚠️ Cette empreinte arbitre un conflit réel : pendant un glisser, l'état local
 * doit rester la source de vérité, sinon le geste saccade ; mais tout ce que le
 * professeur change depuis le plan — publier, corriger un objectif — revient
 * par les props après `invalidateAll()`, et doit s'afficher.
 *
 * D'où la règle : on retient CE QUI EXISTE ET CE QUI S'AFFICHE, jamais le
 * rangement. `section_id` et `section_order` en sont volontairement absents,
 * et ce sont les seuls champs qu'un glisser modifie.
 *
 * ⚠️ Se limiter aux identifiants serait le piège : publier ne change aucun
 * identifiant. L'affichage resterait figé sur « Préparé », et comme le bouton
 * de publication calcule son intention depuis `publishedAt`, dépublier
 * deviendrait impossible sans recharger la page.
 */
export type EmpreinteSource = {
	sections: { id: string; title: string }[];
	documents: { id: string; title: string; publishedAt: string | null }[];
	exercises: { id: string; publishedAt: string | null }[];
	checklistItems: {
		id: string;
		content: string;
		description: string | null;
		publishedAt: string | null;
	}[];
	worksheets: { id: string; title: string | null; publishedAt: string | null }[];
	distributedWorksheetIds: string[];
};

export function empreinteAffichage(source: EmpreinteSource): string {
	return [
		source.sections.map((x) => `${x.id}~${x.title}`).join(','),
		source.documents.map((x) => `${x.id}~${x.publishedAt}~${x.title}`).join(','),
		source.exercises.map((x) => `${x.id}~${x.publishedAt}`).join(','),
		source.checklistItems
			.map((x) => `${x.id}~${x.publishedAt}~${x.content}~${x.description}`)
			.join(','),
		source.worksheets.map((x) => `${x.id}~${x.publishedAt}~${x.title}`).join(','),
		source.distributedWorksheetIds.join(',')
	].join('|');
}
