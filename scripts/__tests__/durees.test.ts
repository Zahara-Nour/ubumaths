/**
 * `pnpm durees` — durées de la CI, des PR, de la mise en prod et du Mac mini
 * =========================================================================
 *
 * Gardé ici (scripts/durees/logique.ts) :
 * - une exécution de CI ne donne des mesures que si elle est complète : un seul
 *   job sauté (PR de contenu) et rien n'est compté, sinon la médiane baisserait ;
 * - un job rouge ou annulé n'est pas une mesure ; la durée de la CI entière ne
 *   vaut que pour une première tentative verte ;
 * - « ouverture → merge » ne compte que les PR mergées sur un seul push, datées
 *   du merge (une PR ouverte la veille et mergée lentement reste dans la journée) ;
 * - alerte : médiane d'au moins 1,5 fois la référence ET au moins 5 mesures ;
 *   une seule PR lente ne déclenche rien ;
 * - mise en prod : les 5 dernières, et seulement s'il y en a eu une dans la journée ;
 * - tests d'intégration : seule une suite entière compte (4 morceaux, tests joués
 *   dans chacun, aucune liste de tests retenue) ; une PR qui n'en joue qu'une partie, ou aucun, n'est pas une
 *   mesure ; la suite de la nuit suit la règle de la mise en prod (une par jour) ;
 * - journal du Mac mini : une ligne par commande verte, les lignes illisibles
 *   sautées ; une phase locale courte (check:incremental, 18 s) est montrée ;
 * - une faute de frappe dans les options affiche l'usage, jamais le tableau ;
 * - un fichier de référence mal formé est refusé à la lecture ;
 * - la référence ne bouge que par `nouvelleReference` : au moins 5 mesures par
 *   phase, sinon l'ancienne valeur reste.
 */

import { describe, it, expect } from 'vitest';
import {
	comparer,
	formaterDuree,
	lireArguments,
	lireJournalLocal,
	lireJournalProd,
	lireReference,
	mediane,
	mesuresDeLaPr,
	mesuresDuRun,
	mesuresIntegration,
	messageAlerte,
	nouvelleReference,
	tableau,
	type Job,
	type Mesure,
	type Reference,
	type Run
} from '../durees/logique.ts';

const MAINTENANT = new Date('2026-11-24T05:00:00Z');

function run(extra: Partial<Run> = {}): Run {
	return {
		databaseId: 1,
		headBranch: 'feat/exemple',
		headSha: 'abc',
		conclusion: 'success',
		status: 'completed',
		attempt: 1,
		createdAt: '2026-11-23T10:00:00Z',
		updatedAt: '2026-11-23T10:07:00Z',
		...extra
	};
}

function job(name: string, secondes: number, extra: Partial<Job> = {}): Job {
	const debut = Date.parse('2026-11-23T10:00:10Z');
	return {
		name,
		conclusion: 'success',
		started_at: new Date(debut).toISOString(),
		completed_at: new Date(debut + secondes * 1000).toISOString(),
		steps: [],
		...extra
	};
}

function mesures(phase: string, valeurs: number[], date = '2026-11-23T10:00:00Z'): Mesure[] {
	return valeurs.map((secondes) => ({ phase, secondes, date }));
}

const REFERENCE: Reference = {
	depuis: '2026-11-23T06:17:00Z',
	phases: { 'job:Lint': 90, ci: 430, 'prod:vercel': 180 }
};

describe('mediane', () => {
	it('rend la valeur du milieu, ou la moyenne arrondie des deux du milieu', () => {
		expect(mediane([5, 1, 3])).toBe(3);
		expect(mediane([1, 2, 4, 10])).toBe(3);
		expect(mediane([])).toBeNull();
	});
});

describe('formaterDuree', () => {
	it('écrit les secondes seules sous la minute, puis minutes et secondes', () => {
		expect(formaterDuree(27)).toBe('27 s');
		expect(formaterDuree(90)).toBe('1 min 30');
		expect(formaterDuree(420)).toBe('7 min');
		expect(formaterDuree(400)).toBe('6 min 40');
	});
});

