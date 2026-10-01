/**
 * POST /api/bug-reports — limite de fréquence
 *
 * Chaque signalement notifie les admins : au-delà de 10 par heure et par compte,
 * la route répond 429 avant tout travail.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: vi.fn().mockResolvedValue({
		user: { id: 'eleve-rate-limit' },
		profile: { id: 'eleve-rate-limit', role: 'student' }
	})
}));
vi.mock('$lib/server/notifications', () => ({
	notifyAdminsOfNewBugReport: vi.fn()
}));

import { POST } from '../+server';

type PostEvent = Parameters<typeof POST>[0];

function evenement(): PostEvent {
	return {
		locals: { supabase: {} },
		// Corps invalide : la route répond 400 APRÈS la limite, sans toucher la base.
		request: new Request('http://localhost/api/bug-reports', {
			method: 'POST',
			body: JSON.stringify({})
		})
	} as unknown as PostEvent;
}

async function statut(): Promise<number> {
	try {
		const res = await POST(evenement());
		return (res as Response).status;
	} catch (e) {
		return (e as { status: number }).status;
	}
}

describe('POST /api/bug-reports — limite de fréquence', () => {
	it('10 signalements passent la limite, le 11e reçoit 429', async () => {
		const statuts: number[] = [];
		for (let i = 0; i < 11; i++) statuts.push(await statut());
		expect(statuts.slice(0, 10).every((s) => s === 400)).toBe(true);
		expect(statuts[10]).toBe(429);
	});
});
