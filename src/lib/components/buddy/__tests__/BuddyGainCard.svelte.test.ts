/**
 * Gain du Palotin en fin de séance
 * ================================
 *
 * Ce que l'élève LIT : combien son Palotin a gagné (en pansées, jamais « XP »),
 * sa réplique, la montée de tour de panse, le plafond du jour — et rien du
 * tout quand la réponse du serveur ne porte aucun gain. Le widget est mis à
 * jour sans recharger (cache du tableau de bord).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BuddyGainCard from '../BuddyGainCard.svelte';
import BuddyStatusPanel from '../BuddyStatusPanel.svelte';
import { parseBuddyGain, receiveBuddyGain, toBuddyGainView } from '../buddy-gain';
import { buddyMessages } from '$lib/config/buddy-messages';
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
import type { BuddyState } from '$lib/types/buddy';
import { utcDay, weekStartOf } from '$lib/utils/buddy-constance';

// Constantes
/** Lundi de la semaine en cours (UTC) et celui d'il y a deux semaines. */
const THIS_WEEK = weekStartOf(utcDay());
const TWO_WEEKS_AGO = utcDay(new Date(Date.parse(`${THIS_WEEK}T00:00:00Z`) - 14 * 86_400_000));
const texte = (container: HTMLElement) => container.textContent!.replace(/\s+/g, ' ').trim();

const buddy: BuddyState = {
	student_id: '00000000-0000-4000-8000-000000000001',
	palotin_type: 'pile',
	xp: 100,
	level: 3,
	current_streak: 2,
	longest_streak: 5,
	last_activity_date: null,
	xp_earned_today: 10,
	last_xp_date: null,
	themes_explored: [],
	change_count: 0,
	equipped_skin_id: null,
	constance_week_start: THIS_WEEK,
	constance_days_this_week: 1
};

/** Réponse de `POST /api/tests/save` portant un gain. */
function saveResponse(
	xpResult: Partial<{
		xp_gained: number;
		new_level: number;
		leveled_up: boolean;
		daily_cap_reached: boolean;
	}> = {}
) {
	return {
		sessionId: 's1',
		buddy_xp: {
			xpResult: {
				xp_gained: 12,
				new_xp: 112,
				new_level: 3,
				leveled_up: false,
				daily_cap_reached: false,
				...xpResult
			},
			streakUpdated: false,
			newStreak: 2,
			streakBonusXp: 0,
			isNewTheme: false
		}
	};
}

function viewOf(payload: unknown) {
	const gain = parseBuddyGain(payload);
	return gain ? toBuddyGainView(gain, 'giron') : null;
}

