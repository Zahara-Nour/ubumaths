/**
 * Routes des pièces jointes de la messagerie : entrées validées, statuts transmis.
 * L'accès réel (RLS, stockage) est prouvé par
 * tests/integration/messagerie-pieces-jointes-liens.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../[id]/attachments/+server';
import { GET } from '../attachments/[attachmentId]/+server';
import {
	createAttachmentUploadUrl,
	getAttachmentDownloadUrl
} from '$lib/server/message-attachments';
import { requireAuth } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { error } from '@sveltejs/kit';

vi.mock('$lib/server/middleware/auth', () => ({ requireAuth: vi.fn() }));
vi.mock('$lib/server/middleware/consent', () => ({ requireConsent: vi.fn() }));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('$lib/server/message-attachments', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/server/message-attachments')>();
	return {
		...original,
		createAttachmentUploadUrl: vi.fn(),
		getAttachmentDownloadUrl: vi.fn()
	};
});

const MESSAGE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const SCAN = { file_name: 'cahier.pdf', file_type: 'application/pdf', file_size: 1000 };

function post(body: unknown, id = MESSAGE_ID) {
	return POST({
		params: { id },
		request: new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) }),
		locals: { supabase: {} }
	} as never);
}

function get(attachmentId = MESSAGE_ID) {
	return GET({ params: { attachmentId }, locals: { supabase: {} } } as never);
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(requireAuth).mockResolvedValue({
		user: { id: USER_ID },
		profile: { id: USER_ID, role: 'student' }
	} as never);
	vi.mocked(requireConsent).mockImplementation(() => {});
});

describe('POST /api/messages/[id]/attachments', () => {
	it('rend le chemin et le jeton du lien d’envoi', async () => {
		vi.mocked(createAttachmentUploadUrl).mockResolvedValue({
			ok: true,
			path: `messages/${MESSAGE_ID}/x-cahier.pdf`,
			token: 'jeton'
		});

		const response = await post(SCAN);

		expect(await response.json()).toEqual({
			path: `messages/${MESSAGE_ID}/x-cahier.pdf`,
			token: 'jeton'
		});
		expect(createAttachmentUploadUrl).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			USER_ID,
			MESSAGE_ID,
			SCAN
		);
	});

	it.each([
		['un type refusé', { ...SCAN, file_type: 'text/html' }],
		['plus de 10 Mo', { ...SCAN, file_size: 10 * 1024 * 1024 + 1 }],
		['un fichier vide', { ...SCAN, file_size: 0 }],
		['un corps illisible', 'pas du json']
	])('400 pour %s, sans lien', async (_cas, body) => {
		await expect(post(body)).rejects.toMatchObject({ status: 400 });
		expect(createAttachmentUploadUrl).not.toHaveBeenCalled();
	});

	// Audit de #1256 : joindre un fichier, c'est envoyer ; même consentement que l'envoi.
	it('sans consentement d’envoi : 403, sans lien', async () => {
		vi.mocked(requireConsent).mockImplementation(() => {
			throw error(403, 'Consentement parental requis');
		});

		await expect(post(SCAN)).rejects.toMatchObject({ status: 403 });
		expect(requireConsent).toHaveBeenCalledWith(expect.anything(), 'send_message');
		expect(createAttachmentUploadUrl).not.toHaveBeenCalled();
	});

	it('400 pour un identifiant de message invalide', async () => {
		await expect(post(SCAN, 'pas-un-uuid')).rejects.toMatchObject({ status: 400 });
	});

	it('transmet le refus (message d’un autre : 403 ; 4ᵉ pièce jointe : 409)', async () => {
		for (const status of [403, 409] as const) {
			vi.mocked(createAttachmentUploadUrl).mockResolvedValue({ ok: false, status, message: 'non' });
			await expect(post(SCAN)).rejects.toMatchObject({ status });
		}
	});
});

describe('GET /api/messages/attachments/[attachmentId]', () => {
	it('redirige vers le lien signé, jamais mis en cache (il porte un jeton d’une heure)', async () => {
		vi.mocked(getAttachmentDownloadUrl).mockResolvedValue('https://stockage/lien-signe');

		const response = await get();

		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('https://stockage/lien-signe');
		expect(response.headers.get('cache-control')).toContain('no-store');
	});

	it('404 quand la RLS ne rend pas la pièce jointe', async () => {
		vi.mocked(getAttachmentDownloadUrl).mockResolvedValue(null);

		await expect(get()).rejects.toMatchObject({ status: 404 });
	});

	it('500 quand la lecture ou la signature échoue', async () => {
		vi.mocked(getAttachmentDownloadUrl).mockRejectedValue(new Error('panne'));

		await expect(get()).rejects.toMatchObject({ status: 500 });
	});

	it('400 pour un identifiant invalide', async () => {
		await expect(get('pas-un-uuid')).rejects.toMatchObject({ status: 400 });
	});
});
