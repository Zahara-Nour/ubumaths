<!--
	BuddyWidget
	=============
	The always-visible Palotin companion.
	Fixed position bottom-right, above BugReportFAB.
	Shows speech bubbles and status panel on click.
-->

<script lang="ts">
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import type { BuddyMessageContext } from '$lib/config/buddy-messages';
	import type { BuddyExpression } from '$lib/types/buddy';
	import { buddyMessageEngine } from './buddy-message-engine';
	import BuddyAvatar from './BuddyAvatar.svelte';
	import BuddySpeechBubble from './BuddySpeechBubble.svelte';
	import BuddyStatusPanel from './BuddyStatusPanel.svelte';
	import { onMount } from 'svelte';
	import { displayedConstance, utcDay } from '$lib/utils/buddy-constance';
	import { nappingPhrase } from '$lib/mathoux/collection-logic';
	import { mathouxSummarySchema } from '$lib/mathoux/summary';
	import { newsSummaryPhrase } from '$lib/mathoux/news';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { BUBBLE_DURATION, GREETING_DELAY, LINK_BUBBLE_DURATION } from './buddy-timing';

	interface Props {
		streakLost?: boolean;
		onChangePalotin?: () => void;
	}

	let { streakLost = false, onChangePalotin }: Props = $props();

	const buddy = $derived(studentCache.getBuddySync());
	// Constance Royale (semaines tenues d'affilée), 0 si elle est perdue
	const constanceWeeks = $derived(buddy ? displayedConstance(buddy, utcDay()) : 0);

	// Speech bubble state
	let currentMessage = $state('');
	let bubbleVisible = $state(false);
	let currentExpression = $state<BuddyExpression>('neutral');
	// Lien sous la réplique : seulement pour les annonces de la Chatterie (nouveautés, sieste)
	let currentLink = $state<{ href: string; label: string } | null>(null);
	let bubbleTimer: ReturnType<typeof setTimeout> | null = null;
	let greetingTimer: ReturnType<typeof setTimeout> | null = null;
	let nappingTimer: ReturnType<typeof setTimeout> | null = null;

	// Status panel
	let showStatus = $state(false);

	// Idle timer
	let idleTimer: ReturnType<typeof setTimeout> | null = null;
	const IDLE_INTERVAL_MIN = 45_000; // 45s
	const IDLE_INTERVAL_MAX = 90_000; // 90s
	const CHATTERIE_HREF = resolve('/dashboard/student/chatterie');

	/**
	 * Show a message in the speech bubble.
	 * Can be called externally via bind:this.
	 */
	export function showMessage(context: BuddyMessageContext, level?: number) {
		if (!buddy) return;

		let message: string | null;
		if (context === 'level_up' && level !== undefined) {
			message = buddyMessageEngine.getLevelUpMessage(buddy.palotin_type, level);
		} else {
			message = buddyMessageEngine.getMessage(buddy.palotin_type, context);
		}

		if (!message) return;

		speak(message, buddyMessageEngine.getExpression(context), null);
	}

	/** Affiche une réplique, avec un lien éventuel, puis la masque. */
	function speak(
		message: string,
		expression: BuddyExpression,
		link: { href: string; label: string } | null
	) {
		currentMessage = message;
		currentExpression = expression;
		currentLink = link;
		bubbleVisible = true;

		// Masquage automatique après la durée de la bulle
		if (bubbleTimer) clearTimeout(bubbleTimer);
		bubbleTimer = setTimeout(
			() => {
				bubbleVisible = false;
				currentExpression = 'neutral';
				currentLink = null;
			},
			link ? LINK_BUBBLE_DURATION : BUBBLE_DURATION
		);

		// Relance le minuteur de la réplique au hasard
		scheduleIdleMessage();
	}

	/**
	 * Ce que le Palotin a à dire de la Chatterie : les nouveautés d'abord
	 * (naissance, croissance, étoile : celles qu'aucun écran de fin de séance
	 * n'a montrées, après une évaluation par exemple), sinon les Mathoux en
	 * sieste ; `null` si rien, ou si la réponse est en échec ou inattendue.
	 *
	 * Demandé APRÈS l'affichage, une fois par montage du widget : le calcul de
	 * la collection n'alourdit pas le layout de chaque page.
	 */
	async function fetchChatterieAnnouncement(): Promise<{
		message: string;
		expression: BuddyExpression;
	} | null> {
		try {
			const response = await fetch('/api/student/mathoux');
			if (!response.ok) return null;
			const parsed = mathouxSummarySchema.safeParse(await response.json());
			if (!parsed.success) return null;
			const news = newsSummaryPhrase(parsed.data.news);
			if (news) return { message: news, expression: 'happy' };
			const { napping } = parsed.data;
			return napping > 0 ? { message: `${nappingPhrase(napping)}.`, expression: 'thinking' } : null;
		} catch {
			return null;
		}
	}

	/**
	 * Le Palotin, gardien de la Chatterie : annonce les nouveautés ou les
	 * Mathoux en sieste, sinon salue. La salutation attend la réponse : arrivée
	 * tard, l'annonce aurait sinon été précédée d'une salutation qu'elle aurait
	 * coupée.
	 */
	async function greetOrAnnounceChatterie(mountedAt: number, afterStreakLost: boolean) {
		const announcement = await fetchChatterieAnnouncement();
		if (!buddy) return;
		// Après une Constance perdue, sa bulle passe d'abord, et pas de salutation
		const minDelay = afterStreakLost ? 1000 + BUBBLE_DURATION : GREETING_DELAY;
		const wait = Math.max(0, minDelay - (Date.now() - mountedAt));
		if (!announcement) {
			if (afterStreakLost) return;
			greetingTimer = setTimeout(() => showMessage('idle'), wait);
			return;
		}
		nappingTimer = setTimeout(() => {
			speak(announcement.message, announcement.expression, {
				href: CHATTERIE_HREF,
				label: 'Aller à la Chatterie'
			});
		}, wait);
	}

	/** Sur la Chatterie elle-même, l'annonce n'a pas lieu d'être (et la page a déjà calculé). */
	function isOnChatterie(): boolean {
		return page.url.pathname.startsWith(CHATTERIE_HREF);
	}

	function scheduleIdleMessage() {
		if (idleTimer) clearTimeout(idleTimer);
		const delay = IDLE_INTERVAL_MIN + Math.random() * (IDLE_INTERVAL_MAX - IDLE_INTERVAL_MIN);
		idleTimer = setTimeout(() => {
			if (!buddy) return;
			// Randomly pick between idle and idle_lore (20% chance for lore if level >= 5)
			const context: BuddyMessageContext =
				buddy.level >= 5 && Math.random() < 0.2 ? 'idle_lore' : 'idle';
			showMessage(context);
		}, delay);
	}

	function handleClick() {
		if (showStatus) {
			showStatus = false;
		} else {
			showStatus = true;
			bubbleVisible = false;
		}
	}

	function handleChangePalotin() {
		showStatus = false;
		onChangePalotin?.();
	}

	onMount(() => {
		// Au montage : la Constance perdue, puis les nouveautés ou les Mathoux en sieste, sinon une salutation
		if (buddy) {
			if (streakLost) setTimeout(() => showMessage('streak_lost'), 1000);
			if (!isOnChatterie()) {
				void greetOrAnnounceChatterie(Date.now(), streakLost);
			} else if (!streakLost) {
				greetingTimer = setTimeout(() => showMessage('idle'), GREETING_DELAY);
			}
		}

		scheduleIdleMessage();

		return () => {
			if (bubbleTimer) clearTimeout(bubbleTimer);
			if (idleTimer) clearTimeout(idleTimer);
			if (nappingTimer) clearTimeout(nappingTimer);
			if (greetingTimer) clearTimeout(greetingTimer);
		};
	});
</script>

{#if buddy}
	<div class="fixed right-6 bottom-20 z-40">
		<!-- Speech bubble -->
		<BuddySpeechBubble
			message={currentMessage}
			visible={bubbleVisible && !showStatus}
			link={currentLink}
		/>

		<!-- Status panel -->
		{#if showStatus}
			<BuddyStatusPanel
				{buddy}
				onClose={() => (showStatus = false)}
				onChangePalotin={handleChangePalotin}
			/>
		{/if}

		<!-- Avatar (clickable) -->
		<button
			type="button"
			onclick={handleClick}
			class="block cursor-pointer rounded-full shadow-lg ring-2 ring-background transition-transform hover:scale-105 active:scale-95"
			aria-label="Mon Palotin {buddy.palotin_type}"
		>
			<BuddyAvatar palotin={buddy.palotin_type} expression={currentExpression} />
		</button>

		<!-- Badge de la Constance Royale -->
		{#if constanceWeeks > 0}
			<div
				class="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow"
			>
				{constanceWeeks}
			</div>
		{/if}
	</div>
{/if}
