/**
 * Ce qu'un glisser de cellule écrit dans le notebook
 * ===================================================
 *
 * Les cellules réordonnées vont DIRECTEMENT dans `notebook.content.cells`, que
 * l'autosave sérialise tel quel, sur un débounce de 2 s. Tout ce que le geste y
 * met peut donc partir en base — y compris à un moment où le geste n'est pas
 * fini.
 *
 * ⚠️ D'où le cas qui compte : la copie « ombre » de `svelte-dnd-action` porte un
 * identifiant sentinelle, et il passe la validation du serveur (les
 * identifiants de cellule y sont des chaînes opaques). Rien ne l'arrêterait.
 */
import { describe, expect, it } from 'vitest';
import { SHADOW_ITEM_MARKER_PROPERTY_NAME, SHADOW_PLACEHOLDER_ITEM_ID } from 'svelte-dnd-action';
import { cellulesApresGeste, estOmbre } from '../notebook-dnd';

const A = { id: 'cell-1700000000000-aaa', source: 'print(1)' };
const B = { id: 'cell-1700000000001-bbb', source: 'print(2)' };

/** L'ombre, telle que la bibliothèque la fabrique : la cellule, sauf son id. */
function ombreDe(cellule: { id: string; source: string }) {
	return {
		...cellule,
		[SHADOW_ITEM_MARKER_PROPERTY_NAME]: true,
		id: SHADOW_PLACEHOLDER_ITEM_ID
	};
}

describe('cellulesApresGeste', () => {
	/**
	 * ⚠️ LE cas. Sans ça, un autosave qui tombe pendant le glisser enregistre
	 * « id:dnd-shadow-placeholder-0000 » comme identifiant de cellule, et le
	 * vrai est perdu — avec tout ce qui s'y accroche.
	 */
	it('rend son identifiant à la cellule tirée', () => {
		const rendu = cellulesApresGeste([ombreDe(A), B], A.id);

		expect(rendu.map((c) => c.id)).toEqual([A.id, B.id]);
		expect(rendu.some((c) => c.id === SHADOW_PLACEHOLDER_ITEM_ID)).toBe(false);
	});

	it('garde le contenu de la cellule tirée', () => {
		const [tiree] = cellulesApresGeste([ombreDe(A), B], A.id);

		expect(tiree).toMatchObject({ id: A.id, source: 'print(1)' });
	});

	/** L'ombre remplace la cellule, elle ne s'ajoute pas : jamais de doublon. */
	it('ne crée pas de doublon d’identifiant', () => {
		const ids = cellulesApresGeste([B, ombreDe(A)], A.id).map((c) => c.id);

		expect(new Set(ids).size).toBe(ids.length);
	});

	it('respecte l’ordre rendu par la bibliothèque', () => {
		expect(cellulesApresGeste([B, ombreDe(A)], A.id).map((c) => c.id)).toEqual([B.id, A.id]);
	});

	/** Hors geste — à la dépose, notamment — il n'y a rien à corriger. */
	it('ne touche à rien sans ombre', () => {
		const cellules = [A, B];

		expect(cellulesApresGeste(cellules, A.id)).toEqual(cellules);
	});
});

describe('estOmbre', () => {
	it('reconnaît l’ombre au marqueur, pas à l’identifiant', () => {
		// ⚠️ La bibliothèque finit par rendre son vrai identifiant à l'ombre :
		// la reconnaître par l'identifiant sentinelle ne tiendrait pas.
		expect(estOmbre({ ...ombreDe(A), id: A.id })).toBe(true);
		expect(estOmbre(A)).toBe(false);
	});
});
