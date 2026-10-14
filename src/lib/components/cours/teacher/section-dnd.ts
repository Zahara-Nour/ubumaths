/**
 * Logique de dépose des ressources d'un chapitre — sans le geste
 *
 * Extraite du composant pour décider en un seul endroit : d'où vient la
 * ressource, la dépose est-elle sans effet, quelle zone renuméroter.
 *
 * ⚠️ Ces fonctions pures ne suffisent PAS à couvrir le glisser-déposer, et
 * l'avoir cru a coûté un bug en production : leurs cas partaient d'un état
 * d'AVANT le geste, que le composant n'a jamais entre les mains. C'est
 * `ChapterSectionsEditor.svelte.test.ts` qui rejoue la vraie séquence de la
 * bibliothèque — et c'est le seul qui ait vu que rien ne s'enregistrait.
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
 * ⚠️ L'instantané pris à la dépose ne doit PAS le porter — l'appelant l'en
 * retire, ombre ou non : deux lignes de même clé feraient lever
 * `each_key_duplicate` au rendu. Et on ne restaure jamais une ombre : elle
 * resterait en ligne fantôme, grisée, jusqu'au rechargement.
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
	sections: { id: string; title: string; sourceId?: string | null }[];
	documents: Visible<{ id: string; title: string }>[];
	exercises: Visible<{ id: string }>[];
	checklistItems: Visible<{ id: string; content: string; description: string | null }>[];
	worksheets: Visible<{ id: string; title: string | null }>[];
	distributedWorksheetIds: string[];
	/** Séries de chapitre : la FORME s'affiche aussi, et se change depuis le plan. */
	series?: Visible<{ id: string; title: string | null; form: string }>[];
};

/**
 * Ce qui change l'affichage d'un élément sans changer son identifiant : sa
 * publication (absente dans un modèle, qui ne publie rien), son masquage et son
 * LIEN au modèle dans un chapitre lié (ADR 0029). Masquer doit faire disparaître
 * la ligne aussitôt ; détacher (`sourceId` remis à vide) doit retirer la marque
 * « Modèle » et rendre la corbeille — sinon « Masquer » viserait une ligne qui
 * n'est plus un lien (404).
 */
type Visible<T> = T & { publishedAt?: string | null; hidden?: boolean; sourceId?: string | null };

/** L'état d'affichage d'un élément, dans l'empreinte. */
function vue(x: {
	publishedAt?: string | null;
	hidden?: boolean;
	sourceId?: string | null;
}): string {
	return `${x.publishedAt ?? null}~${x.hidden === true}~${(x.sourceId ?? null) !== null}`;
}

export function empreinteAffichage(source: EmpreinteSource): string {
	return [
		source.sections.map((x) => `${x.id}~${x.title}~${(x.sourceId ?? null) !== null}`).join(','),
		source.documents.map((x) => `${x.id}~${vue(x)}~${x.title}`).join(','),
		source.exercises.map((x) => `${x.id}~${vue(x)}`).join(','),
		source.checklistItems.map((x) => `${x.id}~${vue(x)}~${x.content}~${x.description}`).join(','),
		source.worksheets.map((x) => `${x.id}~${vue(x)}~${x.title}`).join(','),
		source.distributedWorksheetIds.join(','),
		(source.series ?? []).map((x) => `${x.id}~${vue(x)}~${x.form}~${x.title}`).join(',')
	].join('|');
}

/**
 * La zone entière à enregistrer, masqués compris, quand le plan ne montre pas
 * les éléments masqués.
 *
 * La liste affichée n'a que les visibles : la renuméroter seule (0, 1, 2…)
 * mettrait un masqué à égalité de rang avec un visible, et réaffiché il
 * sauterait à une place quelconque. Chaque masqué reprend sa place juste APRÈS
 * l'élément qu'il suivait (s'il est encore là), sinon en tête de zone.
 *
 * @param complet la zone telle qu'elle était, masqués compris, dans l'ordre
 * @param affichee la zone telle que le professeur vient de la ranger
 */
export function avecMasquesASaPlace<T extends { id: string; hidden?: boolean }>(
	complet: T[],
	affichee: T[]
): T[] {
	const presents = new Set(affichee.map((x) => x.id));
	const sortie = [...affichee];
	let ancre: string | null = null;
	let insertionsEnTete = 0;
	// Combien de masqués déjà rangés derrière chaque ancre, pour garder leur ordre.
	const apresAncre = new Map<string, number>();

	for (const x of complet) {
		if (presents.has(x.id)) {
			ancre = x.id;
			continue;
		}
		if (x.hidden !== true) continue; // parti dans une autre zone

		if (ancre === null) {
			sortie.splice(insertionsEnTete, 0, x);
			insertionsEnTete += 1;
		} else {
			const deja = apresAncre.get(ancre) ?? 0;
			const rang = sortie.findIndex((y) => y.id === ancre) + 1 + deja;
			sortie.splice(rang, 0, x);
			apresAncre.set(ancre, deja + 1);
		}
	}
	return sortie;
}
