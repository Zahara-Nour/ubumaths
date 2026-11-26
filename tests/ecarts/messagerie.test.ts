/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaine
 * messagerie et carnet de liaison.
 *
 * Chaque test affirme le comportement ATTENDU d'un écart encore ouvert : il est
 * rouge tant que l'écart est vrai. Le nom de chaque `describe` porte l'identifiant
 * de l'écart, que le registre retient par `› L80`.
 *
 * Les écarts du domaine qui demandent une vraie base (L79, L82, L83, L84) ont
 * leur preuve dans `tests/integration/ecarts-messagerie.test.ts`.
 *
 * Sonde : le passage quotidien du carnet (`runCarnetDaily`) sur une base
 * simulée, le courriel simulé. Aucune erreur n'est avalée.
 */

import { describe, it, expect, vi } from 'vitest';
import { runCarnetDaily } from '#lib/server/carnet/courriels.ts';

vi.mock('#lib/server/email/brevo.ts', () => ({
	sendCarnetExceptionEmail: vi.fn(async () => ({ success: true })),
	sendCarnetQuarterlyEmail: vi.fn(async () => ({ success: true }))
}));
vi.mock('#lib/server/carnet/envois.ts', () => ({ sendClassMissingLinks: vi.fn() }));
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

describe('L80 : épisodes non marqués après un courriel d’exception parti', () => {
	// Sans marquage, le plan repropose l'épisode au bout de 6 jours et demi : le
	// parent reçoit deux fois le même avertissement. Attendu ici : le passage le
	// signale (il finit en erreur, que le cron journalise). Si la correction
	// choisit plutôt d'empêcher la reproposition en base, ou de compter l'échec
	// au rapport sans lever, ce test est à réécrire (en intégration sur
	// `carnet_exception_plan` dans le premier cas).
	//
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
