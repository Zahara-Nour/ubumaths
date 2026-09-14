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
import { resolveDrop, type ZonesSnapshot } from '../section-dnd';

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
		const inconnue = { id: 'quizQuestion:z' };

		expect(resolveDrop(snapshot, 'cours', [A, B, inconnue], 'quizQuestion:z')).toEqual({
			kind: 'reordered',
			zone: 'cours'
		});
	});
});