describe('mesuresDuRun', () => {
	it('mesure chaque job vert, les étapes suivies et la CI entière', () => {
		const lues = mesuresDuRun(run(), [
			job('Lint', 92, {
				steps: [
					{
						name: 'Run Prettier check',
						conclusion: 'success',
						started_at: '2026-11-23T10:00:20Z',
						completed_at: '2026-11-23T10:00:47Z'
					},
					{
						name: 'Checkout code',
						conclusion: 'success',
						started_at: '2026-11-23T10:00:10Z',
						completed_at: '2026-11-23T10:00:20Z'
					}
				]
			}),
			job('Build', 113)
		]);
		expect(lues).toEqual([
			{ phase: 'job:Lint', secondes: 92, date: '2026-11-23T10:00:00Z' },
			{ phase: 'etape:Lint / Run Prettier check', secondes: 27, date: '2026-11-23T10:00:00Z' },
			{ phase: 'job:Build', secondes: 113, date: '2026-11-23T10:00:00Z' },
			{ phase: 'ci', secondes: 420, date: '2026-11-23T10:00:00Z' }
		]);
	});

	it('ne compte rien quand un job est sauté (PR de contenu)', () => {
		const lues = mesuresDuRun(run(), [
			job('Lint', 60),
			job('Type Check', 0, { conclusion: 'skipped' })
		]);
		expect(lues).toEqual([]);
	});

	it('écarte le job rouge et la CI entière d’une exécution rouge', () => {
		const lues = mesuresDuRun(run({ conclusion: 'failure' }), [
			job('Lint', 92),
			job('Build', 30, { conclusion: 'failure' })
		]);
		expect(lues.map((m) => m.phase)).toEqual(['job:Lint']);
	});

	it('ne compte pas la CI entière d’une exécution relancée', () => {
		const lues = mesuresDuRun(run({ attempt: 2 }), [job('Lint', 92)]);
		expect(lues.map((m) => m.phase)).toEqual(['job:Lint']);
	});

	it('ne compte rien tant que l’exécution tourne', () => {
		expect(
			mesuresDuRun(run({ status: 'in_progress', conclusion: null }), [job('Lint', 92)])
		).toEqual([]);
	});
});

describe('mesuresDeLaPr', () => {
	const pr = {
		number: 12,
		createdAt: '2026-11-23T09:59:50Z',
		mergedAt: '2026-11-23T10:07:40Z',
		headRefName: 'feat/exemple'
	};

	it('mesure ouverture → merge quand la PR n’a eu qu’un push, sur une CI complète', () => {
		expect(mesuresDeLaPr(pr, [run()], new Set([1]))).toEqual([
			{ phase: 'pr', secondes: 470, date: '2026-11-23T10:07:40Z' }
		]);
	});

	it('ne compte pas une PR à plusieurs pushes', () => {
		expect(mesuresDeLaPr(pr, [run(), run({ databaseId: 2 })], new Set([1, 2]))).toEqual([]);
	});

	it('ne compte pas une PR dont la CI n’était pas complète (contenu)', () => {
		expect(mesuresDeLaPr(pr, [run()], new Set())).toEqual([]);
	});

	it('ignore les exécutions d’une autre branche ou d’avant l’ouverture', () => {
		const autres = [
			run({ databaseId: 2, headBranch: 'feat/autre' }),
			run({ databaseId: 3, createdAt: '2026-11-20T10:00:00Z' })
		];
		expect(mesuresDeLaPr(pr, [run(), ...autres], new Set([1]))).toHaveLength(1);
	});
});

