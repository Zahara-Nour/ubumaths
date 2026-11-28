/**
 * POST /api/messages/send — l'envoi d'un message privé.
 *
 * Avant (écart V130) : la page d'écriture envoie le document de l'éditeur riche
 * (un objet), la validation attendait une chaîne : 400 à chaque envoi, pour tout
 * le monde. Le corps envoyé ici est EXACTEMENT celui de la page
 * (`messages/compose/+page.svelte`, par `privateMessages.sendMessage`).
 */
import { describe, it, expect, vi } from 'vitest';
import { POST } from '../+server';

const USER = '11111111-1111-4111-8111-111111111111';
const TEACHER = '22222222-2222-4222-8222-222222222222';
const MESSAGE = '33333333-3333-4333-8333-333333333333';

vi.mock('#lib/server/middleware/auth.ts', () => ({
	requireAuth: vi.fn(async () => ({ user: { id: USER }, profile: { id: USER } }))
}));
vi.mock('#lib/server/middleware/consent.ts', () => ({ requireConsent: vi.fn() }));

/** Le document que rend l'éditeur riche pour un paragraphe de texte. */
function doc(text: string) {
	return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

/** Le corps que la page envoie pour un message à une personne. */
function pageBody(content: unknown) {
	return { recipientIds: [TEACHER], subject: 'Question', content, isGroupMessage: false };
}

type RpcResult = { data: string | null; error: { message: string; code?: string } | null };

function call(body: unknown, result: RpcResult = { data: MESSAGE, error: null }) {
	const rpcSpy = vi.fn(async (_name: string, _args: Record<string, unknown>) => result);
	const promise = POST({
		request: new Request('http://localhost/api/messages/send', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { supabase: { rpc: rpcSpy } }
	} as never);
	return { promise, rpcSpy };
}

/** Le statut et le message d'une erreur levée par `error()` de SvelteKit. */
async function refusal(promise: Response | Promise<Response>) {
	try {
		const response = await promise;
		return { status: response.status, message: '' };
	} catch (err) {
		if (
			err &&
			typeof err === 'object' &&
			'status' in err &&
			typeof err.status === 'number' &&
			'body' in err
		) {
			const body = err.body as { message?: string };
			return { status: err.status, message: body.message ?? '' };
		}
		throw err;
	}
}

/** Un document de `depth` listes emboîtées autour d'un texte. */
function nested(depth: number): unknown {
	let node: unknown = { type: 'text', text: 'au fond' };
	for (let i = 0; i < depth; i++) node = { type: 'bulletList', content: [node] };
	return { type: 'doc', content: [node] };
}

describe('POST /api/messages/send', () => {
	it('envoie le document de l’éditeur tel que la page le donne', async () => {
		const { promise, rpcSpy } = call(pageBody(doc('Bonjour')));

		const response = await promise;

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true, messageId: MESSAGE });
		expect(rpcSpy).toHaveBeenCalledWith(
			'send_private_message',
			expect.objectContaining({
				p_sender_id: USER,
				p_recipient_ids: [TEACHER],
				p_subject: 'Question',
				p_content: doc('Bonjour')
			})
		);
	});

	it('accepte un message fait d’une seule formule (aucun texte)', async () => {
		const formula = {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'mathInline', attrs: { latex: 'x^2' } }] }]
		};

		expect((await call(pageBody(formula)).promise).status).toBe(200);
	});

	it('accepte 10 000 caractères, refuse 10 001', async () => {
		expect((await call(pageBody(doc('a'.repeat(10_000)))).promise).status).toBe(200);

		const { promise, rpcSpy } = call(pageBody(doc('a'.repeat(10_001))));
		expect(await refusal(promise)).toEqual({
			status: 400,
			message: 'Message trop long (10 000 caractères au plus)'
		});
		expect(rpcSpy).not.toHaveBeenCalled();
	});

	it.each([
		['une chaîne', 'Bonjour'],
		['un objet quelconque', { texte: 'Bonjour' }],
		['un tableau', [doc('Bonjour')]],
		['un document sans liste de blocs', { type: 'doc' }],
		['un bloc sans type', { type: 'doc', content: [{ content: [] }] }],
		['rien', null]
	])('refuse %s à la place du document', async (_label, content) => {
		const { promise, rpcSpy } = call(pageBody(content));

		expect(await refusal(promise)).toEqual({ status: 400, message: 'Message illisible' });
		expect(rpcSpy).not.toHaveBeenCalled();
	});

	it.each([
		['sans bloc', { type: 'doc', content: [] }],
		['fait d’un paragraphe vide', { type: 'doc', content: [{ type: 'paragraph' }] }],
		['fait d’un bloc de code vide', { type: 'doc', content: [{ type: 'codeBlock' }] }],
		['fait d’espaces', doc('   ')]
	])('refuse un message vide (%s)', async (_label, content) => {
		const { promise, rpcSpy } = call(pageBody(content));

		expect(await refusal(promise)).toEqual({ status: 400, message: 'Le message est vide' });
		expect(rpcSpy).not.toHaveBeenCalled();
	});

	it('refuse un document trop profond', async () => {
		expect((await call(pageBody(nested(10))).promise).status).toBe(200);

		const { promise, rpcSpy } = call(pageBody(nested(40)));
		expect(await refusal(promise)).toEqual({ status: 400, message: 'Message illisible' });
		expect(rpcSpy).not.toHaveBeenCalled();
	});

	it('refuse un document trop lourd, même avec peu de texte', async () => {
		const heavy = {
			type: 'doc',
			content: Array.from({ length: 3000 }, () => ({
				type: 'paragraph',
				attrs: { textAlign: 'left' },
				content: [{ type: 'text', text: 'a' }]
			}))
		};
		const { promise, rpcSpy } = call(pageBody(heavy));

		expect(await refusal(promise)).toEqual({
			status: 400,
			message: 'Message trop lourd : allégez la mise en forme ou retirez une image'
		});
		expect(rpcSpy).not.toHaveBeenCalled();
	});

	// Écarts V132 et V133 : les refus de la base arrivaient à l'élève en anglais, en 500
	describe('refus de la base : en français, jamais le message technique', () => {
		const CLASS = '55555555-5555-4555-8555-555555555555';

		it('destinataire non permis : 403', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const { promise } = call(pageBody(doc('Bonjour')), {
				data: null,
				error: {
					message: 'You do not have permission to send messages to one or more recipients'
				}
			});
			expect(await refusal(promise)).toEqual({
				status: 403,
				message: 'Vous ne pouvez pas écrire à ce destinataire.'
			});
		});

		it('envoi au nom d’un autre (42501) : 403', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const { promise } = call(pageBody(doc('Bonjour')), {
				data: null,
				error: { message: 'unauthorized: sender mismatch', code: '42501' }
			});
			expect((await refusal(promise)).status).toBe(403);
		});

		it('réponse à un message ni envoyé ni reçu (L127, L131) : 403, dit pourquoi', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const { promise } = call(pageBody(doc('Bonjour')), {
				data: null,
				error: { message: 'unauthorized: parent message not sent or received', code: '42501' }
			});
			expect(await refusal(promise)).toEqual({
				status: 403,
				message: 'Vous ne pouvez pas répondre à ce message.'
			});
		});

		it('classe sans élève actif (P0002) : 400, dit pourquoi', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const { promise, rpcSpy } = call(
				{ subject: 'Contrôle', content: doc('Lundi'), isGroupMessage: true, classId: CLASS },
				{ data: null, error: { message: 'no active student in this class', code: 'P0002' } }
			);
			const refus = await refusal(promise);
			expect(refus.status).toBe(400);
			expect(refus.message).toContain('aucun');
			expect(rpcSpy).toHaveBeenCalledWith(
				'send_private_message',
				expect.objectContaining({
					p_is_group_message: true,
					p_class_id: CLASS,
					p_recipient_ids: []
				})
			);
		});

		it('autre erreur : 500, sans le message de la base', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => {});
			const { promise } = call(pageBody(doc('Bonjour')), {
				data: null,
				error: { message: 'null value in column "sender_name"', code: '23502' }
			});
			expect(await refusal(promise)).toEqual({
				status: 500,
				message: "Erreur lors de l'envoi du message"
			});
		});
	});
});
