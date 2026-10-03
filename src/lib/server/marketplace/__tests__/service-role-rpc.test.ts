/**
 * Verrous et traduction d'instances passent par le client service
 * ===============================================================
 *
 * `lock_cards`, `unlock_cards`, `unlock_specific_cards` et `resolve_card_instances` sont réservées au
 * serveur (migration 20261003150000, Q131 et Q134) : un client utilisateur
 * reçoit 42501. Ces helpers doivent donc appeler le client service — et rien
 * d'autre, puisqu'ils ne reçoivent plus de client en paramètre.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ rpc })
}));

import {
	lockCardsForEntity,
	unlockCardsForEntity,
	unlockSpecificCardsForEntity,
	resolveCardInstances
} from '../helpers';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const ENTITY = '22222222-2222-4222-8222-222222222222';

describe('helpers du marché : RPC réservées au serveur', () => {
	beforeEach(() => {
		rpc.mockReset();
	});

	it('lockCardsForEntity appelle lock_cards par le client service', async () => {
		rpc.mockResolvedValue({ data: true, error: null });
		const result = await lockCardsForEntity(STUDENT, ['inst-1'], ENTITY, 'listing');
		expect(result).toEqual({ success: true });
		expect(rpc).toHaveBeenCalledWith('lock_cards', {
			p_student_id: STUDENT,
			p_card_ids: ['inst-1'],
			p_entity_id: ENTITY,
			p_lock_type: 'listing'
		});
	});

	it('lockCardsForEntity rapporte l’erreur de la RPC', async () => {
		rpc.mockResolvedValue({ data: null, error: { message: 'Card inst-1 is already locked' } });
		const result = await lockCardsForEntity(STUDENT, ['inst-1'], ENTITY, 'trade');
		expect(result).toEqual({ success: false, error: 'Card inst-1 is already locked' });
	});

	it('lockCardsForEntity sans carte n’appelle rien', async () => {
		expect(await lockCardsForEntity(STUDENT, [], ENTITY, 'listing')).toEqual({ success: true });
		expect(rpc).not.toHaveBeenCalled();
	});

	it('unlockCardsForEntity appelle unlock_cards par le client service', async () => {
		rpc.mockResolvedValue({ data: 2, error: null });
		expect(await unlockCardsForEntity(ENTITY)).toBe(true);
		expect(rpc).toHaveBeenCalledWith('unlock_cards', { p_entity_id: ENTITY });
	});

	it('unlockSpecificCardsForEntity appelle unlock_specific_cards par le client service', async () => {
		rpc.mockResolvedValue({ data: { success: true, unlocked_count: 1 }, error: null });
		const { data, error } = await unlockSpecificCardsForEntity(ENTITY, ['inst-1']);
		expect(error).toBeNull();
		expect(data).toEqual({ success: true, unlocked_count: 1 });
		expect(rpc).toHaveBeenCalledWith('unlock_specific_cards', {
			p_entity_id: ENTITY,
			p_card_ids: ['inst-1']
		});
	});

	it('resolveCardInstances appelle resolve_card_instances par le client service', async () => {
		const lignes = [{ instance_id: 'inst-1', card_id: 'soldes' }];
		rpc.mockResolvedValue({ data: lignes, error: null });
		const { data, error } = await resolveCardInstances(['inst-1']);
		expect(error).toBeNull();
		expect(data).toEqual(lignes);
		expect(rpc).toHaveBeenCalledWith('resolve_card_instances', { p_instance_ids: ['inst-1'] });
	});

	it('resolveCardInstances sans instance n’appelle rien', async () => {
		const { data, error } = await resolveCardInstances([]);
		expect(error).toBeNull();
		expect(data).toEqual([]);
		expect(rpc).not.toHaveBeenCalled();
	});
});
