/**
 * Apparition des Bêtes — phase 0 de l'étape 2 (docs/wip/navadra-progress.md),
 * validée par David le 2026-11-18.
 */

import { describe, expect, test } from 'vitest';
import {
	BIG_MAX_HP,
	chooseBeasts,
	ORDINARY_MAX_HP,
	spawnQuota,
	type LivingBeast,
	type SpawnCandidate,
	type SpawnState
} from '../spawn-logic';
import { BESTIARY } from '../bestiary';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date('2026-11-18T08:00:00Z');

function ago(ms: number): Date {
	return new Date(NOW.getTime() - ms);
}

function living(n: number, kind: LivingBeast['kind'] = 'ordinary'): LivingBeast[] {
	return Array.from({ length: n }, (_, i) => ({
		kind,
		beastKey: `nombrilie-${(i % 3) + 1}`,
		province: 'nombrilie' as const,
		pointId: `vivant-${kind}-${i}`
	}));
}

function state(partial: Partial<SpawnState>): SpawnState {
	return {
		now: NOW,
		living: [],
		lastOrdinaryAt: ago(1 * HOUR),
		lastBigAt: ago(1 * DAY),
		firstOrdinaryAt: ago(30 * DAY),
		...partial
	};
}

function quotaOf(ordinary: number, big: boolean) {
	return { ordinary, big, ordinaryAppearedAt: Array.from({ length: ordinary }, () => NOW) };
}

/** Tirage déterministe : toujours le premier élément. */
const first = () => 0;

describe('spawnQuota — combien de Bêtes', () => {
	test('première visite : 3 Bêtes ordinaires, pas de grosse Bête', () => {
		expect(
			spawnQuota(state({ lastOrdinaryAt: null, lastBigAt: null, firstOrdinaryAt: null }))
		).toMatchObject({ ordinary: 3, big: false });
	});

	test('première grosse Bête : 7 jours après l’arrivée (sa toute première Bête)', () => {
		const arrived = (ms: number) =>
			state({ lastOrdinaryAt: ago(1 * HOUR), lastBigAt: null, firstOrdinaryAt: ago(ms) });
		expect(spawnQuota(arrived(7 * DAY - 60_000)).big).toBe(false);
		expect(spawnQuota(arrived(7 * DAY)).big).toBe(true);
	});

	test('exemple de la phase 0 : 2 jours d’absence, 2 Bêtes en attente → 3 de plus, pour 5', () => {
		const quota = spawnQuota(state({ living: living(2), lastOrdinaryAt: ago(2 * DAY) }));
		expect(quota.ordinary).toBe(3);
	});

	test('une Bête toutes les 8 heures : 7 h 59 → 0, 8 h → 1, 16 h → 2', () => {
		expect(spawnQuota(state({ lastOrdinaryAt: ago(8 * HOUR - 60_000) })).ordinary).toBe(0);
		expect(spawnQuota(state({ lastOrdinaryAt: ago(8 * HOUR) })).ordinary).toBe(1);
		expect(spawnQuota(state({ lastOrdinaryAt: ago(16 * HOUR) })).ordinary).toBe(2);
	});

	test('rattrapage sans perte du reste : une visite toutes les 12 heures donne 3 Bêtes par jour', () => {
		let last = ago(5 * DAY);
		let total = 0;
		// Quatre visites espacées de 12 heures (2 jours), à partir de NOW
		for (let visit = 0; visit < 4; visit++) {
			const now = new Date(NOW.getTime() + visit * 12 * HOUR);
			if (visit === 0) last = new Date(now.getTime() - 12 * HOUR);
			const quota = spawnQuota(state({ now, lastOrdinaryAt: last }));
			total += quota.ordinary;
			if (quota.ordinary > 0) last = quota.ordinaryAppearedAt[quota.ordinary - 1];
		}
		expect(total).toBe(6);
	});

	test('la k-ième Bête due est datée de la dernière apparition + k × 8 h', () => {
		const quota = spawnQuota(state({ lastOrdinaryAt: ago(20 * HOUR) }));
		expect(quota.ordinaryAppearedAt).toEqual([ago(12 * HOUR), ago(4 * HOUR)]);
	});

	test('carte pleine au-delà des places : le dû en trop est perdu, datées de maintenant', () => {
		const quota = spawnQuota(state({ living: living(3), lastOrdinaryAt: ago(5 * DAY) }));
		expect(quota.ordinary).toBe(2);
		expect(quota.ordinaryAppearedAt).toEqual([NOW, NOW]);
	});

	test('première visite : datées de maintenant', () => {
		expect(spawnQuota(state({ lastOrdinaryAt: null })).ordinaryAppearedAt).toEqual([NOW, NOW, NOW]);
	});

	test('carte pleine (5 ordinaires) : rien de plus, même après un mois d’absence', () => {
		expect(spawnQuota(state({ living: living(5), lastOrdinaryAt: ago(30 * DAY) })).ordinary).toBe(
			0
		);
	});

	test('les 5 se comptent en Bêtes ordinaires : grosse Bête et tutoriel n’en prennent pas', () => {
		const quota = spawnQuota(
			state({
				living: [...living(4), ...living(1, 'big'), ...living(1, 'tutorial')],
				lastOrdinaryAt: ago(3 * DAY)
			})
		);
		expect(quota.ordinary).toBe(1);
	});

	test('grosse Bête : tous les 7 jours, jamais deux à la fois', () => {
		expect(spawnQuota(state({ lastBigAt: ago(7 * DAY - 60_000) })).big).toBe(false);
		expect(spawnQuota(state({ lastBigAt: ago(7 * DAY) })).big).toBe(true);
		expect(spawnQuota(state({ lastBigAt: ago(30 * DAY), living: living(1, 'big') })).big).toBe(
			false
		);
	});
});

