/**
 * Carnet de liaison — module serveur (ADR 0040)
 * =============================================
 *
 * Ce que le module garantit :
 *  - un jeton = 32 octets aléatoires en base64url (43 caractères), jamais
 *    stocké en clair : la base ne reçoit que son empreinte sha256 ;
 *  - un jeton mal formé n'atteint jamais la base ;
 *  - la base rend `null` (lien mort, carnet fermé) → `null`, sans distinguer ;
 *  - un carnet mal formé ou une erreur de la base → exception (500), jamais un
 *    carnet à moitié rendu.
 * Confirmer une adresse et envoyer son lien : `envois.test.ts`.
 *
 * Le comportement des fonctions SQL est prouvé par
 * `tests/integration/carnet-de-liaison.test.ts`.
 */

import { createHash } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => ({ rpc })
}));

const {
	carnetTokenSchema,
	generateCarnetToken,
	hashCarnetToken,
	readCarnetByToken,
	readMyCarnet,
	refuseParentContact,
	setParentEmailsStopped
} = await import('../carnet');

const JETON = 'A'.repeat(43);

function carnetBrut(extra: Record<string, unknown> = {}) {
	return {
		firstname: 'Léa',
		weeks: [
			{ week_start: '2026-10-19', level: '0', holiday: true },
			{ week_start: '2026-10-26', level: '1', holiday: true },
			{ week_start: '2026-11-02', level: '2-3', holiday: false },
			{ week_start: '2026-11-09', level: '4+', holiday: false },
			{ week_start: '2026-11-16', level: '0', holiday: false }
		],
		revisions: { overdue: 3 },
		evaluations: [
			{ title: 'Fractions', deadline: '2026-11-10T22:00:00+00:00', done: true },
			{ title: 'Équations', deadline: null, done: false }
		],
		classes: [{ name: '4e B', journal_token: 'AbCdEfGhJkMnPqRs', course_token: null }],
		...extra
	};
}

beforeEach(() => {
	rpc.mockReset();
});

describe('jeton du carnet', () => {
	it('32 octets en base64url : 43 caractères, accepté par le schéma', () => {
		const jeton = generateCarnetToken();
		expect(jeton).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(carnetTokenSchema.safeParse(jeton).success).toBe(true);
		expect(generateCarnetToken()).not.toBe(jeton);
	});

	it.each([
		['trop court', 'A'.repeat(42)],
		['trop long', 'A'.repeat(44)],
		['caractère hors base64url', `${'A'.repeat(42)}+`],
		['vide', '']
	])('refuse un jeton %s', (_cas, jeton) => {
		expect(carnetTokenSchema.safeParse(jeton).success).toBe(false);
	});

	it("l'empreinte est le sha256 hexadécimal, celui que calcule la base", () => {
		const attendu = createHash('sha256').update(JETON).digest('hex');
		expect(hashCarnetToken(JETON)).toBe(attendu);
		expect(hashCarnetToken(JETON)).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe('readCarnetByToken (porte du parent)', () => {
	it('jeton mal formé → null, sans appeler la base', async () => {
		expect(await readCarnetByToken('court')).toBeNull();
		expect(rpc).not.toHaveBeenCalled();
	});

	it('la base rend null → null', async () => {
		rpc.mockResolvedValue({ data: null, error: null });
		expect(await readCarnetByToken(JETON)).toBeNull();
		expect(rpc).toHaveBeenCalledWith('get_carnet_by_token', { p_token: JETON });
	});

	it('rend le carnet lu, avec l’état des courriels', async () => {
		rpc.mockResolvedValue({ data: carnetBrut({ emails_stopped: true }), error: null });
		const carnet = await readCarnetByToken(JETON);
		expect(carnet?.firstname).toBe('Léa');
		expect(carnet?.weeks.map((w) => w.level)).toEqual(['0', '1', '2-3', '4+', '0']);
		expect(carnet?.revisions.overdue).toBe(3);
		expect(carnet?.emails_stopped).toBe(true);
	});

	it('ne laisse passer AUCUNE clé hors de la liste (une note ajoutée par erreur est retirée)', async () => {
		const brut = carnetBrut({ emails_stopped: false });
		brut.evaluations = [
			{ ...brut.evaluations[0], score: 17 }
		] as unknown as typeof brut.evaluations;
		rpc.mockResolvedValue({ data: { ...brut, lastname: 'Secret' }, error: null });
		const carnet = await readCarnetByToken(JETON);
		expect(carnet).not.toHaveProperty('lastname');
		expect(carnet?.evaluations[0]).not.toHaveProperty('score');
	});

	it('erreur de la base → exception', async () => {
		rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
		await expect(readCarnetByToken(JETON)).rejects.toThrow();
	});

	it('carnet mal formé → exception, pas un carnet à moitié rendu', async () => {
		rpc.mockResolvedValue({ data: { firstname: 'Léa' }, error: null });
		await expect(readCarnetByToken(JETON)).rejects.toThrow();
	});
});

describe('readMyCarnet (porte de l’élève)', () => {
	it('lit par le client de l’élève, pas par le service role', async () => {
		const own = vi.fn().mockResolvedValue({
			data: carnetBrut({ shared: true, opted_out: false, parents: 2 }),
			error: null
		});
		const carnet = await readMyCarnet({ rpc: own } as never);
		expect(own).toHaveBeenCalledWith('get_my_carnet');
		expect(rpc).not.toHaveBeenCalled();
		expect(carnet).toMatchObject({ shared: true, opted_out: false, parents: 2 });
	});

	it('pas un élève → null', async () => {
		const own = vi.fn().mockResolvedValue({ data: null, error: null });
		expect(await readMyCarnet({ rpc: own } as never)).toBeNull();
	});
});

describe('refuseParentContact et setParentEmailsStopped', () => {
	it('jeton mal formé → false, sans appeler la base', async () => {
		expect(await refuseParentContact('x')).toBe(false);
		expect(await setParentEmailsStopped('x', true)).toBe(false);
		expect(rpc).not.toHaveBeenCalled();
	});

	it('refus pris en compte → true ; jeton inconnu → false', async () => {
		rpc.mockResolvedValueOnce({ data: { student_id: 's' }, error: null });
		expect(await refuseParentContact(JETON)).toBe(true);
		rpc.mockResolvedValueOnce({ data: null, error: null });
		expect(await refuseParentContact(JETON)).toBe(false);
	});

	it('arrêt et reprise des courriels passent le booléen tel quel', async () => {
		rpc.mockResolvedValue({ data: true, error: null });
		expect(await setParentEmailsStopped(JETON, true)).toBe(true);
		expect(rpc).toHaveBeenLastCalledWith('set_parent_emails_stopped', {
			p_token: JETON,
			p_stopped: true
		});
		await setParentEmailsStopped(JETON, false);
		expect(rpc).toHaveBeenLastCalledWith('set_parent_emails_stopped', {
			p_token: JETON,
			p_stopped: false
		});
	});
});
