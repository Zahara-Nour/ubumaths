/**
 * Constance Royale hebdomadaire — logique pure
 * =============================================
 *
 * Spécification validée par David le 2026-10-18 (docs/wip/palotin-boucle-progress.md, PR 4) :
 * semaine du lundi au dimanche (jour UTC) ; un jour travaillé = un jour où l'élève a gagné des
 * pansées ; semaine tenue au 3e jour travaillé ; Constance = semaines tenues d'affilée ; la
 * semaine en cours ne casse rien avant sa fin ; semaine finie sous 3 jours → 0.
 */
import { describe, it, expect } from 'vitest';
import {
	CONSTANCE_DAYS_PER_WEEK,
	applyWorkedDay,
	constanceReset,
	displayedConstance,
	displayedDaysThisWeek,
	weekStartOf,
	type ConstanceState
} from '../buddy-constance';
import { calculateConstanceBonus, XP_SOURCES } from '../buddy-xp';

// Constantes
/** Semaine du lundi 12 au dimanche 18 octobre 2026. */
const MONDAY = '2026-10-12';
const WEDNESDAY = '2026-10-14';
const SUNDAY = '2026-10-18';
const NEXT_MONDAY = '2026-10-19';

// Functions
function state(overrides: Partial<ConstanceState> = {}): ConstanceState {
	return {
		current_streak: 0,
		longest_streak: 0,
		last_activity_date: null,
		constance_week_start: MONDAY,
		constance_days_this_week: 0,
		...overrides
	};
}

/** Applique une suite de jours travaillés, comme la base les verrait l'un après l'autre. */
function workDays(start: ConstanceState, days: string[]): ConstanceState {
	let current = start;
	for (const day of days) {
		const step = applyWorkedDay(current, day);
		if (step) current = { ...current, ...step.patch };
	}
	return current;
}

describe('weekStartOf — semaine ISO, lundi, jour UTC', () => {
	it('un mercredi et un dimanche appartiennent à la semaine de leur lundi', () => {
		expect(weekStartOf(MONDAY)).toBe(MONDAY);
		expect(weekStartOf(WEDNESDAY)).toBe(MONDAY);
		expect(weekStartOf(SUNDAY)).toBe(MONDAY);
	});

	it('dimanche → lundi : le lundi ouvre une nouvelle semaine', () => {
		expect(weekStartOf(NEXT_MONDAY)).toBe(NEXT_MONDAY);
	});

	it('changement d’année : le 1er janvier 2026 (jeudi) est dans la semaine du lundi 29 décembre 2025', () => {
		expect(weekStartOf('2026-01-01')).toBe('2025-12-29');
		expect(weekStartOf('2026-01-04')).toBe('2025-12-29');
		expect(weekStartOf('2026-01-05')).toBe('2026-01-05');
	});
});

describe('applyWorkedDay — un jour travaillé', () => {
	it('le seuil est de 3 jours par semaine', () => {
		expect(CONSTANCE_DAYS_PER_WEEK).toBe(3);
	});

	it('1er jour de la semaine : compté, semaine pas encore tenue', () => {
		const step = applyWorkedDay(state({ constance_week_start: null }), MONDAY);
		expect(step?.patch).toEqual({
			constance_week_start: MONDAY,
			constance_days_this_week: 1,
			current_streak: 0,
			longest_streak: 0,
			last_activity_date: MONDAY
		});
		expect(step?.weekHeld).toBe(false);
	});

	it('3e jour travaillé : semaine tenue, Constance + 1, record suivi', () => {
		const start = state({ current_streak: 2, longest_streak: 2, constance_days_this_week: 2 });
		const step = applyWorkedDay({ ...start, last_activity_date: '2026-10-13' }, WEDNESDAY);
		expect(step?.weekHeld).toBe(true);
		expect(step?.patch.current_streak).toBe(3);
		expect(step?.patch.longest_streak).toBe(3);
		expect(step?.patch.constance_days_this_week).toBe(3);
	});

	it('3e jour le même jour que deux crédits : compté une seule fois, semaine tenue une seule fois', () => {
		const start = state({ constance_days_this_week: 2, last_activity_date: '2026-10-13' });
		const first = applyWorkedDay(start, WEDNESDAY);
		expect(first?.weekHeld).toBe(true);
		const after = { ...start, ...first?.patch };
		// Deuxième crédit du mercredi : le jour est déjà compté
		expect(applyWorkedDay(after, WEDNESDAY)).toBeNull();
	});

	it('4e jour : compté, mais la semaine n’est pas tenue une deuxième fois', () => {
		const start = state({
			current_streak: 1,
			longest_streak: 1,
			constance_days_this_week: 3,
			last_activity_date: WEDNESDAY
		});
		const step = applyWorkedDay(start, '2026-10-15');
		expect(step?.weekHeld).toBe(false);
		expect(step?.patch.current_streak).toBe(1);
		expect(step?.patch.constance_days_this_week).toBe(4);
	});

	it('dimanche → lundi après une semaine tenue : la Constance continue', () => {
		const held = state({
			current_streak: 5,
			longest_streak: 5,
			constance_days_this_week: 3,
			last_activity_date: SUNDAY
		});
		const step = applyWorkedDay(held, NEXT_MONDAY);
		expect(step?.patch).toMatchObject({
			constance_week_start: NEXT_MONDAY,
			constance_days_this_week: 1,
			current_streak: 5
		});
		expect(step?.weekHeld).toBe(false);
	});

	it('semaine précédente finie à 2 jours : la Constance retombe à 0, le record reste', () => {
		const missed = state({
			current_streak: 5,
			longest_streak: 7,
			constance_days_this_week: 2,
			last_activity_date: SUNDAY
		});
		const step = applyWorkedDay(missed, NEXT_MONDAY);
		expect(step?.patch.current_streak).toBe(0);
		expect(step?.patch.longest_streak).toBe(7);
		expect(step?.patch.constance_days_this_week).toBe(1);
	});

	it('semaine sautée : même tenue, la Constance retombe à 0', () => {
		const held = state({ current_streak: 4, longest_streak: 4, constance_days_this_week: 5 });
		// Rien la semaine du 19 octobre : retour le lundi 26
		const step = applyWorkedDay({ ...held, last_activity_date: SUNDAY }, '2026-10-26');
		expect(step?.patch.current_streak).toBe(0);
		expect(step?.patch.constance_week_start).toBe('2026-10-26');
	});

	it('changement d’année : du jeudi 1er janvier au dimanche 4, même semaine', () => {
		const end = workDays(state({ constance_week_start: null }), [
			'2025-12-29',
			'2026-01-01',
			'2026-01-04'
		]);
		expect(end.constance_week_start).toBe('2025-12-29');
		expect(end.constance_days_this_week).toBe(3);
		expect(end.current_streak).toBe(1);
	});

	it('ancienne série en jours (aucune semaine enregistrée) : repart de 0, record compris', () => {
		const legacy = state({
			current_streak: 12,
			longest_streak: 30,
			constance_week_start: null,
			constance_days_this_week: 0,
			last_activity_date: WEDNESDAY
		});
		// Le jour même du déploiement compte (l'ancienne série l'avait marqué, pas la Constance)
		const step = applyWorkedDay(legacy, WEDNESDAY);
		expect(step?.patch).toEqual({
			constance_week_start: MONDAY,
			constance_days_this_week: 1,
			current_streak: 0,
			longest_streak: 0,
			last_activity_date: WEDNESDAY
		});
	});
});

