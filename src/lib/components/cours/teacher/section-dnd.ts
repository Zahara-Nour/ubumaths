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
