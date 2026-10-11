/**
 * POST /api/marketplace/trades/[id]/confirm — remise à zéro à l'expiration
 * ========================================================================
 *
 * Une écriture refusée par la RLS rend zéro ligne SANS erreur. La remise à
 * zéro d'un échange expiré doit donc relire les lignes écrites : zéro ligne
 * (ou une erreur) → erreur explicite, pas le 410 qui annonce une remise à
 * zéro qui n'a pas eu lieu. Le cas nominal (une ligne) garde son 410.
 *
 * Comportement réel (RLS, trigger) : tests/integration/echanges-delai-confirmation.test.ts.
 */
import { describe, it, expect, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

vi.mock('$lib/server/marketplace/notifications', () => ({ notifyTradeCompleted: vi.fn() }));

import { POST } from '../+server';

// ============================================================================
// TYPES
// ============================================================================

type Resultat = { data: unknown; error: { message: string; code?: string } | null };

// ============================================================================
// CONSTANTES
// ============================================================================

const TRADE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const PARTNER_ID = '33333333-3333-4333-8333-333333333333';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Échange validé des deux côtés, phase commencée il y a 6 minutes. */
function echangeExpire() {
	return {
		id: TRADE_ID,
		initiator_id: USER_ID,
		partner_id: PARTNER_ID,
		status: 'negotiating',
		validated_by_initiator: true,
		validated_by_partner: true,
		confirmed_by_initiator: false,
		confirmed_by_partner: false,
		confirmation_started_at: new Date(Date.now() - 6 * 60_000).toISOString()
	};
}

/**
 * Client minimal : la 1re requête (lecture `.single()`) rend l'échange, la
 * 2e (mise à jour) rend `remiseAZero`. Les chaînes s'attendent avec `await`,
 * comme le constructeur de requêtes de supabase-js.
 */
/** Une vraie promesse, enrichie des méthodes de chaînage que le handler appelle. */
interface MockChain extends Promise<Resultat> {
	eq: () => MockChain;
	select: (...args: unknown[]) => MockChain;
	single: () => Promise<Resultat>;
}

function clientSimule(remiseAZero: Resultat) {
	const update = vi.fn();
	const select = vi.fn();
	const chaine = (resultat: Resultat) => {
		// Une vraie promesse, enrichie des méthodes de chaînage utilisées.
		const c: MockChain = Object.assign(Promise.resolve(resultat), {
			eq: () => c,
			select: (...args: unknown[]) => {
				select(...args);
				return c;
			},
			single: () => Promise.resolve(resultat)
		});
		return c;
	};
	const supabase = {
		from: () => ({
			select: () => chaine({ data: echangeExpire(), error: null }),
			update: (...args: unknown[]) => {
				update(...args);
				return chaine(remiseAZero);
			}
		})
	};
	return { supabase, update, select };
}

async function appeler(supabase: unknown) {
	try {
		const res = await POST({
			params: { id: TRADE_ID },
			locals: { supabase, user: { id: USER_ID } }
		} as never);
		return { status: res.status, message: null as string | null };
	} catch (err) {
		if (isHttpError(err)) return { status: err.status, message: err.body.message };
		throw err;
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe('confirm : remise à zéro d’un échange expiré', () => {
	it('0 ligne remise à zéro (refus RLS silencieux) → erreur explicite, pas 410', async () => {
		const { supabase, update, select } = clientSimule({ data: [], error: null });
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const res = await appeler(supabase);

		expect(update).toHaveBeenCalledTimes(1);
		expect(select).toHaveBeenCalled();
		expect(res.status).toBe(500);
		expect(res.message).toMatch(/pas pu être réinitialisé/);
	});

	it('erreur à la remise à zéro → erreur explicite, pas 410', async () => {
		const { supabase } = clientSimule({ data: null, error: { message: 'boom', code: '42501' } });
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const res = await appeler(supabase);

		expect(res.status).toBe(500);
		expect(res.message).toMatch(/pas pu être réinitialisé/);
	});

	it('témoin : 1 ligne remise à zéro → 410 (comportement nominal)', async () => {
		const { supabase, update } = clientSimule({ data: [{ id: TRADE_ID }], error: null });

		const res = await appeler(supabase);

		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				validated_by_initiator: false,
				validated_by_partner: false,
				confirmed_by_initiator: false,
				confirmed_by_partner: false,
				confirmation_started_at: null
			})
		);
		expect(res.status).toBe(410);
		expect(res.message).toMatch(/expire/);
	});
});
