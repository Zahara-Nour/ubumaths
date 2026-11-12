<!--
	BuddyWidget
	=============
	Le Palotin chez lui : accueil élève et Chatterie, sa « maison » (chantier
	`palotins`, docs/wip/palotins-progress.md). Ailleurs, `PalotinPresence`
	montre l'écusson et les passages. Monté par `PalotinPresence`.
	Fixed position bottom-right, above BugReportFAB.
	Shows speech bubbles and status panel on click.
-->

<script lang="ts">
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import type { BuddyMessageContext } from '$lib/config/buddy-messages';
	import type { BuddyExpression, BuddyState, WeekMoment } from '$lib/types/buddy';
	import { buddyMessageEngine } from './buddy-message-engine';
	import BuddyAvatar from './BuddyAvatar.svelte';
	import BuddySpeechBubble from './BuddySpeechBubble.svelte';
	import BuddyStatusPanel from './BuddyStatusPanel.svelte';
	import { onMount, untrack } from 'svelte';
	import { displayedConstance, utcDay } from '$lib/utils/buddy-constance';
	import { page } from '$app/state';
	import { BUBBLE_DURATION, GREETING_DELAY, LINK_BUBBLE_DURATION } from './buddy-timing';
	import {
		CHATTERIE_HREF,
		CHATTERIE_LINK,
		fetchChatterieAnnouncement
	} from './chatterie-announcement';

	interface Props {
		/** Retour après une pause à fêter (l'élève a travaillé depuis) ; peut arriver après le montage */
		returnAfterPause?: boolean;
		onChangePalotin?: () => void;
		/** La réplique du retour a été dite : ne plus la redire */
		onWelcomeBackSaid?: () => void;
		/** Semaine qui devient active à fêter (B2) ; peut arriver après le montage */
		weekMoment?: WeekMoment | null;
		/** La réplique de la semaine a été dite : ne plus la redire */
		onWeekMomentSaid?: () => void;
		/** Palotin lu par la présence : repli quand le cache a expiré (TTL de 10 min) */
		fallbackBuddy?: BuddyState | null;
	}

	const WELCOME_BACK_URL = '/api/student/buddy/welcome-back';
	const WEEK_CELEBRATED_URL = '/api/student/buddy/week-celebrated';

	let {
		returnAfterPause = false,
		onChangePalotin,
		onWelcomeBackSaid,
		weekMoment = null,
		onWeekMomentSaid,
		fallbackBuddy = null
	}: Props = $props();

	const buddy = $derived(studentCache.getBuddySync() ?? fallbackBuddy);
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
	// Réplique de fête (retour, semaine) : nettoyée au démontage (quitter l'accueil avant elle ne l'acquitte pas)
	let welcomeTimer: ReturnType<typeof setTimeout> | null = null;
	/** Réplique de fête programmée (retour ou semaine) : une seule pour ce widget */
	let returnScheduled = false;
	/** Fin de la bulle de fête : salutation et annonce attendent jusque-là (horodatage, ms) */
	let returnBubbleUntil = 0;

	// Status panel
	let showStatus = $state(false);

	// Idle timer
	let idleTimer: ReturnType<typeof setTimeout> | null = null;
	const IDLE_INTERVAL_MIN = 45_000; // 45s
	const IDLE_INTERVAL_MAX = 90_000; // 90s

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
	 * Le Palotin, gardien de la Chatterie : annonce les nouveautés ou les
	 * Mathoux en sieste, sinon salue. La salutation attend la réponse : arrivée
	 * tard, l'annonce aurait sinon été précédée d'une salutation qu'elle aurait
	 * coupée.
	 */
	async function greetOrAnnounceChatterie(mountedAt: number, afterWelcomeBack: boolean) {
		const announcement = await fetchChatterieAnnouncement();
		if (!buddy) return;
		// Après la réplique du retour, sa bulle passe d'abord, et pas de salutation
		const minDelay = afterWelcomeBack ? 1000 + BUBBLE_DURATION : GREETING_DELAY;
		const wait = Math.max(0, minDelay - (Date.now() - mountedAt));
		if (!announcement) {
			if (afterWelcomeBack) return;
			greetingTimer = setTimeout(() => {
				// Retour fêté entre-temps : pas de salutation par-dessus
				if (!returnScheduled) showMessage('idle');
			}, wait);
			return;
		}
		const announce = () => {
			// Retour fêté entre-temps (présence relue) : l'annonce attend la fin de sa bulle
			const remaining = returnBubbleUntil - Date.now();
			if (remaining > 0) {
				nappingTimer = setTimeout(announce, remaining);
				return;
			}
			speak(announcement.message, announcement.expression, CHATTERIE_LINK);
		};
		nappingTimer = setTimeout(announce, wait);
	}

	/**
	 * Fête le retour après une pause (R2) ou la semaine qui devient active (B2),
	 * une seconde après (au montage, ou quand la présence relue après une
	 * activité l'apporte), puis l'acquitte. Joyeux, sans durée ni nombre de
	 * jours (chantier `regularite`, 2026-11-12). Une seule fête par widget.
	 */
	function scheduleCelebration(context: BuddyMessageContext, acknowledge: () => void) {
		returnScheduled = true;
		returnBubbleUntil = Date.now() + 1000 + BUBBLE_DURATION;
		welcomeTimer = setTimeout(() => {
			welcomeTimer = null;
			showMessage(context);
			acknowledge();
		}, 1000);
	}

	/**
	 * Le retour est fêté : le serveur l'efface. Après la bulle seulement (un
	 * préchargement n'affiche rien, donc ne consomme rien) ; en échec, la bulle
	 * reviendra au prochain chargement.
	 */
	function acknowledgeWelcomeBack() {
		fetch(WELCOME_BACK_URL, { method: 'POST' }).catch(() => {});
		onWelcomeBackSaid?.();
	}

	/** La semaine est fêtée : le serveur la retient (même règle que le retour). */
	function acknowledgeWeek() {
		fetch(WEEK_CELEBRATED_URL, { method: 'POST' }).catch(() => {});
		onWeekMomentSaid?.();
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

	// Retour à fêter, au montage ou plus tard (présence relue après une activité) : une fois
	$effect(() => {
		if (!returnAfterPause || !buddy) return;
		untrack(() => {
			if (!returnScheduled) scheduleCelebration('return_after_pause', acknowledgeWelcomeBack);
		});
	});

	// Semaine à fêter, au montage ou plus tard : une fois, jamais après une autre fête
	$effect(() => {
		const moment = weekMoment;
		if (!moment || !buddy) return;
		untrack(() => {
			if (!returnScheduled) scheduleCelebration(moment, acknowledgeWeek);
		});
	});

	onMount(() => {
		// Au montage : la réplique du retour (programmée par l'effet ci-dessous), puis les
		// nouveautés ou les Mathoux en sieste, sinon une salutation
		if (buddy) {
			const welcomeBack = returnAfterPause || weekMoment !== null;
			if (!isOnChatterie()) {
				void greetOrAnnounceChatterie(Date.now(), welcomeBack);
			} else if (!welcomeBack) {
				greetingTimer = setTimeout(() => showMessage('idle'), GREETING_DELAY);
			}
		}

		scheduleIdleMessage();

		return () => {
			if (bubbleTimer) clearTimeout(bubbleTimer);
			if (idleTimer) clearTimeout(idleTimer);
			if (nappingTimer) clearTimeout(nappingTimer);
			if (greetingTimer) clearTimeout(greetingTimer);
			if (welcomeTimer) clearTimeout(welcomeTimer);
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
