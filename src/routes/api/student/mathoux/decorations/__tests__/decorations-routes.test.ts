/**
 * POST /api/student/mathoux/decorations/buy, /wear et /wear-collar — achat et
 * pose des décorations de panse et des colliers (lots B et C des accessoires,
 * décisions de David du 2026-10-24 et du 2026-10-25).
 *
 * La base tient les règles (prouvé en intégration :
 * tests/integration/mathoux-decorations.test.ts, mathoux-colliers.test.ts). Ici : élève de la session
 * seulement, consentement pour l'achat, entrée validée, refus de la base
 * traduits pour l'élève, réponse inattendue = panne (jamais un faux succès).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRole: vi.fn() }));
vi.mock('$lib/server/middleware/consent', () => ({ requireConsent: vi.fn() }));
vi.mock('$lib/server/middleware/rateLimit', () => ({ rateLimit: vi.fn() }));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: vi.fn() }));

import { requireRole } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { rateLimit } from '$lib/server/middleware/rateLimit';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { POST as buy } from '../buy/+server';
import { POST as wear } from '../wear/+server';
import { POST as wearCollar } from '../wear-collar/+server';

// Constantes
const NOTION = '7b0f6a52-3c1e-4d5f-9a8b-2c3d4e5f6a7b';
const PROFILE = { id: 'eleve-1', role: 'student', grade: '1_SPE' };
const rpc = vi.fn();

// Functions
function request(body: unknown): Request {
	return new Request('http://localhost/api', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

function event(body: unknown) {
	return { request: request(body), locals: {} } as never;
}

beforeEach(() => {
	vi.mocked(requireRole).mockReset();
	vi.mocked(requireConsent).mockReset();
	vi.mocked(rateLimit).mockReset();
	rpc.mockReset();
	vi.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never);
	vi.mocked(requireRole).mockResolvedValue({ user: { id: 'eleve-1' }, profile: PROFILE } as never);
});

describe('POST /api/student/mathoux/decorations/buy', () => {
	it('achète pour l’élève de la session et rend le solde', async () => {
		rpc.mockResolvedValue({ data: { ok: true, balance: 15 }, error: null });
		const response = await buy(event({ decoration: 'cockade', notionId: NOTION }));
		expect(requireRole).toHaveBeenCalledWith(expect.anything(), 'student');
		expect(requireConsent).toHaveBeenCalledWith(PROFILE, 'purchase_items');
		expect(rpc).toHaveBeenCalledWith('buy_mathou_decoration', {
			p_student_id: 'eleve-1',
			p_decoration: 'cockade',
			p_notion_id: NOTION
		});
		expect(await response.json()).toEqual({ balance: 15 });
	});

	it('un collier s’achète par la même route (la base le pose au cou)', async () => {
		rpc.mockResolvedValue({ data: { ok: true, balance: 0 }, error: null });
		await buy(event({ decoration: 'order_chain', notionId: NOTION }));
		expect(rpc).toHaveBeenCalledWith('buy_mathou_decoration', {
			p_student_id: 'eleve-1',
			p_decoration: 'order_chain',
			p_notion_id: NOTION
		});
	});

	it('un identifiant d’élève dans le corps est ignoré', async () => {
		rpc.mockResolvedValue({ data: { ok: true, balance: 0 }, error: null });
		await buy(event({ decoration: 'heart', notionId: NOTION, studentId: 'autre' }));
		expect(rpc.mock.calls[0][1].p_student_id).toBe('eleve-1');
	});

	it('réservé aux élèves : un prof est refusé, rien n’est appelé', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403 });
		await expect(buy(event({ decoration: 'heart', notionId: NOTION }))).rejects.toMatchObject({
			status: 403
		});
		expect(rpc).not.toHaveBeenCalled();
	});

	it('sans consentement : 403, rien n’est débité', async () => {
		vi.mocked(requireConsent).mockImplementation(() => {
			throw { status: 403 };
		});
		await expect(buy(event({ decoration: 'heart', notionId: NOTION }))).rejects.toMatchObject({
			status: 403
		});
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		[
			'décoration inconnue (le croissant est au Lunaire)',
			{ decoration: 'crescent', notionId: NOTION }
		],
		['notion qui n’est pas un UUID', { decoration: 'heart', notionId: 'n1' }],
		['corps vide', {}],
		['corps illisible', '{pas du json']
	])('400 : %s', async (_, body) => {
		await expect(buy(event(body))).rejects.toMatchObject({ status: 400 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		[{ reason: 'insufficient_funds', missing: 12 }, 409, 'Il te manque 12 gidouilles.'],
		[{ reason: 'insufficient_funds', missing: 1 }, 409, 'Il te manque 1 gidouille.'],
		[{ reason: 'already_owned' }, 409, 'Tu as déjà cette décoration.'],
		[{ reason: 'mathou_not_found' }, 404, 'Ce Mathou n’est pas encore né.']
	])('refus de la base %o → %i', async (refusal, status, message) => {
		rpc.mockResolvedValue({ data: { ok: false, ...refusal }, error: null });
		await expect(buy(event({ decoration: 'heart', notionId: NOTION }))).rejects.toMatchObject({
			status,
			body: { message }
		});
	});

	it('panne ou réponse inattendue : 500, jamais un faux succès', async () => {
		rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
		await expect(buy(event({ decoration: 'heart', notionId: NOTION }))).rejects.toMatchObject({
			status: 500
		});
		rpc.mockResolvedValue({ data: { ok: 'oui' }, error: null });
		await expect(buy(event({ decoration: 'heart', notionId: NOTION }))).rejects.toMatchObject({
			status: 500
		});
	});
});

describe('limite de débit, partagée par l’achat et la pose', () => {
	it.each([
		['buy', () => buy(event({ decoration: 'heart', notionId: NOTION }))],
		['wear', () => wear(event({ notionId: NOTION, decoration: null }))],
		['wear-collar', () => wearCollar(event({ notionId: NOTION, collar: null }))]
	])('%s : clé par élève, 30 par minute ; dépassée → 429, rien n’est appelé', async (_, call) => {
		rpc.mockResolvedValue({ data: { ok: true }, error: null });
		await call();
		expect(rateLimit).toHaveBeenCalledWith('mathou_decoration:eleve-1', 30, 60_000);

		rpc.mockClear();
		vi.mocked(rateLimit).mockImplementation(() => {
			throw { status: 429 };
		});
		await expect(call()).rejects.toMatchObject({ status: 429 });
		expect(rpc).not.toHaveBeenCalled();
	});
});

describe('POST /api/student/mathoux/decorations/wear', () => {
	it('pose pour l’élève de la session, sans consentement exigé (rien ne s’achète)', async () => {
		rpc.mockResolvedValue({ data: { ok: true }, error: null });
		const response = await wear(event({ notionId: NOTION, decoration: 'medal' }));
		expect(rpc).toHaveBeenCalledWith('set_mathou_decoration', {
			p_student_id: 'eleve-1',
			p_notion_id: NOTION,
			p_decoration: 'medal'
		});
		expect(requireConsent).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
	});

	it('retrait : decoration null passe NULL à la base', async () => {
		rpc.mockResolvedValue({ data: { ok: true }, error: null });
		await wear(event({ notionId: NOTION, decoration: null }));
		expect(rpc.mock.calls[0][1].p_decoration).toBeNull();
	});

	it('réservé aux élèves', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403 });
		await expect(wear(event({ notionId: NOTION, decoration: null }))).rejects.toMatchObject({
			status: 403
		});
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		['décoration inconnue', { notionId: NOTION, decoration: 'crescent' }],
		['un collier ne se pose pas sur la panse', { notionId: NOTION, decoration: 'leather' }],
		['décoration absente (null explicite exigé pour retirer)', { notionId: NOTION }],
		['notion qui n’est pas un UUID', { notionId: 'x', decoration: null }]
	])('400 : %s', async (_, body) => {
		await expect(wear(event(body))).rejects.toMatchObject({ status: 400 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		[{ reason: 'not_owned' }, 409, 'Tu n’as pas encore cette décoration.'],
		[{ reason: 'mathou_not_found' }, 404, 'Ce Mathou n’est pas encore né.']
	])('refus de la base %o → %i', async (refusal, status, message) => {
		rpc.mockResolvedValue({ data: { ok: false, ...refusal }, error: null });
		await expect(wear(event({ notionId: NOTION, decoration: 'heart' }))).rejects.toMatchObject({
			status,
			body: { message }
		});
	});

	it('panne : 500', async () => {
		rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
		await expect(wear(event({ notionId: NOTION, decoration: 'heart' }))).rejects.toMatchObject({
			status: 500
		});
	});
});

describe('POST /api/student/mathoux/decorations/wear-collar', () => {
	it('pose pour l’élève de la session, sans consentement exigé (rien ne s’achète)', async () => {
		rpc.mockResolvedValue({ data: { ok: true }, error: null });
		const response = await wearCollar(
			event({ notionId: NOTION, collar: 'bell', studentId: 'autre' })
		);
		expect(rpc).toHaveBeenCalledWith('set_mathou_collar', {
			p_student_id: 'eleve-1',
			p_notion_id: NOTION,
			p_collar: 'bell'
		});
		expect(requireConsent).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
	});

	it('retrait : collar null passe NULL à la base', async () => {
		rpc.mockResolvedValue({ data: { ok: true }, error: null });
		await wearCollar(event({ notionId: NOTION, collar: null }));
		expect(rpc.mock.calls[0][1].p_collar).toBeNull();
	});

	it('réservé aux élèves', async () => {
		vi.mocked(requireRole).mockRejectedValue({ status: 403 });
		await expect(wearCollar(event({ notionId: NOTION, collar: null }))).rejects.toMatchObject({
			status: 403
		});
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		['collier inconnu', { notionId: NOTION, collar: 'scarf' }],
		['une décoration de panse ne se pose pas au cou', { notionId: NOTION, collar: 'heart' }],
		['collier absent (null explicite exigé pour retirer)', { notionId: NOTION }],
		['notion qui n’est pas un UUID', { notionId: 'x', collar: null }],
		['corps illisible', '{pas du json']
	])('400 : %s', async (_, body) => {
		await expect(wearCollar(event(body))).rejects.toMatchObject({ status: 400 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		[{ reason: 'not_owned' }, 409, 'Tu n’as pas encore cette décoration.'],
		[{ reason: 'mathou_not_found' }, 404, 'Ce Mathou n’est pas encore né.']
	])('refus de la base %o → %i', async (refusal, status, message) => {
		rpc.mockResolvedValue({ data: { ok: false, ...refusal }, error: null });
		await expect(wearCollar(event({ notionId: NOTION, collar: 'bell' }))).rejects.toMatchObject({
			status,
			body: { message }
		});
	});

	it('panne ou réponse inattendue : 500, jamais un faux succès', async () => {
		rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
		await expect(wearCollar(event({ notionId: NOTION, collar: 'bell' }))).rejects.toMatchObject({
			status: 500
		});
		rpc.mockResolvedValue({ data: { ok: 'oui' }, error: null });
		await expect(wearCollar(event({ notionId: NOTION, collar: 'bell' }))).rejects.toMatchObject({
			status: 500
		});
	});
});
