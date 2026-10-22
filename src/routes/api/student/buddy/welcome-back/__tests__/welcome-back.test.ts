/**
 * POST /api/student/buddy/welcome-back — le retour fêté est effacé, pour l'élève
 * de la session seulement (docs/systeme/buddy-palotins.md).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn() }));
vi.mock('$lib/server/buddy-queries', () => ({ acknowledgeWelcomeBack: vi.fn() }));
vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })
}));

import { requireRole } from '$lib/server/middleware/auth';
import { acknowledgeWelcomeBack } from '$lib/server/buddy-queries';
import { POST } from '../+server';

const locals = { supabase: {} } as unknown as App.Locals;

function call() {
	return POST({ locals } as unknown as Parameters<typeof POST>[0]);
}

beforeEach(() => {
	vi.mocked(requireRole).mockReset();
	vi.mocked(acknowledgeWelcomeBack).mockReset();
	vi.mocked(requireRole).mockResolvedValue({
		user: { id: 'eleve-1' },
		profile: { id: 'eleve-1', role: 'student' }
	} as never);
});

describe('POST /api/student/buddy/welcome-back', () => {
	it('exige un élève', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403, body: { message: 'Interdit' } });
		await expect(call()).rejects.toMatchObject({ status: 403 });
		expect(requireRole).toHaveBeenCalledWith(locals, 'student');
		expect(acknowledgeWelcomeBack).not.toHaveBeenCalled();
	});

	it('efface le retour de l’élève de la session', async () => {
		vi.mocked(acknowledgeWelcomeBack).mockResolvedValue(true);
		const response = await call();
		expect(acknowledgeWelcomeBack).toHaveBeenCalledWith('eleve-1');
		expect(await response.json()).toEqual({ acknowledged: true });
	});

	it('rien à fêter : acknowledged faux', async () => {
		vi.mocked(acknowledgeWelcomeBack).mockResolvedValue(false);
		expect(await (await call()).json()).toEqual({ acknowledged: false });
	});

	it('écriture en échec : 500', async () => {
		vi.mocked(acknowledgeWelcomeBack).mockRejectedValue(new Error('panne'));
		await expect(call()).rejects.toMatchObject({ status: 500 });
	});
});