describe('lireJournalProd', () => {
	it('lit les étapes notées par pnpm deploy:prod et saute les lignes illisibles', () => {
		const texte = [
			'2026-11-23T08:00:00Z;v0.102.0;ci-version;420',
			'2026-11-23T08:10:00Z;v0.102.0;vercel;180',
			'ligne cassée',
			'2026-11-23T08:10:00Z;v0.102.0;vercel;abc',
			''
		].join('\n');
		expect(lireJournalProd(texte)).toEqual([
			{ phase: 'prod:ci-version', secondes: 420, date: '2026-11-23T08:00:00Z' },
			{ phase: 'prod:vercel', secondes: 180, date: '2026-11-23T08:10:00Z' }
		]);
	});
});

describe('mesuresIntegration', () => {
	/** Un morceau de la suite : son job, et l'étape qui joue les tests. */
	function morceau(k: number, total: number, tests: string | null = 'success'): Job {
		return job(`Integration tests (shard ${k}/${total})`, 300, {
			steps: [
				{ name: 'Checkout code', conclusion: tests === null ? 'skipped' : 'success' },
				{
					name: `Run integration tests (shard ${k}/${total})`,
					conclusion: tests ?? 'skipped'
				}
			]
		});
	}
	/** Le job de portée : l'étape des exclusions n'est jouée qu'en suite complète. */
	const portee = (complete: boolean) =>
		job('Integration scope', 30, {
			steps: [
				{
					name: 'Tests de migration de données laissés de côté (PR en suite complète)',
					conclusion: complete ? 'success' : 'skipped'
				}
			]
		});
	const filtre = job('Integration paths filter', 35);
	const autres = [portee(true), filtre];
	const entiere = [...autres, ...[1, 2, 3, 4].map((k) => morceau(k, 4))];
	const nuit = run({ event: 'schedule', headBranch: 'main' });
	const pr = run({ event: 'pull_request' });

	it('mesure la suite entière de la nuit, et celle d’une PR, à part', () => {
		expect(mesuresIntegration(nuit, entiere)).toEqual([
			{ phase: 'integration:nuit', secondes: 420, date: '2026-11-23T10:00:00Z' }
		]);
		expect(mesuresIntegration(pr, entiere)).toEqual([
			{ phase: 'integration:pr', secondes: 420, date: '2026-11-23T10:00:00Z' }
		]);
	});

	it('ne compte pas une PR qui ne joue que les tests touchés (un seul morceau)', () => {
		expect(mesuresIntegration(pr, [...autres, morceau(1, 1)])).toEqual([]);
	});

	it('ne compte pas un passage où les tests ne sont pas relancés (déjà vert, aucun test atteint)', () => {
		const sautes = [...autres, ...[1, 2, 3, 4].map((k) => morceau(k, 4, null))];
		expect(mesuresIntegration(pr, sautes)).toEqual([]);
		expect(mesuresIntegration(pr, [...autres, morceau(1, 1, null)])).toEqual([]);
	});

	it('ne compte pas une suite rouge, relancée, en cours, ou lancée à la main', () => {
		const rouge = [
			...autres,
			morceau(1, 4),
			morceau(2, 4),
			morceau(3, 4),
			morceau(4, 4, 'failure')
		];
		expect(mesuresIntegration(run({ event: 'schedule', conclusion: 'failure' }), rouge)).toEqual(
			[]
		);
		expect(mesuresIntegration(run({ event: 'schedule', attempt: 2 }), entiere)).toEqual([]);
		expect(
			mesuresIntegration(
				run({ event: 'schedule', status: 'in_progress', conclusion: null }),
				entiere
			)
		).toEqual([]);
		expect(mesuresIntegration(run({ event: 'workflow_dispatch' }), entiere)).toEqual([]);
	});

	it('ne compte pas une PR à plus de 40 tests touchés : 4 morceaux, mais une liste de tests', () => {
		const touches = [portee(false), filtre, ...[1, 2, 3, 4].map((k) => morceau(k, 4))];
		expect(mesuresIntegration(pr, touches)).toEqual([]);
	});

	it('ne compte pas une suite dont un morceau manque', () => {
		expect(mesuresIntegration(nuit, entiere.slice(0, -1))).toEqual([]);
	});
});

