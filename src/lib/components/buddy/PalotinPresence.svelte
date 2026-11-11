<!--
	PalotinPresence
	===============
	Où et quand le Palotin se montre (chantier `palotins`, décisions de David du
	2026-11-11, docs/wip/palotins-progress.md). Monté une fois, par le layout
	racine, pour un élève connecté ; la zone vient de l'adresse :
	  - maison (accueil élève, Chatterie) : `BuddyWidget`, toujours là ;
	  - passage (reste de l'espace élève, révisions hors séance) : un écusson ;
	    le Palotin entre, dit une réplique, repart ;
	  - séance (Entraînement, révision en cours) : l'écusson seul ;
	  - ailleurs : rien.
	Le Palotin est lu APRÈS l'affichage (`GET /api/student/buddy/presence`).
	Passages importants (retour d'absence, nouveautés de la Chatterie) : une fois
	chacun, hors plafond. Passages spontanés (Mathoux en sieste, Constance perdue) :
	un toutes les 10 minutes au plus, tous onglets confondus.
	Sans Palotin : le quiz de choix s'ouvre sur l'accueil seulement.
-->

<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import type { BuddyMessageContext, PalotinType } from '$lib/config/buddy-messages';
	import type { BuddyExpression, BuddyState } from '$lib/types/buddy';
	import { buddyMessageEngine } from './buddy-message-engine';
	import { BUBBLE_DURATION, LINK_BUBBLE_DURATION } from './buddy-timing';
	import {
		CHATTERIE_HREF,
		CHATTERIE_LINK,
		fetchChatterieAnnouncement,
		type ChatterieAnnouncement
	} from './chatterie-announcement';
	import {
		browserStorage,
		createPassageClock,
		palotinZone,
		parseBuddyPresence
	} from './palotin-presence';
	import BuddyWidget from './BuddyWidget.svelte';
	import BuddyAvatar from './BuddyAvatar.svelte';
	import BuddySpeechBubble from './BuddySpeechBubble.svelte';
	import BuddyStatusPanel from './BuddyStatusPanel.svelte';
	import PalotinBadge from './PalotinBadge.svelte';
	import PalotinQuiz from './PalotinQuiz.svelte';
	import ChangePalotinModal from './ChangePalotinModal.svelte';

	// Types
	interface Passage {
		message: string;
		expression: BuddyExpression;
		link: { href: string; label: string } | null;
		/** Appelé quand la réplique s'affiche (ex. acquitter le retour) */
		onShown?: () => void;
	}

	// Constantes
	const PALOTIN_NAMES: Record<PalotinType, string> = {
		giron: 'Giron',
		pile: 'Pile',
		cotice: 'Cotice'
	};
	/** L'accueil élève : seul endroit où s'ouvre le quiz de choix */
	const HOME_PATH = '/dashboard';
	/** Durée de l'entrée et de la sortie du Palotin */
	const MOVE_DURATION = 300;
	const WELCOME_BACK_URL = '/api/student/buddy/welcome-back';

	// Variables
	const clock = createPassageClock(browserStorage);
	let presenceRequested = false;
	/** Lecture de présence terminée (réussie ou non) */
	let loaded = $state(false);
	let streakLost = $state(false);
	let longAbsence = $state(false);
	/** Palotin selon le serveur : `null` tant qu'il n'a pas répondu (décide seul du quiz) */
	let serverHasBuddy = $state<boolean | null>(null);
	/** Palotin lu par la présence : repli quand le cache a expiré (TTL de 10 min) */
	let presenceBuddy = $state<BuddyState | null>(null);
	/** Annonce de la Chatterie : lue une fois (la même promesse pour tous les appels) */
	let announcementPromise: Promise<ChatterieAnnouncement | null> | null = null;
	let announcement: ChatterieAnnouncement | null = null;
	/** `planPassages` en cours : un second appel attendrait la même lecture, il est ignoré */
	let planning = false;
	let queue = $state<Passage[]>([]);
	/** Passage en cours : le Palotin est là et parle */
	let current = $state<Passage | null>(null);
	let passageTimer: ReturnType<typeof setTimeout> | null = null;
	/** État ouvert par l'élève (clic sur l'écusson ou sur le Palotin) */
	let statusOpen = $state(false);
	let showChangeModal = $state(false);

	const buddy = $derived(studentCache.getBuddySync() ?? presenceBuddy);
	const zone = $derived(palotinZone(page.url.pathname));
	// Maison : le widget est recréé en passant de l'accueil à la Chatterie (salutation, annonce)
	const homeKey = $derived(page.url.pathname.startsWith(CHATTERIE_HREF) ? 'chatterie' : 'accueil');
	const showQuiz = $derived(serverHasBuddy === false && !buddy && page.url.pathname === HOME_PATH);
	const moveDuration = $derived(prefersReducedMotion.current ? 0 : MOVE_DURATION);

	// Functions
	/** Lit le Palotin, une fois, à la première page où il peut apparaître. */
	async function requestPresence() {
		if (presenceRequested) return;
		presenceRequested = true;
		// Cache réécrit pendant la lecture (gain de fin de séance) : il est plus récent, on le garde
		const cachedBefore = studentCache.getBuddySync();
		try {
			const response = await fetch('/api/student/buddy/presence');
			const view = response.ok ? parseBuddyPresence(await response.json()) : null;
			if (view) {
				serverHasBuddy = view.buddy !== null;
				presenceBuddy = view.buddy;
				if (studentCache.getBuddySync() === cachedBefore) studentCache.hydrateBuddy(view.buddy);
				streakLost = view.streakLost;
				longAbsence = view.longAbsence;
			}
		} catch {
			// Lecture en échec : pas de passage ; l'écusson reste si le Palotin est déjà connu
		}
		loaded = true;
		if (palotinZone(page.url.pathname) === 'passage') void planPassages();
	}

	/** Met une réplique du Palotin dans la file des passages. */
	function enqueueContext(context: BuddyMessageContext, onShown?: () => void) {
		if (!buddy) return;
		const message = buddyMessageEngine.getMessage(buddy.palotin_type, context);
		if (!message) return;
		const expression = buddyMessageEngine.getExpression(context);
		queue = [...queue, { message, expression, link: null, onShown }];
	}

	/** « Tu m'as manqué » est dit : le serveur l'efface (en échec, il reviendra). */
	function acknowledgeWelcomeBack() {
		fetch(WELCOME_BACK_URL, { method: 'POST' }).catch(() => {});
	}

	/**
	 * Ce que le Palotin a à dire en passant : d'abord les passages importants
	 * (retour d'absence, nouveautés de la Chatterie), puis au plus un passage
	 * spontané si le plafond le permet (Mathoux en sieste, sinon Constance perdue).
	 */
	async function planPassages() {
		if (planning || !buddy) return;
		planning = true;
		try {
			await planPassagesNow();
		} finally {
			planning = false;
		}
	}

	async function planPassagesNow() {
		if (longAbsence) {
			// « Tu m'as manqué » remplace la Constance perdue
			longAbsence = false;
			streakLost = false;
			enqueueContext('long_absence', acknowledgeWelcomeBack);
		}

		if (!announcementPromise) {
			announcementPromise = fetchChatterieAnnouncement().then((result) => {
				announcement = result;
				return result;
			});
		}
		await announcementPromise;
		if (announcement?.kind === 'news') {
			const { message, expression } = announcement;
			announcement = null;
			queue = [...queue, { message, expression, link: CHATTERIE_LINK }];
		}

		// Partie vers une séance ou la maison pendant la lecture : le spontané attendra
		if (palotinZone(page.url.pathname) !== 'passage') return;
		const now = Date.now();
		if (!clock.canPass(now)) return;
		if (announcement?.kind === 'napping') {
			const { message, expression } = announcement;
			announcement = null;
			queue = [...queue, { message, expression, link: CHATTERIE_LINK }];
			clock.record(now);
		} else if (streakLost) {
			streakLost = false;
			enqueueContext('streak_lost');
			clock.record(now);
		}
	}

	/** Le Palotin dit la réplique suivante ; il repart quand la file est vide. */
	function playNext() {
		const next = queue[0];
		if (!next) return;
		queue = queue.slice(1);
		current = next;
		next.onShown?.();
		if (passageTimer) clearTimeout(passageTimer);
		passageTimer = setTimeout(
			() => {
				passageTimer = null;
				// État ouvert : la bulle est masquée, la suite attend sa fermeture (rien d'acquitté sans être vu)
				if (queue.length > 0 && !statusOpen && palotinZone(page.url.pathname) === 'passage') {
					playNext();
				} else {
					current = null;
				}
			},
			next.link ? LINK_BUBBLE_DURATION : BUBBLE_DURATION
		);
	}

	function stopPassage() {
		if (passageTimer) clearTimeout(passageTimer);
		passageTimer = null;
		current = null;
	}

	function handleAvatarClick() {
		statusOpen = !statusOpen;
	}

	function handleChangePalotin() {
		statusOpen = false;
		showChangeModal = true;
	}

	// Lecture du Palotin dès la première page où il peut apparaître
	$effect(() => {
		if (zone !== null) untrack(() => void requestPresence());
	});

	// File des passages : jamais hors des pages de passage, ni pendant l'état ouvert
	$effect(() => {
		if (zone !== 'passage' || current || statusOpen || queue.length === 0) return;
		untrack(playNext);
	});

	// Changement de page : l'état ouvert se ferme ; hors des pages de passage, le Palotin repart
	// Arrivée sur une page de passage (la première est traitée à la fin de la lecture de présence)
	afterNavigate(() => {
		statusOpen = false;
		if (palotinZone(page.url.pathname) !== 'passage') {
			stopPassage();
		} else if (loaded) {
			void planPassages();
		}
	});

	onDestroy(() => {
		if (passageTimer) clearTimeout(passageTimer);
	});
</script>

{#if loaded && buddy}
	{#if zone === 'maison'}
		{#key homeKey}
			<BuddyWidget
				fallbackBuddy={presenceBuddy}
				{streakLost}
				{longAbsence}
				onWelcomeBackSaid={() => {
					streakLost = false;
					longAbsence = false;
				}}
				onChangePalotin={() => (showChangeModal = true)}
			/>
		{/key}
	{:else if zone !== null}
		<div class="fixed right-6 bottom-20 z-40" data-testid="palotin-presence">
			<BuddySpeechBubble
				message={current?.message ?? ''}
				visible={current !== null && !statusOpen}
				link={current?.link ?? null}
			/>

			{#if statusOpen}
				<BuddyStatusPanel
					{buddy}
					onClose={() => (statusOpen = false)}
					onChangePalotin={handleChangePalotin}
				/>
			{/if}

			<!-- Le Palotin et l'écusson se superposent : l'un entre pendant que l'autre part -->
			<div class="grid justify-items-end">
				{#if current || statusOpen}
					<button
						type="button"
						onclick={handleAvatarClick}
						transition:fly={{ x: 120, duration: moveDuration }}
						class="col-start-1 row-start-1 block cursor-pointer self-end rounded-full shadow-lg ring-2 ring-background"
						aria-label="Mon Palotin {PALOTIN_NAMES[buddy.palotin_type]}"
					>
						<BuddyAvatar
							palotin={buddy.palotin_type}
							expression={current?.expression ?? 'neutral'}
						/>
					</button>
				{:else}
					<button
						type="button"
						onclick={() => (statusOpen = true)}
						in:fade={{ duration: moveDuration }}
						class="col-start-1 row-start-1 flex h-11 w-11 cursor-pointer items-center justify-center self-end rounded-full bg-card shadow-md ring-1 ring-border transition-transform hover:scale-105 active:scale-95"
						aria-label="Appeler {PALOTIN_NAMES[buddy.palotin_type]}"
					>
						<PalotinBadge palotin={buddy.palotin_type} />
					</button>
				{/if}
			</div>
		</div>
	{/if}
{/if}

{#if showQuiz}
	<!-- Le quiz enregistre le Palotin dans le cache : il se ferme de lui-même -->
	<PalotinQuiz onComplete={() => (serverHasBuddy = true)} />
{/if}

{#if showChangeModal && buddy}
	<ChangePalotinModal
		bind:open={showChangeModal}
		{buddy}
		onClose={() => (showChangeModal = false)}
	/>
{/if}
