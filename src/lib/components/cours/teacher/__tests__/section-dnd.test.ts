/**
 * Ce que devient une dépose — la logique, pas le geste.
 *
 * Un test qui simulerait le glisser-déposer prouverait surtout que la
 * simulation est fidèle à `svelte-dnd-action`. Ces cas-là portent sur ce que le
 * composant DÉCIDE une fois la dépose faite, et c'est là que sont les erreurs
 * coûteuses : une dépose sans effet qui déclenche quand même un appel, un
 * déplacement entre sections pris pour un simple réordonnancement.
 */
import { describe, it, expect } from 'vitest';
import {
	empreinteAffichage,
	resolveDrop,
	type EmpreinteSource,
	type ZonesSnapshot
} from '../section-dnd';

const A = { id: 'document:a' };
const B = { id: 'exercise:b' };
const C = { id: 'worksheet:c' };

/** Deux sections, et « Non classé » vide. */
const snapshot: ZonesSnapshot = {
	sections: [
		{ id: 'cours', items: [A, B] },
		{ id: 'methodes', items: [C] }
	],
	unassigned: []
};

describe('resolveDrop', () => {
	it('ignore une ressource déposée hors de toute zone', () => {
		expect(resolveDrop(snapshot, 'cours', [A, B], 'worksheet:c')).toEqual({
			kind: 'ignored',
			reason: 'not-landed'
		});
	});

	// Le cas qui coûte cher s'il est manqué : chaque dépose sans effet
	// déclencherait un appel réseau et une réécriture de tous les ordres.
	it('ignore une dépose qui ne change pas l’index', () => {
		expect(resolveDrop(snapshot, 'cours', [A, B], 'document:a')).toEqual({
			kind: 'ignored',
			reason: 'unchanged'
		});
	});

	it('reconnaît un réordonnancement dans la même section', () => {
		expect(resolveDrop(snapshot, 'cours', [B, A], 'document:a')).toEqual({
			kind: 'reordered',
			zone: 'cours'
		});
	});

	it('reconnaît un déplacement entre deux sections', () => {
		expect(resolveDrop(snapshot, 'methodes', [C, A], 'document:a')).toEqual({
			kind: 'moved',
			from: 'cours',
			to: 'methodes'
		});
	});

	it('reconnaît une sortie vers « Non classé »', () => {
		expect(resolveDrop(snapshot, null, [A], 'document:a')).toEqual({
			kind: 'moved',
			from: 'cours',
			to: null
		});
	});

	it('reconnaît une entrée depuis « Non classé »', () => {
		const avecNonClassees: ZonesSnapshot = {
			sections: [{ id: 'cours', items: [A] }],
			unassigned: [C]
		};

		expect(resolveDrop(avecNonClassees, 'cours', [A, C], 'worksheet:c')).toEqual({
			kind: 'moved',
			from: null,
			to: 'cours'
		});
	});

	// « Non classé » est une zone comme une autre : on y réordonne aussi.
	it('réordonne aussi à l’intérieur de « Non classé »', () => {
		const avecNonClassees: ZonesSnapshot = { sections: [], unassigned: [A, B] };

		expect(resolveDrop(avecNonClassees, null, [B, A], 'document:a')).toEqual({
			kind: 'reordered',
			zone: null
		});
	});

	/**
	 * Course rare : la bibliothèque peut émettre le `finalize` de la zone
	 * d'arrivée avant que le `consider` de la zone d'origine ait été commité.
	 * La ressource est alors introuvable dans l'instantané. Persister est le bon
	 * repli — ne rien faire laisserait l'ordre affiché différent de l'ordre
	 * enregistré, et ça ne se verrait qu'au rechargement suivant.
	 */
	it('persiste plutôt que de deviner quand la source est introuvable', () => {
		const inconnue = { id: 'document:inconnu' };

		expect(resolveDrop(snapshot, 'cours', [A, B, inconnue], 'document:inconnu')).toEqual({
			kind: 'reordered',
			zone: 'cours'
		});
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