describe('lireJournalLocal', () => {
	it('lit les commandes notées sur le Mac mini et saute les lignes illisibles', () => {
		const texte = [
			'2026-11-23T08:00:00Z;check-incremental;18',
			'2026-11-23T08:10:00Z;pre-push;12',
			'ligne cassée',
			'2026-11-23T08:10:00Z;pre-push;abc',
			'2026-11-23T08:10:00Z;Pas Une Phase;12',
			'pas une date;pre-push;12',
			''
		].join('\n');
		expect(lireJournalLocal(texte)).toEqual([
			{ phase: 'local:check-incremental', secondes: 18, date: '2026-11-23T08:00:00Z' },
			{ phase: 'local:pre-push', secondes: 12, date: '2026-11-23T08:10:00Z' }
		]);
	});
});

describe('comparer', () => {
	it('signale une médiane d’au moins 1,5 fois la référence sur au moins 5 mesures', () => {
		const lignes = comparer(
			mesures('job:Lint', [400, 400, 400, 400, 400, 90]),
			REFERENCE,
			MAINTENANT
		);
		expect(lignes.find((l) => l.phase === 'job:Lint')).toMatchObject({
			reference: 90,
			jour: 400,
			nJour: 6,
			verdict: 'lent'
		});
	});

	it('ne signale rien pour une seule PR lente parmi des normales', () => {
		const lignes = comparer(mesures('job:Lint', [90, 92, 88, 95, 91, 900]), REFERENCE, MAINTENANT);
		expect(lignes.find((l) => l.phase === 'job:Lint')?.verdict).toBe('normal');
	});

	it('ne signale rien sous 5 mesures, même toutes lentes', () => {
		const lignes = comparer(mesures('job:Lint', [400, 400, 400, 400]), REFERENCE, MAINTENANT);
		expect(lignes.find((l) => l.phase === 'job:Lint')?.verdict).toBe('trop-peu');
	});

	it('sépare la journée des 7 jours, et oublie ce qui précède la référence', () => {
		const lignes = comparer(
			[
				...mesures('job:Lint', [100, 100, 100, 100, 100], '2026-11-23T10:00:00Z'),
				...mesures('job:Lint', [200, 200], '2026-11-23T04:00:00Z'),
				...mesures('job:Lint', [900], '2026-11-23T03:00:00Z').map((m) => ({
					...m,
					date: '2026-11-22T10:00:00Z'
				}))
			],
			{ ...REFERENCE, depuis: '2026-11-23T03:30:00Z' },
			MAINTENANT
		);
		expect(lignes.find((l) => l.phase === 'job:Lint')).toMatchObject({
			jour: 100,
			nJour: 5,
			semaine: 100,
			nSemaine: 7
		});
	});

	it('juste sous le seuil : normal ; au seuil : lent', () => {
		const sous = comparer(mesures('job:Lint', [134, 134, 134, 134, 134]), REFERENCE, MAINTENANT);
		const au = comparer(mesures('job:Lint', [135, 135, 135, 135, 135]), REFERENCE, MAINTENANT);
		expect(sous.find((l) => l.phase === 'job:Lint')?.verdict).toBe('normal');
		expect(au.find((l) => l.phase === 'job:Lint')?.verdict).toBe('lent');
	});

	it('montre une phase mesurée mais absente de la référence, sans verdict', () => {
		const lignes = comparer(mesures('job:Nouveau', [50, 50, 50, 50, 50]), REFERENCE, MAINTENANT);
		expect(lignes.find((l) => l.phase === 'job:Nouveau')).toMatchObject({
			reference: null,
			verdict: 'sans-reference'
		});
	});

	it('pr:merger : une référence écrite à la main est ignorée, jamais « lent »', () => {
		const lignes = comparer(
			mesures('local:pr-merger', [900, 900, 900, 900, 900]),
			{ ...REFERENCE, phases: { ...REFERENCE.phases, 'local:pr-merger': 400 } },
			MAINTENANT
		);
		expect(lignes.find((l) => l.phase === 'local:pr-merger')).toMatchObject({
			reference: null,
			verdict: 'sans-reference'
		});
	});

	it('ne montre pas une phase sans référence de moins de 20 s', () => {
		const lignes = comparer(mesures('job:CI Summary', [4, 4, 4, 4, 4]), REFERENCE, MAINTENANT);
		expect(lignes.find((l) => l.phase === 'job:CI Summary')).toBeUndefined();
	});

	it('garde une phase de la référence sans mesure du jour', () => {
		const lignes = comparer([], REFERENCE, MAINTENANT);
		expect(lignes.find((l) => l.phase === 'ci')).toMatchObject({ nJour: 0, verdict: 'trop-peu' });
	});

	it('mise en prod : les 5 dernières, quel que soit leur âge, si la dernière est du jour', () => {
		const anciennes = mesures('prod:vercel', [300, 300, 300, 300], '2026-11-10T10:00:00Z');
		const duJour = mesures('prod:vercel', [300], '2026-11-23T20:00:00Z');
		const avec = comparer(
			[...anciennes, ...duJour],
			{ ...REFERENCE, depuis: '2026-11-01T00:00:00Z' },
			MAINTENANT
		);
		expect(avec.find((l) => l.phase === 'prod:vercel')).toMatchObject({
			nJour: 5,
			verdict: 'lent'
		});
		const sans = comparer(
			[...anciennes, ...mesures('prod:vercel', [300], '2026-11-12T10:00:00Z')],
			{ ...REFERENCE, depuis: '2026-11-01T00:00:00Z' },
			MAINTENANT
		);
		expect(sans.find((l) => l.phase === 'prod:vercel')).toMatchObject({
			nJour: 0,
			verdict: 'trop-peu'
		});
	});

	it('suite de la nuit : une par jour, donc les 5 dernières, comme la mise en prod', () => {
		const nuits = ['19', '20', '21', '22', '23'].flatMap((jour) =>
			mesures('integration:nuit', [900], `2026-11-${jour}T09:45:00Z`)
		);
		const reference = {
			depuis: '2026-11-01T00:00:00Z',
			phases: { 'integration:nuit': 420 }
		};
		expect(
			comparer(nuits, reference, MAINTENANT).find((l) => l.phase === 'integration:nuit')
		).toMatchObject({ nJour: 5, jour: 900, verdict: 'lent' });
		// Pas de suite la nuit dernière : rien à redire, l'alerte a déjà été donnée.
		expect(
			comparer(nuits.slice(0, 4), reference, MAINTENANT).find((l) => l.phase === 'integration:nuit')
		).toMatchObject({ nJour: 0, verdict: 'trop-peu' });
	});

	it('suite entière d’une PR : la règle ordinaire, les dernières 24 heures', () => {
		const lignes = comparer(
			mesures('integration:pr', [900, 900, 900, 900, 900]),
			{ depuis: REFERENCE.depuis, phases: { 'integration:pr': 400 } },
			MAINTENANT
		);
		expect(lignes.find((l) => l.phase === 'integration:pr')).toMatchObject({
			nJour: 5,
			verdict: 'lent'
		});
	});

	it('montre une phase du Mac mini de moins de 20 s, mais pas de moins de 5 s', () => {
		const lignes = comparer(
			[
				...mesures('local:check-incremental', [18, 18, 19]),
				...mesures('local:pre-push', [3, 3, 4])
			],
			REFERENCE,
			MAINTENANT
		);
		expect(lignes.find((l) => l.phase === 'local:check-incremental')).toMatchObject({
			semaine: 18,
			verdict: 'sans-reference'
		});
		expect(lignes.find((l) => l.phase === 'local:pre-push')).toBeUndefined();
	});

	it('range la CI, puis les tests d’intégration, la mise en prod, le Mac mini', () => {
		const lignes = comparer(
			[
				...mesures('local:pre-push', [30]),
				...mesures('prod:vercel', [180]),
				...mesures('integration:pr', [400]),
				...mesures('integration:nuit', [420]),
				...mesures('job:Lint', [90])
			],
			{ depuis: REFERENCE.depuis, phases: {} },
			MAINTENANT
		);
		expect(lignes.map((l) => l.phase)).toEqual([
			'job:Lint',
			'integration:nuit',
			'integration:pr',
			'prod:vercel',
			'local:pre-push'
		]);
	});
});