describe('constanceReset — au chargement du tableau de bord', () => {
	it('semaine en cours pas finie : rien ne casse', () => {
		const running = state({ current_streak: 3, longest_streak: 3, constance_days_this_week: 1 });
		expect(constanceReset(running, SUNDAY)).toBeNull();
	});

	it('semaine précédente tenue, semaine en cours pas encore commencée : rien ne casse', () => {
		const held = state({ current_streak: 3, longest_streak: 3, constance_days_this_week: 3 });
		expect(constanceReset(held, NEXT_MONDAY)).toBeNull();
	});

	it('semaine finie à 2 jours : Constance à 0, avec une réplique', () => {
		const missed = state({ current_streak: 3, longest_streak: 4, constance_days_this_week: 2 });
		expect(constanceReset(missed, NEXT_MONDAY)).toEqual({
			kind: 'lost',
			patch: { current_streak: 0 }
		});
	});

	it('semaine sautée après une semaine tenue : Constance à 0', () => {
		const held = state({ current_streak: 3, longest_streak: 3, constance_days_this_week: 4 });
		expect(constanceReset(held, '2026-10-26')?.kind).toBe('lost');
	});

	it('Constance déjà à 0 : rien à écrire', () => {
		expect(constanceReset(state({ constance_days_this_week: 1 }), '2026-10-26')).toBeNull();
	});

	it('ancienne série en jours : remise à 0 sans réplique (ce n’est pas une semaine manquée)', () => {
		const legacy = state({ current_streak: 6, longest_streak: 9, constance_week_start: null });
		expect(constanceReset(legacy, SUNDAY)).toEqual({
			kind: 'legacy',
			patch: { current_streak: 0, longest_streak: 0 }
		});
	});
});

describe('affichage — Constance et jours de la semaine', () => {
	it('jours de la semaine en cours ; 0 quand la semaine enregistrée est passée', () => {
		const s = state({ constance_days_this_week: 2 });
		expect(displayedDaysThisWeek(s, SUNDAY)).toBe(2);
		expect(displayedDaysThisWeek(s, NEXT_MONDAY)).toBe(0);
	});

	it('au-delà de 3 jours : « 3 sur 3 », la semaine est tenue', () => {
		expect(displayedDaysThisWeek(state({ constance_days_this_week: 5 }), SUNDAY)).toBe(3);
	});

	it('Constance perdue mais pas encore remise à 0 : affichée 0', () => {
		const missed = state({ current_streak: 3, constance_days_this_week: 2 });
		expect(displayedConstance(missed, SUNDAY)).toBe(3);
		expect(displayedConstance(missed, NEXT_MONDAY)).toBe(0);
	});
});

describe('calculateConstanceBonus — récompense d’une semaine tenue', () => {
	it('semaine tenue ordinaire : +30, dans le plafond du jour', () => {
		expect(XP_SOURCES.week_held).toBe(30);
		expect(calculateConstanceBonus(1)).toEqual({ xp: 30, isMilestone: false });
		expect(calculateConstanceBonus(5)).toEqual({ xp: 30, isMilestone: false });
	});

	it('paliers 4 / 8 / 16 semaines : +50 / +100 / +300, hors plafond', () => {
		expect(calculateConstanceBonus(4)).toEqual({ xp: 50, isMilestone: true });
		expect(calculateConstanceBonus(8)).toEqual({ xp: 100, isMilestone: true });
		expect(calculateConstanceBonus(16)).toEqual({ xp: 300, isMilestone: true });
	});

	it('les anciens bonus de série journalière ont disparu', () => {
		expect(XP_SOURCES).not.toHaveProperty('daily_streak');
		expect(XP_SOURCES).not.toHaveProperty('streak_7');
		expect(XP_SOURCES).not.toHaveProperty('streak_14');
		expect(XP_SOURCES).not.toHaveProperty('streak_30');
		expect(XP_SOURCES.first_of_day).toBe(5);
	});
});
