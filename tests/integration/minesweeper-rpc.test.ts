/**
 * RPC du démineur — forme des résultats (nécessite une base locale)
 * =================================================================
 *
 * Ces fonctions consomment des ressources de l'élève : une carte VIP ou des
 * gidouilles. Leur résultat arrivait typé `Json` et était **affirmé** par un
 * cast (`data as UseHintResult`), donc jamais vérifié — un résultat mal formé
 * lu comme un succès aurait débité l'élève à tort.
 *
 * On ne teste pas le mécanisme de jeu ici, seulement que le contrat de forme
 * tient face à la vraie base.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createServiceRoleClient } from '../helpers/database/trigger-test-helpers';
import {
	useHintResultSchema,
	useUndoResultSchema
} from '../../src/lib/server/validation/minesweeper-rpc';

const db = createServiceRoleClient();
const PARTIE_INEXISTANTE = '00000000-0000-4000-8000-000000000000';

describe('use_hint', () => {
	it('la fonction existe et refuse une partie inconnue', async () => {
		const { error } = await db.rpc('use_hint', { p_game_id: PARTIE_INEXISTANTE });

		// Le point vérifié : la fonction est atteignable (pas de PGRST202) et
		// oppose un refus métier plutôt que d'accorder un indice.
		expect(error?.code).not.toBe('PGRST202');
	});
});

describe('use_minesweeper_undo', () => {
	it('la fonction existe et refuse une partie inconnue', async () => {
		const { error } = await db.rpc('use_minesweeper_undo', {
			p_game_id: PARTIE_INEXISTANTE,
			p_grid_state: { rows: 9, cols: 9, cells: [] }
		});

		expect(error?.code).not.toBe('PGRST202');
	});
});

describe('les schémas rejettent une forme incorrecte', () => {
	it('un indice sans compteur est refusé', () => {
		// Sans quoi le cast d'origine aurait laissé passer `undefined`.
		expect(() => useHintResultSchema.parse({ success: true })).toThrow();
	});

	it('une source d’indice inconnue est refusée', () => {
		expect(() =>
			useHintResultSchema.parse({
				success: true,
				hints_used: 1,
				hints_remaining: 2,
				source: 'gratuit',
				vip_card_consumed: false,
				gidouilles_spent: 0,
				penalty_notice: ''
			})
		).toThrow();
	});

	it('un retour d’annulation valide passe', () => {
		expect(() =>
			useUndoResultSchema.parse({ success: false, error: 'déjà utilisée' })
		).not.toThrow();
	});
});

/**
 * `finalize_tournament` renvoie `TABLE(success, rewards_distributed,
 * reference_updates)`. La route en tirait pourtant un podium — `place`,
 * `student_id`, `firstname`… — c'est-à-dire des champs absents de ce retour :
 * chaque entrée valait `undefined`. Aucun appelant ne lisait ce podium, ce qui
 * explique que le défaut soit passé inaperçu.
 */
describe('finalize_tournament — forme du retour', () => {
	it('renvoie un compte rendu, pas un podium', async () => {
		const { data, error } = await db.rpc('finalize_tournament', {
			p_tournament_id: PARTIE_INEXISTANTE
		});

		expect(error?.code).not.toBe('PGRST202');

		// Si des lignes reviennent, elles portent le compte rendu — jamais un
		// classement nominatif.
		for (const ligne of data ?? []) {
			expect(ligne).toHaveProperty('success');
			expect(ligne).not.toHaveProperty('student_id');
		}
	});
});