describe('messageAlerte', () => {
	it('nomme chaque phase lente avec sa médiane, son nombre de mesures et sa référence', () => {
		const lignes = comparer(mesures('job:Lint', [400, 400, 400, 400, 400]), REFERENCE, MAINTENANT);
		expect(messageAlerte(lignes)).toBe(
			'Durées : Lint 6 min 40 de médiane sur 5 mesures, référence 1 min 30.'
		);
	});

	it('ne rend rien quand rien n’est lent', () => {
		expect(messageAlerte(comparer([], REFERENCE, MAINTENANT))).toBeNull();
	});
});

describe('lireArguments', () => {
	it('accepte les formes prévues', () => {
		expect(lireArguments([])).toEqual({ mode: 'tableau' });
		expect(lireArguments(['--releve'])).toEqual({ mode: 'releve', essai: false });
		expect(lireArguments(['--releve', '--essai'])).toEqual({ mode: 'releve', essai: true });
		expect(lireArguments(['--reference'])).toEqual({ mode: 'reference' });
		expect(lireArguments(['--reference', '--depuis', '2026-11-25'])).toEqual({
			mode: 'reference',
			depuis: '2026-11-25T00:00:00.000Z'
		});
	});

	it.each([
		[['--releves']],
		[['foo']],
		[['--essai']],
		[['--depuis', '2026-11-25']],
		[['--reference', '--depuis']],
		[['--reference', '--depuis', 'hier']],
		[['--reference', '--depuis', '2026-13-45']],
		[['--reference', '--releve']],
		[['--reference', '--essai']],
		[['--reference', '--depuis', '2026-11-25', 'foo']]
	])('refuse %j', (args) => {
		expect(lireArguments(args)).toBeNull();
	});
});

