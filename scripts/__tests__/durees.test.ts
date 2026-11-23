/**
 * `pnpm durees` — durées de la CI, des PR et de la mise en prod
 * =============================================================
 *
 * Gardé ici (scripts/durees/logique.ts) :
 * - une exécution de CI ne donne des mesures que si elle est complète : un seul
 *   job sauté (PR de contenu) et rien n'est compté, sinon la médiane baisserait ;
 * - un job rouge ou annulé n'est pas une mesure ; la durée de la CI entière ne
 *   vaut que pour une première tentative verte ;
 * - « ouverture → merge » ne compte que les PR mergées sur un seul push ;
 * - alerte : médiane d'au moins 1,5 fois la référence ET au moins 5 mesures ;
 *   une seule PR lente ne déclenche rien ;
 * - mise en prod : les 5 dernières, et seulement s'il y en a eu une dans la journée ;
 * - la référence ne bouge que par `nouvelleReference` : au moins 5 mesures par
 *   phase, sinon l'ancienne valeur reste.
 */

import { describe, it, expect } from 'vitest';
import {
	comparer,
	formaterDuree,
	lireJournalProd,
	mediane,
	mesuresDeLaPr,
	mesuresDuRun,
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
			{ phase: 'pr', secondes: 470, date: '2026-11-23T09:59:50Z' }
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
});

describe('nouvelleReference', () => {
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
