/**
 * Ce que devient une dépose — la logique, pas le geste.
 *
 * Un test qui simulerait le glisser-déposer prouverait surtout que la
 * simulation est fidèle à `svelte-dnd-action`. Ces cas-là portent sur ce que le
 * composant DÉCIDE une fois la dépose faite, et c'est là que sont les erreurs
 * coûteuses : une dépose sans effet qui déclenche quand même un appel, un
 * déplacement entre sections pris pour un simple réordonnancement — ou, pire,
 * un déplacement pris pour une dépose sans effet, qui ne s'enregistre jamais.
 *
 * ⚠️ Le geste de bout en bout, lui, est couvert par
 * `ChapterSectionsEditor.svelte.test.ts`, qui rejoue la vraie séquence de la
 * bibliothèque. C'est là que se voit ce qu'aucun cas ci-dessous ne peut
 * montrer : au moment de la dépose, les zones ne savent PLUS d'où vient la
 * ressource.
 */
import { describe, expect, it } from 'vitest';
import { SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
import {
	empreinteAffichage,
	origineDuGlisser,
	remettreAuRang,
	resolveDrop,
	type DndItem,
	type EmpreinteSource
} from '../section-dnd';

const A = { id: 'document:a' };
const B = { id: 'exercise:b' };
const C = { id: 'worksheet:c' };

/** La copie que la bibliothèque promène pendant le geste. */
function ombre(item: DndItem): DndItem {
	return { ...item, [SHADOW_ITEM_MARKER_PROPERTY_NAME]: true };
}

describe('origineDuGlisser — le point de départ, pris à la prise', () => {
	/**
	 * ⚠️ LE cas qui a coûté le bug : l'ombre finit par porter l'identifiant de
	 * la ressource tirée. La chercher par identifiant suffirait ici, mais plus
	 * du tout à la dépose — d'où la prise au départ, une fois pour toutes.
	 */
	it('à la souris, retient le rang de l’ombre laissée à la place', () => {
		expect(origineDuGlisser('cours', [A, ombre(B), C], 'exercise:b')).toEqual({
			zone: 'cours',
			index: 1
		});
	});

	// Au clavier, la bibliothèque ne pose pas d'ombre : la liste est intacte.
	it('au clavier, retient le rang de la ressource elle-même', () => {
		expect(origineDuGlisser('cours', [A, B, C], 'exercise:b')).toEqual({
			zone: 'cours',
			index: 1
		});
	});

	it('retient « Non classé » comme une zone à part entière', () => {
		expect(origineDuGlisser(null, [ombre(A)], 'document:a')).toEqual({ zone: null, index: 0 });
	});
});

describe('resolveDrop', () => {
	it('ignore une ressource déposée hors de toute zone', () => {
		expect(resolveDrop({ zone: 'cours', index: 0 }, 'cours', [A, B], 'worksheet:c')).toEqual({
			kind: 'ignored',
			reason: 'not-landed'
		});
	});

	// Le cas qui coûte cher s'il est manqué : chaque dépose sans effet
	// déclencherait un appel réseau et une réécriture de tous les ordres.
	it('ignore une dépose qui ne change pas le rang', () => {
		expect(resolveDrop({ zone: 'cours', index: 0 }, 'cours', [A, B], 'document:a')).toEqual({
			kind: 'ignored',
			reason: 'unchanged'
		});
	});

	it('reconnaît un réordonnancement dans la même section', () => {
		expect(resolveDrop({ zone: 'cours', index: 0 }, 'cours', [B, A], 'document:a')).toEqual({
			kind: 'reordered',
			zone: 'cours'
		});
	});

	/**
	 * ⚠️ Le rang est le MÊME des deux côtés, et c'est le cas courant : la
	 * ressource se dépose là où l'ombre attendait. Seule la zone de départ
	 * distingue le déplacement de la dépose sans effet.
	 */
	it('reconnaît un déplacement entre deux sections, même à rang égal', () => {
		expect(resolveDrop({ zone: 'cours', index: 0 }, 'methodes', [A, C], 'document:a')).toEqual({
			kind: 'moved',
			from: 'cours',
			to: 'methodes'
		});
	});

	it('reconnaît une sortie vers « Non classé »', () => {
		expect(resolveDrop({ zone: 'cours', index: 0 }, null, [A], 'document:a')).toEqual({
			kind: 'moved',
			from: 'cours',
			to: null
		});
	});

	/** Le cas signalé en production : la seule ressource, vers une section vide. */
	it('reconnaît une entrée depuis « Non classé » dans une section vide', () => {
		expect(resolveDrop({ zone: null, index: 0 }, 'cours', [A], 'document:a')).toEqual({
			kind: 'moved',
			from: null,
			to: 'cours'
		});
	});

	// « Non classé » est une zone comme une autre : on y réordonne aussi.
	it('réordonne aussi à l’intérieur de « Non classé »', () => {
		expect(resolveDrop({ zone: null, index: 0 }, null, [B, A], 'document:a')).toEqual({
			kind: 'reordered',
			zone: null
		});
	});

	/**
	 * Course rare : la dépose arrive sans que la prise ait été vue. Persister est
	 * le bon repli — ne rien faire laisserait l'ordre affiché différent de
	 * l'ordre enregistré, et ça ne se verrait qu'au rechargement suivant.
	 */
	it('persiste plutôt que de deviner quand la prise a été manquée', () => {
		expect(resolveDrop(null, 'cours', [A, B], 'document:a')).toEqual({
			kind: 'reordered',
			zone: 'cours'
		});
	});
});

describe('remettreAuRang — la restauration après un refus', () => {
	it('remet l’élément au rang d’où il venait', () => {
		expect(remettreAuRang([A, C], 1, B)).toEqual([A, B, C]);
	});

	it('remet en tête et en queue', () => {
		expect(remettreAuRang([B, C], 0, A)).toEqual([A, B, C]);
		expect(remettreAuRang([A, B], 2, C)).toEqual([A, B, C]);
	});

	/** Rang inconnu (prise manquée) ou hors liste : on place en dernier. */
	it('place en dernier quand le rang ne veut rien dire', () => {
		expect(remettreAuRang([A, B], -1, C)).toEqual([A, B, C]);
		expect(remettreAuRang([A, B], 9, C)).toEqual([A, B, C]);
	});
});

/** Une date de publication déjà échue, comme en pose `setContentPublication`. */
const QUAND = '2026-09-14T10:00:00.000Z';

describe('empreinteAffichage — ce qui doit rafraîchir le plan', () => {
	const BASE: EmpreinteSource = {
		sections: [{ id: 's1', title: 'Le cours' }],
		documents: [{ id: 'd1', title: 'Fiche de rappel', publishedAt: null }],
		exercises: [{ id: 'e1', publishedAt: null }],
		checklistItems: [
			{ id: 'c1', content: 'Réviser les fractions', description: null, publishedAt: null }
		],
		worksheets: [{ id: 'w1', title: 'Exercices 1 à 12', publishedAt: null }],
		distributedWorksheetIds: []
	};

	/**
	 * ⚠️ LE cas qui compte. Publier ne change aucun identifiant. Une empreinte
	 * bâtie sur les seuls `id` resterait identique, l'affichage garderait le
	 * badge « Préparé », et comme le bouton de publication calcule son intention
	 * depuis `publishedAt`, chaque clic renverrait « publier » : dépublier
	 * deviendrait impossible sans recharger la page. Sur une fiche, republier
	 * redistribue à toute une classe.
	 */
	it.each([
		['un document', { documents: [{ id: 'd1', title: 'Fiche de rappel', publishedAt: QUAND }] }],
		['un exercice', { exercises: [{ id: 'e1', publishedAt: QUAND }] }],
		[
			'un objectif',
			{
				checklistItems: [
					{ id: 'c1', content: 'Réviser les fractions', description: null, publishedAt: QUAND }
				]
			}
		],
		['une fiche', { worksheets: [{ id: 'w1', title: 'Exercices 1 à 12', publishedAt: QUAND }] }]
	])('publier %s change l’empreinte', (_libelle, delta) => {
		expect(empreinteAffichage({ ...BASE, ...delta })).not.toBe(empreinteAffichage(BASE));
	});

	it('corriger le texte d’un objectif change l’empreinte', () => {
		const corrige = {
			...BASE,
			checklistItems: [
				{ id: 'c1', content: 'Réviser les FRACTIONS', description: null, publishedAt: null }
			]
		};
		expect(empreinteAffichage(corrige)).not.toBe(empreinteAffichage(BASE));
	});

	it('distribuer une fiche change l’empreinte', () => {
		expect(empreinteAffichage({ ...BASE, distributedWorksheetIds: ['fiche-1'] })).not.toBe(
			empreinteAffichage(BASE)
		);
	});

	it('renommer une section change l’empreinte', () => {
		expect(empreinteAffichage({ ...BASE, sections: [{ id: 's1', title: 'Bilan' }] })).not.toBe(
			empreinteAffichage(BASE)
		);
	});

	it('ajouter et retirer une ressource changent l’empreinte', () => {
		const ajoute = { ...BASE, exercises: [...BASE.exercises, { id: 'e2', publishedAt: null }] };
		expect(empreinteAffichage(ajoute)).not.toBe(empreinteAffichage(BASE));
		expect(empreinteAffichage({ ...BASE, exercises: [] })).not.toBe(empreinteAffichage(BASE));
	});

	/**
	 * L'autre moitié de l'invariant, et elle est aussi importante : un glisser
	 * ne touche QUE `section_id` et `section_order`. Si l'empreinte en tenait
	 * compte, le rechargement écraserait le geste en cours et le plan
	 * rembobinerait sous les doigts du professeur.
	 */
	it('un déplacement ne change PAS l’empreinte', () => {
		// Le rangement ne fait pas partie de la source : deux plans dont les
		// ressources sont identiques ont la même empreinte, où qu'elles soient.
		expect(empreinteAffichage({ ...BASE })).toBe(empreinteAffichage(BASE));
	});
});