describe('lireReference', () => {
	it('rend la référence bien formée', () => {
		expect(lireReference(JSON.stringify(REFERENCE))).toEqual(REFERENCE);
	});

	it.each([
		['pas du JSON'],
		['{}'],
		[JSON.stringify({ depuis: 'hier', phases: {} })],
		[JSON.stringify({ depuis: REFERENCE.depuis })],
		[JSON.stringify({ depuis: REFERENCE.depuis, phases: { ci: '430' } })],
		[JSON.stringify({ depuis: REFERENCE.depuis, phases: { ci: -1 } })]
	])('refuse %s', (texte) => {
		expect(lireReference(texte)).toBeNull();
	});
});

describe('tableau', () => {
	it('écrit une ligne par phase, avec la référence, la journée et les 7 jours', () => {
		const texte = tableau(
			comparer(mesures('job:Lint', [400, 400, 400, 400, 400]), REFERENCE, MAINTENANT)
		);
		expect(texte).toContain('Lint');
		expect(texte).toContain('1 min 30');
		expect(texte).toContain('6 min 40 (5)');
		expect(texte).toContain('LENT');
		expect(texte).toContain('CI entière');
	});

	it('pr:merger et test:integration du Mac mini : « simple information », jamais « pas de référence »', () => {
		const texte = tableau(
			comparer(
				[
					...mesures('local:pr-merger', [480, 480]),
					...mesures('local:test-integration', [300]),
					...mesures('local:check-incremental', [18])
				],
				REFERENCE,
				MAINTENANT
			)
		);
		const ligne = (debut: string) => texte.split('\n').find((l) => l.includes(debut)) ?? '';
		expect(ligne('pr:merger')).toContain('simple information');
		expect(ligne('test:integration')).toContain('simple information');
		expect(ligne('check:incremental')).toContain('pas de référence');
	});
});

