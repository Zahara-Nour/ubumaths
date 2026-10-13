/**
 * POST /api/errors/log — route ouverte aux visiteurs sans compte
 *
 * Une erreur « critical » déclenche une notification urgente aux admins. Un
 * visiteur anonyme pouvait donc en envoyer 20 par minute. Sans session, la
 * gravité est ramenée à « error » : l'erreur est gardée, l'alerte ne part pas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const logErrorMock = vi.fn();

vi.mock('$lib/server/errorMonitoring', () => ({
	logError: (...args: unknown[]) => logErrorMock(...args),
	getUserContext: async () => ({ user_id: 'u1', user_role: 'student' })
}));
vi.mock('$lib/server/middleware/rateLimit', () => ({ rateLimit: () => undefined }));

import { POST } from '../+server';
import { logErrorSchema } from '$lib/server/validation/errors';

type PostEvent = Parameters<typeof POST>[0];

function event(
	body: unknown,
	user: { id: string } | null,
	status: 'approved' | 'pending' | null = user ? 'approved' : null
): PostEvent {
	return {
		request: new Request('http://localhost/api/errors/log', {
			method: 'POST',
			body: JSON.stringify(body)
		}),
		locals: {
			supabase: {},
			safeGetSession: async () => ({ user }),
			profile: status ? { id: user?.id, status } : null
		},
		getClientAddress: () => '127.0.0.1'
	} as unknown as PostEvent;
}

const CRITICAL = {
	error_type: 'client_js',
	severity: 'critical',
	message: 'Gel de la page',
	url: '/automaths'
};

/** Gravité transmise à logError au dernier appel. */
const loggedSeverity = () =>
	(logErrorMock.mock.calls.at(-1)?.[1] as { severity: string } | undefined)?.severity;

describe('POST /api/errors/log', () => {
	beforeEach(() => {
		logErrorMock.mockReset();
		logErrorMock.mockResolvedValue({ success: true, id: 'e1' });
	});

	it('ramène « critical » à « error » pour un visiteur sans compte', async () => {
		const response = await POST(event(CRITICAL, null));

		expect(response.status).toBe(200);
		expect(loggedSeverity()).toBe('error');
	});

	it('ramène « critical » à « error » pour un compte en attente d’approbation', async () => {
		await POST(event(CRITICAL, { id: 'u2' }, 'pending'));

		expect(loggedSeverity()).toBe('error');
	});

	it('garde « critical » pour un compte approuvé', async () => {
		await POST(event(CRITICAL, { id: 'u1' }));

		expect(loggedSeverity()).toBe('critical');
	});
});

describe('logErrorSchema — taille du contexte', () => {
	it('refuse un contexte de plus de 10 000 caractères', () => {
		const result = logErrorSchema.safeParse({ ...CRITICAL, context: { blob: 'x'.repeat(10_001) } });
		expect(result.success).toBe(false);
	});

	it('accepte un contexte ordinaire', () => {
		const result = logErrorSchema.safeParse({ ...CRITICAL, context: { drift: 1200 } });
		expect(result.success).toBe(true);
	});
});