describe('chooseBeasts — d’où naissent les Bêtes', () => {
	const remediation: SpawnCandidate = {
		pointId: 'p-rem',
		province: 'bedonstan',
		tier: 'remediation'
	};
	const notAcquired: SpawnCandidate[] = [
		{ pointId: 'p-na-1', province: 'nombrilie', tier: 'not_acquired' },
		{ pointId: 'p-na-2', province: 'yoyolande', tier: 'not_acquired' }
	];
	const review: SpawnCandidate = { pointId: 'p-rev', province: 'patatovie', tier: 'review' };
	const all = [review, ...notAcquired, remediation];

	test('priorité : à remédier, puis non acquis du niveau, puis à revoir', () => {
		const created = chooseBeasts(quotaOf(4, false), all, { now: NOW, living: [] }, first);
		expect(created.map((b) => b.pointId)).toEqual(['p-rem', 'p-na-1', 'p-na-2', 'p-rev']);
	});

	test('jamais deux Bêtes vivantes sur le même point', () => {
		const onMap: LivingBeast = {
			kind: 'ordinary',
			beastKey: 'bedonstan-1',
			province: 'bedonstan',
			pointId: 'p-rem'
		};
		const created = chooseBeasts(quotaOf(5, false), all, { now: NOW, living: [onMap] }, first);
		expect(created.map((b) => b.pointId)).not.toContain('p-rem');
		expect(new Set(created.map((b) => b.pointId)).size).toBe(created.length);
	});

	test('dans un même rang, une Province absente de la carte passe d’abord', () => {
		const onMap = living(1); // une Bête de Nombrilie
		const created = chooseBeasts(
			quotaOf(1, false),
			notAcquired,
			{ now: NOW, living: onMap },
			first
		);
		expect(created[0].province).toBe('yoyolande');
	});

	test('moins de points jouables que de places : moins de Bêtes ; aucun : aucune', () => {
		expect(
			chooseBeasts(quotaOf(5, false), notAcquired, { now: NOW, living: [] }, first)
		).toHaveLength(2);
		expect(chooseBeasts(quotaOf(3, true), [], { now: NOW, living: [] }, first)).toEqual([]);
	});

	test('départ : 3 jours pour une ordinaire, jamais pour un point à remédier', () => {
		const created = chooseBeasts(
			quotaOf(2, false),
			[remediation, notAcquired[0]],
			{ now: NOW, living: [] },
			first
		);
		expect(created[0]).toMatchObject({ pointId: 'p-rem', leavesAt: null, maxHp: ORDINARY_MAX_HP });
		expect(created[1].leavesAt).toEqual(new Date(NOW.getTime() + 3 * DAY));
	});

	test('grosse Bête : la première servie (point le plus prioritaire), 7 jours, même à remédier', () => {
		const created = chooseBeasts(quotaOf(1, true), all, { now: NOW, living: [] }, first);
		expect(created[0]).toMatchObject({
			kind: 'big',
			pointId: 'p-rem',
			maxHp: BIG_MAX_HP,
			leavesAt: new Date(NOW.getTime() + 7 * DAY)
		});
		expect(created[1]).toMatchObject({ kind: 'ordinary', pointId: 'p-na-1' });
	});

	test('le tutoriel ne compte pour rien : sa Province reste « absente »', () => {
		const tutorial: LivingBeast = {
			kind: 'tutorial',
			beastKey: 'nombrilie-1',
			province: 'nombrilie',
			pointId: null
		};
		const created = chooseBeasts(
			quotaOf(1, false),
			notAcquired,
			{ now: NOW, living: [tutorial] },
			first
		);
		expect(created[0]).toMatchObject({ province: 'nombrilie', beastKey: 'nombrilie-1' });
	});

	test('la Bête vient du bestiaire de sa Province, de préférence pas déjà sur la carte', () => {
		const onMap = living(1); // nombrilie-1
		const created = chooseBeasts(
			quotaOf(1, false),
			[{ pointId: 'p-x', province: 'nombrilie', tier: 'review' }],
			{ now: NOW, living: onMap },
			first
		);
		expect(created[0].beastKey).toBe('nombrilie-2');
		expect(BESTIARY.nombrilie.map((e) => e.key)).toContain(created[0].beastKey);
	});
});

describe('bestiaire provisoire', () => {
	test('trois Bêtes par Province, clés valides pour la base, toutes distinctes', () => {
		const keys = Object.values(BESTIARY).flatMap((entries) => entries.map((e) => e.key));
		expect(Object.keys(BESTIARY)).toHaveLength(6);
		expect(keys).toHaveLength(18);
		expect(new Set(keys).size).toBe(18);
		for (const key of keys) {
			expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
			expect(key.length).toBeLessThanOrEqual(40);
		}
	});
});