describe('nouvelleReference', () => {
	it('pr:merger et test:integration du Mac mini restent sans référence, même avec 5 mesures', () => {
		const { reference, gardees } = nouvelleReference(
			{ ...REFERENCE, phases: { ...REFERENCE.phases, 'local:pr-merger': 400 } },
			[
				...mesures('local:pr-merger', [480, 480, 480, 480, 480]),
				...mesures('local:test-integration', [300, 300, 300, 300, 300]),
				...mesures('local:pre-push', [9, 9, 9, 9, 9])
			],
			REFERENCE.depuis
		);
		expect(reference.phases['local:pr-merger']).toBeUndefined();
		expect(reference.phases['local:test-integration']).toBeUndefined();
		expect(reference.phases['local:pre-push']).toBe(9);
		expect(gardees).not.toContain('local:pr-merger');
	});

	it('une phase du Mac mini de moins de 20 s entre dans la référence, la suite de la nuit depuis sa propre date', () => {
		const { reference } = nouvelleReference(
			REFERENCE,
			[
				...mesures('local:check-incremental', [18, 18, 18, 18, 18], '2026-12-02T10:00:00Z'),
				...mesures('integration:nuit', [420, 420, 420, 420, 420], '2026-11-24T10:00:00Z')
			],
			'2026-12-01T00:00:00Z',
			REFERENCE.depuis
		);
		expect(reference.phases['local:check-incremental']).toBe(18);
		expect(reference.phases['integration:nuit']).toBe(420);
	});

	it('remplace la valeur des phases qui ont au moins 5 mesures, garde les autres', () => {
		const { reference, gardees } = nouvelleReference(
			REFERENCE,
			[...mesures('job:Lint', [60, 60, 60, 60, 60]), ...mesures('ci', [500, 500])],
			'2026-11-23T06:17:00Z'
		);
		expect(reference.phases['job:Lint']).toBe(60);
		expect(reference.phases.ci).toBe(430);
		expect(gardees).toContain('ci');
		expect(gardees).toContain('prod:vercel');
	});

	it('ajoute une phase nouvelle, sauf si elle dure moins de 20 s', () => {
		const { reference } = nouvelleReference(
			REFERENCE,
			[
				...mesures('job:Nouveau', [50, 50, 50, 50, 50]),
				...mesures('job:CI Summary', [4, 4, 4, 4, 4])
			],
			'2026-11-23T06:17:00Z'
		);
		expect(reference.phases['job:Nouveau']).toBe(50);
		expect(reference.phases['job:CI Summary']).toBeUndefined();
	});

	it('mise en prod : lit depuis sa propre date, plus ancienne que la fenêtre de la CI', () => {
		const prod = mesures('prod:vercel', [240, 240, 240, 240, 240], '2026-11-24T10:00:00Z');
		const sans = nouvelleReference(REFERENCE, prod, '2026-12-01T00:00:00Z');
		expect(sans.reference.phases['prod:vercel']).toBe(180);
		const avec = nouvelleReference(REFERENCE, prod, '2026-12-01T00:00:00Z', REFERENCE.depuis);
		expect(avec.reference.phases['prod:vercel']).toBe(240);
		expect(avec.reference.depuis).toBe('2026-12-01T00:00:00Z');
	});

	it('ne lit que les mesures faites depuis la date donnée, et la retient', () => {
		const { reference } = nouvelleReference(
			REFERENCE,
			[
				...mesures('job:Lint', [300, 300, 300, 300, 300], '2026-11-23T10:00:00Z'),
				...mesures('job:Lint', [60, 60, 60, 60, 60], '2026-11-25T10:00:00Z')
			],
			'2026-11-25T00:00:00Z'
		);
		expect(reference.phases['job:Lint']).toBe(60);
		expect(reference.depuis).toBe('2026-11-25T00:00:00Z');
	});
});
