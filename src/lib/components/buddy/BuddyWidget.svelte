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
	let bubbleTimer: ReturnType<typeof setTimeout> | null = null;

	// Status panel
	let showStatus = $state(false);

	// Idle timer
	let idleTimer: ReturnType<typeof setTimeout> | null = null;
	const IDLE_INTERVAL_MIN = 45_000; // 45s
	const IDLE_INTERVAL_MAX = 90_000; // 90s
	const BUBBLE_DURATION = 5_000; // 5s

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

		currentMessage = message;
		currentExpression = buddyMessageEngine.getExpression(context);
		bubbleVisible = true;

		// Auto-hide after duration
		if (bubbleTimer) clearTimeout(bubbleTimer);
		bubbleTimer = setTimeout(() => {
			bubbleVisible = false;
			currentExpression = 'neutral';
		}, BUBBLE_DURATION);

		// Reset idle timer
		scheduleIdleMessage();
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
				// Random chance of greeting on mount
				setTimeout(() => showMessage('idle'), 2000);
			}
		}

		scheduleIdleMessage();

		return () => {
			if (bubbleTimer) clearTimeout(bubbleTimer);
			if (idleTimer) clearTimeout(idleTimer);
		};
	});
</script>

{#if buddy}
	<div class="fixed right-6 bottom-20 z-40">
		<!-- Speech bubble -->
		<BuddySpeechBubble message={currentMessage} visible={bubbleVisible && !showStatus} />

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
