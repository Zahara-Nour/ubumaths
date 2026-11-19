/**
 * Passage quotidien du carnet : effacement du journal des courriels (Q42).
 * Base simulée : chaque fonction SQL rend ce que le test lui donne ; aucune
 * classe au carnet, aucun courriel à envoyer.
 */
import { describe, it, expect, vi } from 'vitest';
import { runCarnetDaily } from '../courriels';

vi.mock('#lib/server/email/brevo.ts', () => ({
	sendCarnetExceptionEmail: vi.fn(),
	sendCarnetQuarterlyEmail: vi.fn()
}));
vi.mock('../envois', () => ({ sendClassMissingLinks: vi.fn() }));
vi.mock('#lib/server/serviceRoleClient.ts', () => ({ createServiceRoleClient: vi.fn() }));

type Reponse = { data: unknown; error: { message: string } | null };

function base(reponses: Record<string, Reponse>) {
	const rpc = vi.fn(async (nom: string) => reponses[nom] ?? { data: [], error: null });
	// Classes au carnet : `from().select().eq().eq()` → aucune
	const chaine = {
		select: () => chaine,
		eq: () => chaine,
		then: (ok: (r: Reponse) => unknown) => Promise.resolve({ data: [], error: null }).then(ok)
	};
	return { rpc, service: { rpc, from: () => chaine } as never };
}

describe('runCarnetDaily — journal des courriels (Q42)', () => {
	it('efface les courriels de plus d’un an et le compte au rapport', async () => {
		const { rpc, service } = base({
			carnet_erase_orphan_contacts: { data: 2, error: null },
			carnet_erase_old_notifications: { data: 7, error: null }
		});

		const rapport = await runCarnetDaily(service);

		expect(rpc).toHaveBeenCalledWith('carnet_erase_old_notifications');
		expect(rapport.erased).toBe(2);
		expect(rapport.erasedNotifications).toBe(7);
	});

	it('en échec : les autres étapes tournent, le passage finit en erreur', async () => {
		const { rpc, service } = base({
			carnet_erase_old_notifications: { data: null, error: { message: 'panne' } }
		});

		await expect(runCarnetDaily(service)).rejects.toThrow('Effacement du journal des courriels');
		expect(rpc).toHaveBeenCalledWith('carnet_quarterly_plan');
	});
});
