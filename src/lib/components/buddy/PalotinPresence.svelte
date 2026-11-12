<!--
	PalotinPresence
	===============
	Où et quand le Palotin se montre (chantier `palotins`, décisions de David du
	2026-11-11, docs/wip/palotins-progress.md). Monté une fois, par le layout
	racine, pour un élève connecté ; la zone vient de l'adresse :
	  - maison (accueil élève, Chatterie) : `BuddyWidget`, toujours là ;
	  - passage (reste de l'espace élève, révisions hors séance) : un écusson ;
	    le Palotin entre, dit une réplique, repart ;
	  - séance (Entraînement, révision en cours) : l'écusson ; le Palotin entre
	    une fois au plus, quand la séance le demande (5 réussites d'affilée,
	    3 erreurs sur une notion : `seance-reactions.ts`), et la séance attend
	    qu'il soit reparti ;
	  - ailleurs : rien.
	Le Palotin est lu APRÈS l'affichage (`GET /api/student/buddy/presence`), et
	relu à la page suivante quand l'élève vient de travailler (gain de pansées) :
	un retour après une pause se fête après la 1re activité, sans recharger.
	Passages importants (retour après une pause, nouveautés de la Chatterie) :
	une fois chacun, hors plafond. Passage spontané (Mathoux en
	sieste) : un toutes les 10 minutes au plus, tous onglets confondus.
	Sans Palotin : le quiz de choix s'ouvre sur l'accueil seulement.
-->

<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
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
		parseBuddyPresence,
		registerBuddyActivityListener
	} from './palotin-presence';
	import {
		registerSeanceReactionHandler,
		SEANCE_PASSAGE_DURATION,
		type SeanceReaction
	} from './seance-reactions';
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
		/** Fête du retour après une pause : jamais deux fois */
		isReturn?: boolean;
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
	/** Réplique de chaque réaction en séance : exclamation, encouragement (C14) */
	const SEANCE_CONTEXTS: Record<SeanceReaction, BuddyMessageContext> = {
		streak: 'correct',
		struggle: 'incorrect'
	};

	// Variables
	const clock = createPassageClock(browserStorage);
	let presenceRequested = false;
	/** L'élève a travaillé depuis la dernière lecture : relire à la page suivante */
	let presenceStale = false;
	/** Lecture de présence terminée (réussie ou non) */
	let loaded = $state(false);
	let returnAfterPause = $state(false);
	/** Retour déjà fêté pendant ce chargement : une relecture ne le refait pas dire */
	let returnCelebrated = false;
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
	/** Passage de séance en cours : la séance attend son départ */
	let seanceDone: (() => void) | null = null;
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
	/**
	 * Lit le Palotin à la première page où il peut apparaître, puis de nouveau
	 * après une activité (un retour après une pause peut alors être à fêter).
	 */
	async function requestPresence() {
		if (presenceRequested && !presenceStale) return;
		presenceRequested = true;
		presenceStale = false;
		// Cache réécrit pendant la lecture (gain de fin de séance) : il est plus récent, on le garde
		const cachedBefore = studentCache.getBuddySync();
		try {
			const response = await fetch('/api/student/buddy/presence');
			const view = response.ok ? parseBuddyPresence(await response.json()) : null;
			if (view) {
				serverHasBuddy = view.buddy !== null;
				presenceBuddy = view.buddy;
				if (studentCache.getBuddySync() === cachedBefore) studentCache.hydrateBuddy(view.buddy);
				// Un retour déjà en file ou déjà dit n'est pas effacé par une relecture
				if (view.returnAfterPause && !returnCelebrated) returnAfterPause = true;
			}
		} catch {
			// Lecture en échec : pas de passage ; l'écusson reste si le Palotin est déjà connu
		}
		loaded = true;
		if (palotinZone(page.url.pathname) === 'passage') void planPassages();
	}

	/** Met une réplique du Palotin dans la file des passages. */
	function enqueueContext(context: BuddyMessageContext, onShown?: () => void, isReturn = false) {
		if (!buddy) return;
		const message = buddyMessageEngine.getMessage(buddy.palotin_type, context);
		if (!message) return;
		const expression = buddyMessageEngine.getExpression(context);
		queue = [...queue, { message, expression, link: null, onShown, isReturn }];
	}

	/** Le retour est fêté en passage : le serveur l'efface (en échec, il reviendra). */
	function acknowledgeWelcomeBack() {
		markReturnCelebrated();
		fetch(WELCOME_BACK_URL, { method: 'POST' }).catch(() => {});
	}

	/** Retour fêté (passage ou maison) : plus de fête en file ni à venir pour ce chargement. */
	function markReturnCelebrated() {
		returnCelebrated = true;
		returnAfterPause = false;
		queue = queue.filter((passage) => !passage.isReturn);
	}

	/**
	 * Ce que le Palotin a à dire en passant : d'abord les passages importants
	 * (retour après une pause, nouveautés de la Chatterie), puis le passage
	 * spontané si le plafond le permet (Mathoux en sieste).
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
		if (returnAfterPause) {
			returnAfterPause = false;
			if (!returnCelebrated && !queue.some((passage) => passage.isReturn)) {
				enqueueContext('return_after_pause', acknowledgeWelcomeBack, true);
			}
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
		releaseSeance();
	}

	/** La séance n'attend plus : question suivante. */
	function releaseSeance() {
		const done = seanceDone;
		seanceDone = null;
		done?.();
	}

	/**
	 * Réaction en séance : le Palotin entre, dit sa réplique, repart ; la
	 * promesse se résout à son départ. Rien à jouer (pas en séance, Palotin
	 * inconnu, état ouvert, passage déjà en cours) : elle se résout aussitôt.
	 */
	function playSeanceReaction(reaction: SeanceReaction): Promise<void> {
		if (!loaded || !buddy || statusOpen || current || palotinZone(page.url.pathname) !== 'seance') {
			return Promise.resolve();
		}
		const context = SEANCE_CONTEXTS[reaction];
		const message = buddyMessageEngine.getMessage(buddy.palotin_type, context);
		if (!message) return Promise.resolve();

		current = { message, expression: buddyMessageEngine.getExpression(context), link: null };
		return new Promise((resolve) => {
			seanceDone = resolve;
			passageTimer = setTimeout(() => {
				passageTimer = null;
				current = null;
				releaseSeance();
			}, SEANCE_PASSAGE_DURATION);
		});
	}

	function handleAvatarClick() {
		statusOpen = !statusOpen;
	}

	function handleChangePalotin() {
		statusOpen = false;
		showChangeModal = true;
	}

	// Lecture du Palotin dès la première page où il peut apparaître
	// (les relectures après une activité passent par `afterNavigate`, maison ou passage seulement)
	$effect(() => {
		if (zone !== null && !presenceRequested) untrack(() => void requestPresence());
	});

	// File des passages : jamais hors des pages de passage, ni pendant l'état ouvert
	$effect(() => {
		if (zone !== 'passage' || current || statusOpen || queue.length === 0) return;
		untrack(playNext);
	});

	// Changement de page : l'état ouvert se ferme ; hors des pages de passage, le Palotin repart
	// Arrivée sur une page de passage (la première est traitée à la fin de la lecture de présence)
	// Après une activité, la présence est relue en arrivant dans la maison ou sur un passage
	afterNavigate(() => {
		statusOpen = false;
		const nextZone = palotinZone(page.url.pathname);
		if (nextZone !== 'passage') stopPassage();
		if (presenceStale && (nextZone === 'maison' || nextZone === 'passage')) {
			// La lecture planifie elle-même les passages
			void requestPresence();
		} else if (nextZone === 'passage' && loaded) {
			void planPassages();
		}
	});

	// Prêt à réagir en séance ; prévenu des activités ; démonté, la séance n'attend plus
	onMount(() => {
		const unregisterSeance = registerSeanceReactionHandler(playSeanceReaction);
		const unregisterActivity = registerBuddyActivityListener(() => {
			presenceStale = true;
		});
		return () => {
			unregisterSeance();
			unregisterActivity();
		};
	});

	onDestroy(() => {
		if (passageTimer) clearTimeout(passageTimer);
		releaseSeance();
	});
</script>

{#if loaded && buddy}
	{#if zone === 'maison'}
		{#key homeKey}
			<BuddyWidget
				fallbackBuddy={presenceBuddy}
				{returnAfterPause}
				onWelcomeBackSaid={markReturnCelebrated}
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
