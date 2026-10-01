/**
 * Page /consent/[token] — action « grant »
 *
 * Le consentement est accordé par le client service, avec l'IP et le navigateur
 * relevés par le serveur sur la requête reçue (la fonction SQL n'est plus exécutable
 * par anon : migration 20261001150000).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ rpc: rpcMock })
}));

import { actions } from '../+page.server';

const TOKEN = '11111111-1111-4111-8111-111111111111';

type GrantEvent = Parameters<typeof actions.grant>[0];

function evenement(userSupabaseRpc = vi.fn()): GrantEvent {
	return {
		params: { token: TOKEN },
		locals: { supabase: { rpc: userSupabaseRpc } },
		request: new Request('http://localhost/consent/' + TOKEN, {
			method: 'POST',
			headers: { 'user-agent': 'Firefox réel' }
		}),
		getClientAddress: () => '198.51.100.7'
	} as unknown as GrantEvent;
}

beforeEach(() => {
	rpcMock.mockReset();
});

describe('action grant', () => {
	it("appelle grant_parental_consent avec le client service, l'IP et le navigateur de la requête", async () => {
		rpcMock.mockResolvedValue({
			data: { success: true, message: 'ok', student_name: 'Alice' },
			error: null
		});
		const userRpc = vi.fn();

		await expect(actions.grant(evenement(userRpc))).rejects.toMatchObject({
			status: 303,
			location: '/consent/success'
		});

		expect(rpcMock).toHaveBeenCalledWith('grant_parental_consent', {
			p_token: TOKEN,
			p_ip: '198.51.100.7',
			p_user_agent: 'Firefox réel'
		});
		expect(userRpc).not.toHaveBeenCalled();
	});

	it("rend l'erreur métier de la fonction (lien expiré)", async () => {
		rpcMock.mockResolvedValue({
			data: { success: false, error: 'TOKEN_EXPIRED', message: 'Ce lien a expiré.' },
			error: null
		});
		const res = await actions.grant(evenement());
		expect(res).toMatchObject({ status: 400, data: { error: 'TOKEN_EXPIRED' } });
	});
});
