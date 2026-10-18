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
	// Lien sous la réplique : seulement pour l'annonce des Mathoux en sieste
	let currentLink = $state<{ href: string; label: string } | null>(null);
	let bubbleTimer: ReturnType<typeof setTimeout> | null = null;
	// Les Mathoux en sieste ont été annoncés : la salutation au hasard se tait
	let nappingAnnounced = false;
	let nappingTimer: ReturnType<typeof setTimeout> | null = null;

	// Status panel
	let showStatus = $state(false);

	// Idle timer
	let idleTimer: ReturnType<typeof setTimeout> | null = null;
	const IDLE_INTERVAL_MIN = 45_000; // 45s
	const IDLE_INTERVAL_MAX = 90_000; // 90s
	const BUBBLE_DURATION = 5_000; // 5s
	// Une réplique avec un lien reste plus longtemps : le temps de le suivre
	const LINK_BUBBLE_DURATION = 10_000;
	const CHATTERIE_HREF = '/dashboard/student/chatterie';

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

		// Auto-hide after duration
		if (bubbleTimer) clearTimeout(bubbleTimer);
		bubbleTimer = setTimeout(
			() => {
				bubbleVisible = false;
				currentExpression = 'neutral';
				currentLink = null;
			},
			link ? LINK_BUBBLE_DURATION : BUBBLE_DURATION
		);

		// Reset idle timer
		scheduleIdleMessage();
	}

	/**
	 * Le Palotin, gardien de la Chatterie : annonce les Mathoux en sieste.
	 *
	 * Demandé APRÈS l'affichage, une fois par montage du widget : le calcul de
	 * la collection (~6 requêtes) n'alourdit pas le layout de chaque page. Une
	 * réponse en échec ou inattendue ne fait rien dire au Palotin.
	 */
	async function announceNappingMathoux(delay: number) {
		let napping = 0;
		try {
			const response = await fetch('/api/student/mathoux');
			if (!response.ok) return;
			const parsed = mathouxSummarySchema.safeParse(await response.json());
			if (!parsed.success) return;
			napping = parsed.data.napping;
		} catch {
			return;
		}
		if (napping === 0) return;

		nappingAnnounced = true;
		nappingTimer = setTimeout(() => {
			if (!buddy) return;
			speak(`${nappingPhrase(napping)}.`, 'thinking', {
				href: CHATTERIE_HREF,
				label: 'Aller à la Chatterie'
			});
		}, delay);
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
		// Show onboarding or streak lost message on mount
		if (buddy) {
			if (streakLost) {
				setTimeout(() => showMessage('streak_lost'), 1000);
			} else {
				// Random chance of greeting on mount (sauf si les Mathoux en sieste sont annoncés)
				setTimeout(() => {
					if (!nappingAnnounced) showMessage('idle');
				}, 2000);
			}
			// La Constance perdue parle d'abord ; les Mathoux après sa bulle
			void announceNappingMathoux(streakLost ? 1000 + BUBBLE_DURATION : 500);
		}

		scheduleIdleMessage();

		return () => {
			if (bubbleTimer) clearTimeout(bubbleTimer);
			if (idleTimer) clearTimeout(idleTimer);
			if (nappingTimer) clearTimeout(nappingTimer);
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
