/**
 * Notifications système : toujours écrites par le client service
 * ===============================================================
 *
 * La base refuse les notifications système aux comptes connectés (migration
 * 20261001140000). Ces tests prouvent que le code serveur les écrit avec le client
 * service, et que `is_system` / `created_by` ne peuvent pas être choisis par
 * l'appelant.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMock = vi.fn();
const serviceFrom = vi.fn(() => ({ insert: insertMock }));

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ from: serviceFrom })
}));

import { insertSystemNotification, createSystemNotification } from '../notifications';
import { createMarketplaceNotification } from '../marketplace/helpers';
import { notifyTradeCompleted } from '../marketplace/notifications';

beforeEach(() => {
	insertMock.mockReset().mockResolvedValue({ error: null });
	serviceFrom.mockClear();
});

function ligneInseree(): Record<string, unknown> {
	expect(serviceFrom).toHaveBeenCalledWith('notifications');
	expect(insertMock).toHaveBeenCalledTimes(1);
	return insertMock.mock.calls[0][0] as Record<string, unknown>;
}

describe('insertSystemNotification', () => {
	it('impose is_system = true et created_by = null, quoi que passe l’appelant', async () => {
		await insertSystemNotification({
			title: 'T',
			message: 'M',
			type: 'info',
			target_type: 'users',
			target_user_ids: ['u1'],
			system_event_type: 'badge_unlocked',
			// Un appelant qui tenterait de forcer ces champs (hors du type) :
			...({ is_system: false, created_by: 'intrus' } as object)
		});
		const ligne = ligneInseree();
		expect(ligne.is_system).toBe(true);
		expect(ligne.created_by).toBeNull();
		expect(ligne.target_user_ids).toEqual(['u1']);
	});

	it("rend l'erreur de la base", async () => {
		insertMock.mockResolvedValue({ error: { message: 'refus' } });
		const { error } = await insertSystemNotification({
			title: 'T',
			message: 'M',
			type: 'info',
			target_type: 'users',
			system_event_type: 'badge_unlocked'
		});
		expect(error).toEqual({ message: 'refus' });
	});
});

describe('les créateurs de notifications système passent par le client service', () => {
	it('createSystemNotification', async () => {
		const res = await createSystemNotification({
			title: 'Compte approuvé',
			message: '<p>Bienvenue</p>',
			type: 'info',
			priority: 'important',
			system_event_type: 'user_approved',
			target_type: 'users',
			target_user_ids: ['u1']
		});
		expect(res.success).toBe(true);
		expect(ligneInseree()).toMatchObject({
			is_system: true,
			created_by: null,
			system_event_type: 'user_approved',
			target_user_ids: ['u1']
		});
	});

	it('createMarketplaceNotification', async () => {
		await createMarketplaceNotification('u2', 'trade_offer', {});
		expect(ligneInseree()).toMatchObject({
			is_system: true,
			created_by: null,
			system_event_type: 'marketplace_trade_offer',
			target_user_ids: ['u2']
		});
	});

	it('notifyTradeCompleted, avec une priorité acceptée par la base', async () => {
		await notifyTradeCompleted('u3', 'Alice', 't1');
		// notifications_priority_check : 'normal' | 'important' | 'urgent' ('high' était refusé)
		expect(ligneInseree()).toMatchObject({
			is_system: true,
			created_by: null,
			priority: 'important',
			target_user_ids: ['u3']
		});
	});
});
