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

// Constantes
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
	equipped_skin_id: null
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