afterEach(() => {
	studentCache.hydrateBuddy(null);
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('BuddyGainCard — ce que l’élève lit', () => {
	it('gain nominal : le Palotin, le nombre de pansées et une réplique de son répertoire', async () => {
		const gain = viewOf(saveResponse());
		const { container } = await render(BuddyGainCard, { gain });
		const shown = texte(container);
		expect(shown).toContain('Giron a gagné 12 pansées');
		expect(shown).not.toContain('XP');
		expect(shown).not.toContain('Niveau');
		const replique = buddyMessages.giron.session_gain.find((m) => shown.includes(m));
		expect(replique).toBeDefined();
	});

	it('une seule pansée : au singulier', async () => {
		const { container } = await render(BuddyGainCard, {
			gain: viewOf(saveResponse({ xp_gained: 1 }))
		});
		expect(texte(container)).toContain('Giron a gagné 1 pansée');
		expect(texte(container)).not.toContain('1 pansées');
	});

	it('montée de tour de panse : annoncée, avec la réplique du nouveau tour', async () => {
		const { container } = await render(BuddyGainCard, {
			gain: viewOf(saveResponse({ leveled_up: true, new_level: 4 }))
		});
		const shown = texte(container);
		expect(shown).toContain('Nouveau tour de panse : 4 !');
		expect(shown).toContain('Tour de panse 4 ! Ça accélère !');
		expect(shown).not.toContain('Niveau');
	});

	it('plafond du jour atteint : dit gentiment', async () => {
		const { container } = await render(BuddyGainCard, {
			gain: viewOf(saveResponse({ daily_cap_reached: true }))
		});
		const shown = texte(container);
		expect(shown).toContain('Sa panse est pleine pour aujourd’hui');
		expect(buddyMessages.giron.daily_cap.some((m) => shown.includes(m))).toBe(true);
	});

	it('plafond DÉJÀ atteint (0 pansée gagnée) : panse pleine, sans « a gagné 0 »', async () => {
		const { container } = await render(BuddyGainCard, {
			gain: viewOf(saveResponse({ xp_gained: 0, daily_cap_reached: true }))
		});
		const shown = texte(container);
		expect(shown).toContain('Sa panse est pleine pour aujourd’hui');
		expect(buddyMessages.giron.daily_cap.some((m) => shown.includes(m))).toBe(true);
		expect(shown).not.toContain('a gagné');
		expect(shown).not.toContain('0 pansée');
	});

	it('sans plafond : pas de mention de panse pleine', async () => {
		const { container } = await render(BuddyGainCard, { gain: viewOf(saveResponse()) });
		expect(texte(container)).not.toContain('panse est pleine');
	});

	it('buddy_xp null : rien n’est affiché', async () => {
		const gain = viewOf({ sessionId: 's1', buddy_xp: null });
		expect(gain).toBeNull();
		const { container } = await render(BuddyGainCard, { gain });
		expect(texte(container)).toBe('');
	});

	it('xp_gained = 0 : rien n’est affiché', async () => {
		expect(viewOf(saveResponse({ xp_gained: 0 }))).toBeNull();
		// Même si une vue à zéro arrivait jusqu'au composant
		const { container } = await render(BuddyGainCard, {
			gain: { ...toBuddyGainView(parseBuddyGain(saveResponse())!, 'giron'), xpGained: 0 }
		});
		expect(texte(container)).toBe('');
	});

	it('champ absent ou mal formé (réponse de révision sans gain) : aucun gain, sans erreur', () => {
		expect(parseBuddyGain({ success: true })).toBeNull();
		expect(parseBuddyGain(null)).toBeNull();
		expect(parseBuddyGain({ buddy_xp: { xpResult: { xp_gained: 'beaucoup' } } })).toBeNull();
	});
});

describe('receiveBuddyGain — widget à jour sans recharger', () => {
	it('cache présent : gain ajouté au Palotin du widget, avec son tour de panse', async () => {
		studentCache.hydrateBuddy({ ...buddy });
		const view = await receiveBuddyGain(saveResponse({ leveled_up: true, new_level: 4 }));
		expect(view?.palotin).toBe('pile');
		expect(view?.expression).toBe('excited');
		const updated = studentCache.getBuddySync();
		expect(updated?.xp).toBe(112);
		expect(updated?.xp_earned_today).toBe(22);
		expect(updated?.level).toBe(4);
	});

	it('cache absent : le Palotin est relu (gain déjà inclus, jamais compté deux fois)', async () => {
		const fetchMock = vi.fn(
			async () => new Response(JSON.stringify({ buddy: { ...buddy, xp: 112 } }), { status: 200 })
		);
		vi.stubGlobal('fetch', fetchMock);
		const view = await receiveBuddyGain(saveResponse());
		expect(fetchMock).toHaveBeenCalledWith('/api/student/buddy');
		expect(view?.palotin).toBe('pile');
		expect(view?.expression).toBe('happy');
		expect(studentCache.getBuddySync()?.xp).toBe(112);
	});

	it('panne du cache : jamais d’exception (la séance est déjà enregistrée)', async () => {
		studentCache.hydrateBuddy({ ...buddy });
		vi.spyOn(studentCache, 'updateBuddyXpOptimistic').mockImplementation(() => {
			throw new Error('cache en panne');
		});
		await expect(receiveBuddyGain(saveResponse())).resolves.toBeNull();
	});

	it('plafond déjà atteint : le widget n’est pas touché', async () => {
		studentCache.hydrateBuddy({ ...buddy });
		const view = await receiveBuddyGain(saveResponse({ xp_gained: 0, daily_cap_reached: true }));
		expect(view?.dailyCapReached).toBe(true);
		expect(studentCache.getBuddySync()?.xp).toBe(100);
	});

	it('pas de gain : ni relecture ni mise à jour', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		studentCache.hydrateBuddy({ ...buddy });
		expect(await receiveBuddyGain({ sessionId: 's1', buddy_xp: null })).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(studentCache.getBuddySync()?.xp).toBe(100);
	});
});

describe('BuddyStatusPanel — mots du lore', () => {
	it('tour de panse et pansées, jamais « Niveau » ni « XP »', async () => {
		const { container } = await render(BuddyStatusPanel, {
			buddy,
			onClose: () => {},
			onChangePalotin: () => {}
		});
		const shown = texte(container);
		expect(shown).toContain('Tour de panse 3');
		expect(shown).toMatch(/\d+ \/ \d+ pansées/);
		expect(shown).not.toContain('XP');
		expect(shown).not.toContain('Niveau');
	});
});

describe('BuddyStatusPanel — Constance Royale en semaines', () => {
	async function shownFor(overrides: Partial<BuddyState>) {
		const { container } = await render(BuddyStatusPanel, {
			buddy: { ...buddy, ...overrides },
			onClose: () => {},
			onChangePalotin: () => {}
		});
		return texte(container);
	}

	it('Constance, jours de la semaine en cours et record, en semaines', async () => {
		const shown = await shownFor({
			current_streak: 3,
			longest_streak: 5,
			constance_days_this_week: 2
		});
		expect(shown).toContain('Constance Royale : 3 semaines');
		expect(shown).toContain('Cette semaine : 2 jours sur 3');
		expect(shown).toContain('Record : 5 semaines');
		expect(shown).not.toContain('jour de suite');
		expect(shown).not.toMatch(/Serie|Série/);
	});

	it('singulier : 1 semaine, 1 jour sur 3', async () => {
		const shown = await shownFor({
			current_streak: 1,
			longest_streak: 1,
			constance_days_this_week: 1
		});
		expect(shown).toContain('Constance Royale : 1 semaine');
		expect(shown).toContain('Cette semaine : 1 jour sur 3');
		expect(shown).toContain('Record : 1 semaine');
	});

	it('semaine tenue au-delà de 3 jours : « 3 jours sur 3 »', async () => {
		expect(await shownFor({ constance_days_this_week: 5 })).toContain(
			'Cette semaine : 3 jours sur 3'
		);
	});

	it('dernière semaine enregistrée il y a deux semaines : Constance 0, 0 jour cette semaine', async () => {
		const shown = await shownFor({
			current_streak: 4,
			constance_week_start: TWO_WEEKS_AGO,
			constance_days_this_week: 3
		});
		expect(shown).toContain('Constance Royale : 0 semaine');
		expect(shown).toContain('Cette semaine : 0 jour sur 3');
	});
});

describe('receiveBuddyGain — Constance Royale à jour sans recharger', () => {
	it('jour compté : Constance et jours de la semaine mis à jour dans le widget', async () => {
		studentCache.hydrateBuddy({ ...buddy, current_streak: 2, constance_days_this_week: 2 });
		const payload = saveResponse();
		await receiveBuddyGain({
			...payload,
			buddy_xp: {
				...payload.buddy_xp,
				streakUpdated: true,
				newStreak: 3,
				streakBonusXp: 30,
				constanceWeekStart: THIS_WEEK,
				constanceDaysThisWeek: 3
			}
		});
		const updated = studentCache.getBuddySync();
		expect(updated?.current_streak).toBe(3);
		expect(updated?.constance_week_start).toBe(THIS_WEEK);
		expect(updated?.constance_days_this_week).toBe(3);
	});

	it('jour non compté : la Constance du widget ne bouge pas', async () => {
		studentCache.hydrateBuddy({ ...buddy, current_streak: 2, constance_days_this_week: 2 });
		await receiveBuddyGain(saveResponse());
		const updated = studentCache.getBuddySync();
		expect(updated?.current_streak).toBe(2);
		expect(updated?.constance_days_this_week).toBe(2);
	});
});

describe('répliques de Constance perdue — en semaines', () => {
	it('chaque Palotin parle de la semaine manquée, jamais d’une série de jours', () => {
		for (const palotin of ['giron', 'pile', 'cotice'] as const) {
			const lines = buddyMessages[palotin].streak_lost;
			expect(lines.length).toBeGreaterThan(0);
			for (const line of lines) expect(line).toMatch(/semaine|Constance/i);
		}
	});
});
