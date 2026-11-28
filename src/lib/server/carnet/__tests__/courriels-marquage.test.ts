/**
 * Passage quotidien du carnet : marquage des épisodes après un courriel
 * d'exception (écart L80, ancienne preuve de `tests/ecarts/messagerie.test.ts`).
 *
 * Un épisode non marqué serait reproposé par le plan la semaine suivante, et le
 * parent recevrait deux fois le même avertissement : le passage doit le signaler
 * en finissant en erreur (le cron la journalise).
 *
 * Sonde : `runCarnetDaily` sur une base simulée, le courriel simulé.
 */

import { describe, it, expect, vi } from 'vitest';
import { runCarnetDaily } from '../courriels';

vi.mock('#lib/server/email/brevo.ts', () => ({
	sendCarnetExceptionEmail: vi.fn(async () => ({ success: true })),
	sendCarnetQuarterlyEmail: vi.fn(async () => ({ success: true }))
}));
vi.mock('../envois', () => ({ sendClassMissingLinks: vi.fn() }));
vi.mock('#lib/server/serviceRoleClient.ts', () => ({ createServiceRoleClient: vi.fn() }));

type Reponse = { data: unknown; error: { message: string } | null };

const EPISODE = '33333333-3333-4333-8333-333333333333';

/** Un courriel d'exception à envoyer, pour un épisode. */
const PLAN = [
	{
		contact_id: '11111111-1111-4111-8111-111111111111',
		student_id: '22222222-2222-4222-8222-222222222222',
		email: 'parent@example.test',
		firstname: 'Camille',
		reasons: ['inactivity'],
		episode_ids: [EPISODE],
		overdue_days: 7,
		inactivity_days: 15
	}
];

/**
 * Base simulée du passage : un courriel d'exception au plan, sa ligne de journal
 * écrite, et `marquage` pour réponse à la mise à jour des épisodes.
 */
function base(marquage: Reponse) {
	const reponses: Record<string, Reponse> = {
		carnet_exception_plan: { data: PLAN, error: null },
		carnet_erase_orphan_contacts: { data: 0, error: null },
		carnet_erase_old_notifications: { data: 0, error: null }
	};
	const parTable: Record<string, Reponse> = {
		class_carnet_settings: { data: [], error: null },
		parent_notifications: { data: { id: 'journal-1' }, error: null },
		parent_exception_episodes: marquage
	};
	const tablesMisesAJour: string[] = [];
	const from = (table: string) => {
		const reponse = parTable[table];
		if (!reponse) throw new Error(`table inattendue : ${table}`);
		const chaine = {
			select: () => chaine,
			insert: () => chaine,
			update: () => {
				tablesMisesAJour.push(table);
				return chaine;
			},
			eq: () => chaine,
			in: () => chaine,
			is: () => chaine,
			single: () => chaine,
			then: (ok: (r: Reponse) => unknown) => Promise.resolve(reponse).then(ok)
		};
		return chaine;
	};
	const rpc = async (nom: string) => reponses[nom] ?? { data: [], error: null };
	return { service: { rpc, from } as never, tablesMisesAJour };
}

describe('témoin : épisodes marqués après le courriel', () => {
	it('le passage finit sans erreur, un courriel d’exception compté', async () => {
		const { service, tablesMisesAJour } = base({ data: [{ id: EPISODE }], error: null });

		const rapport = await runCarnetDaily(service);

		expect(rapport.exceptions).toEqual({ sent: 1, failed: 0 });
		// Le marquage passe bien par la table que les preuves font échouer
		expect(tablesMisesAJour).toEqual(['parent_exception_episodes']);
	});
});

describe('épisodes non marqués après un courriel d’exception parti', () => {
	// La base simulée lève « table inattendue » pour toute table qu'elle ne
	// connaît pas : une erreur de ce nom n'est pas le signalement attendu.
	it('une panne de base au marquage fait finir le passage en erreur', async () => {
		const { service } = base({ data: null, error: { message: 'panne' } });

		await expect(runCarnetDaily(service)).rejects.not.toThrow(/table inattendue/);
	});

	it('un marquage qui ne touche aucune ligne fait finir le passage en erreur', async () => {
		const { service } = base({ data: [], error: null });

		await expect(runCarnetDaily(service)).rejects.not.toThrow(/table inattendue/);
	});
});
