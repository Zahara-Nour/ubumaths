/**
 * Page /consent/[token] — action « grant »
 *
 * Le consentement est accordé par le client service, avec l'IP et le navigateur
 * relevés par le serveur sur la requête reçue (la fonction SQL n'est plus exécutable
 * par anon : migration 20261001150000).
 *
 * Inscription par le parent (décision 3) : pour un niveau soumis au consentement, la case
 * explicite est exigée côté serveur ; en 1re/Tle, le clic confirme seulement l'adresse.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ rpc: rpcMock })
}));

import { actions } from '../+page.server';

const TOKEN = '11111111-1111-4111-8111-111111111111';

type GrantEvent = Parameters<typeof actions.grant>[0];

function infoConsentement(grade: string) {
	return {
		success: true,
		student: { firstname: 'Noélie', lastname: '', grade },
		teacher_name: null,
		school_name: null,
		parent_email: 'parent@exemple.fr',
		expires_at: '2099-01-01T00:00:00Z'
	};
}

/** Le client service répond à get_consent_info (niveau donné) puis à grant_parental_consent. */
function serviceRepond(grade: string, grant: unknown) {
	rpcMock.mockImplementation(async (fn: string) =>
		fn === 'get_consent_info' ? { data: infoConsentement(grade), error: null } : grant
	);
}

function evenement(userSupabaseRpc = vi.fn(), caseCochee = true): GrantEvent {
	const body = new URLSearchParams();
	if (caseCochee) body.set('consent', 'true');
	return {
		params: { token: TOKEN },
		locals: { supabase: { rpc: userSupabaseRpc } },
		request: new Request('http://localhost/consent/' + TOKEN, {
			method: 'POST',
			headers: {
				'user-agent': 'Firefox réel',
				'content-type': 'application/x-www-form-urlencoded'
			},
			body
		}),
		getClientAddress: () => '198.51.100.7'
	} as unknown as GrantEvent;
}

beforeEach(() => {
	rpcMock.mockReset();
});

describe('action grant', () => {
	it("appelle grant_parental_consent avec le client service, l'IP et le navigateur de la requête", async () => {
		serviceRepond('6', {
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
		serviceRepond('6', {
			data: { success: false, error: 'TOKEN_EXPIRED', message: 'Ce lien a expiré.' },
			error: null
		});
		const res = await actions.grant(evenement());
		expect(res).toMatchObject({ status: 400, data: { error: 'TOKEN_EXPIRED' } });
	});

	it('niveau soumis au consentement, case non cochée : refusé, rien accordé', async () => {
		serviceRepond('6', { data: { success: true, message: 'ok' }, error: null });
		const res = await actions.grant(evenement(vi.fn(), false));
		expect(res).toMatchObject({ status: 400, data: { error: 'CONSENT_UNCHECKED' } });
		expect(rpcMock).not.toHaveBeenCalledWith('grant_parental_consent', expect.anything());
	});

	it('1re/Tle : le clic confirme l’adresse sans case', async () => {
		serviceRepond('1_SPE', { data: { success: true, message: 'ok' }, error: null });
		await expect(actions.grant(evenement(vi.fn(), false))).rejects.toMatchObject({
			status: 303
		});
		expect(rpcMock).toHaveBeenCalledWith('grant_parental_consent', expect.anything());
	});

	it("lien invalide : l'erreur de get_consent_info, rien accordé", async () => {
		rpcMock.mockImplementation(async (fn: string) =>
			fn === 'get_consent_info'
				? {
						data: { success: false, error: 'TOKEN_NOT_FOUND', message: 'Lien invalide.' },
						error: null
					}
				: { data: null, error: null }
		);
		const res = await actions.grant(evenement());
		expect(res).toMatchObject({ status: 400, data: { error: 'TOKEN_NOT_FOUND' } });
		expect(rpcMock).not.toHaveBeenCalledWith('grant_parental_consent', expect.anything());
	});
});
