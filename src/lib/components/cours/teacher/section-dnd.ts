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

import { SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';

/** Une ressource telle que la zone de dépose la manipule. */
export type DndItem = { id: string };

/**
 * D'où part la ressource tirée : sa zone (`null` = « Non classé ») et son rang.
 *
 * ⚠️ C'est la SEULE mémoire fiable du point de départ, et elle se prend au tout
 * début du geste. Relire les zones au moment de la dépose ne le donne pas :
 * `svelte-dnd-action` y a déjà déplacé sa copie « ombre », et lui a rendu
 * l'identifiant de la ressource tirée (`keepOriginalElementInDom`). La zone
 * survolée contient donc un élément qui porte cet identifiant — le plan croyait
 * la ressource DÉJÀ rangée là, au même rang, concluait « rien n'a bougé », et
 * n'enregistrait rien. Le déplacement tenait à l'écran jusqu'au rechargement.
 */
export type DragOrigin = { zone: string | null; index: number };

export type DropOutcome =
	| { kind: 'ignored'; reason: 'not-landed' | 'unchanged' }
	| { kind: 'moved'; from: string | null; to: string | null }
	| { kind: 'reordered'; zone: string | null };

/** La copie « ombre » que la bibliothèque promène pendant le geste. */
export function estOmbre(item: DndItem): boolean {
	return Boolean((item as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME]);
}

/**
 * Le point de départ du geste, lu sur le `consider` de prise (« dragStarted »).
 *
 * À la souris, la bibliothèque a remplacé la ressource par son ombre, au même
 * rang ; au clavier, elle laisse la liste intacte. Chercher l'un OU l'autre
 * couvre les deux.
 *
 * @param zone   la zone où le geste commence (`null` = « Non classé »)
 * @param items  ses éléments, tels que le `consider` les rend
 * @param movedId l'identifiant rendu par la bibliothèque
 */
export function origineDuGlisser(
	zone: string | null,
	items: DndItem[],
	movedId: string
): DragOrigin {
	return { zone, index: items.findIndex((item) => estOmbre(item) || item.id === movedId) };
}

/**
 * Que faut-il faire d'une dépose ?
 *
 * @param origin    d'où part la ressource, ou `null` si la prise a été manquée
 * @param targetId  la zone qui reçoit (`null` = « Non classé »)
 * @param arrived   les éléments de la zone d'arrivée, dédoublonnés
 * @param movedId   l'identifiant rendu par la bibliothèque
 */
export function resolveDrop(
	origin: DragOrigin | null,
	targetId: string | null,
	arrived: DndItem[],
	movedId: string
): DropOutcome {
	const nouvelIndex = arrived.findIndex((item) => item.id === movedId);

	// Déposée hors de toute zone : la bibliothèque rend quand même un finalize.
	if (nouvelIndex === -1) {
		return { kind: 'ignored', reason: 'not-landed' };
	}

	// Prise manquée : course rare entre la prise et la dépose. On persiste
	// plutôt que de deviner — l'API traitera ça comme une mise à jour d'ordre.
	if (!origin) {
		return { kind: 'reordered', zone: targetId };
	}

	if (origin.zone !== targetId) {
		return { kind: 'moved', from: origin.zone, to: targetId };
	}

	// Même zone : si le rang n'a pas bougé, il n'y a rien à persister.
	if (origin.index === nouvelIndex) {
		return { kind: 'ignored', reason: 'unchanged' };
	}

	return { kind: 'reordered', zone: targetId };
}

/**
 * Remet un élément au rang d'où il est parti, quand le rangement est refusé.
 *
 * ⚠️ L'instantané pris à la dépose ne le porte PLUS : pendant le geste, seule
 * son ombre y figurait, et on ne restaure jamais une ombre — elle resterait en
 * ligne fantôme, grisée, jusqu'au rechargement.
 */
export function remettreAuRang<T>(liste: T[], index: number, element: T): T[] {
	const rang = index >= 0 && index <= liste.length ? index : liste.length;
	return [...liste.slice(0, rang), element, ...liste.slice(rang)];
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
