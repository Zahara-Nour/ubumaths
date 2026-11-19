<!--
	CombatArena — combat de la recrue (La Descente de la Vistule, étape 3)
	=====================================================================
	Phase 0 de l'étape 3, validée par David le 2026-11-18 (docs/wip/navadra-progress.md).

	Déroulé : l'élève choisit un coup (un par Province, fermé sans question à son
	niveau) ; une question courte s'affiche, sans chrono ; « Valider » retourne la
	carte (sa réponse, le verdict, la correction). Juste : le coup part (le serveur
	retire les PV). Après 3 coups, la Bête riposte : question d'esquive ; ratée, un
	cœur de moins. Fin : victoire (carnet, gidouilles), défaite (rien de perdu) ou
	repli de la grosse Bête (blessures gardées).

	Le serveur tient les PV de la Bête ; la page tient le tour et les cœurs
	(`combat-rules.ts`). Page fermée : combat abandonné, rien de perdu.

	Ton (journal, § « Contraintes repérées ») : jamais « faux » ni « boss » ;
	« Tu as dévié », « Coup de Maître ».

	Props:
	- combat: OpenedCombat - La Bête et les coups ouverts (rendus par le serveur)
	- quitHref: string - Où mène « Quitter le combat »
-->

<script lang="ts">
	import { onMount, tick } from 'svelte';
	import FlashCard from '#lib/components/questions/FlashCard.svelte';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Progress } from '#lib/components/ui/progress/index.ts';
	import { ArrowRight, Heart, Shield, Swords } from '@lucide/svelte';
	import type { ProvinceId } from '#lib/kingdom-tour/tour.ts';
	import { PROVINCES } from '#lib/kingdom-tour/tour.ts';
	import type { QuestionInstance } from '#lib/questions/types.ts';
	import type { AnswerData } from '#lib/types/question-display.ts';
	import { STARTING_MOVES, type CombatMove } from '#lib/descente/moves.ts';
	import {
		afterAttack,
		afterDodge,
		ACTIONS_PER_ROUND,
		hitDamage,
		isCombatOver,
		startCombat,
		STARTING_HEARTS,
		type CombatState,
		type OpenedCombat
	} from '#lib/descente/combat-rules.ts';
	import {
		claimVictory,
		requestQuestion,
		sendAnswer,
		type CombatPurpose
	} from '#lib/descente/combat-client.ts';

	// Types
	interface Props {
		combat: OpenedCombat;
		quitHref: string;
	}

	interface CurrentQuestion {
		instance: QuestionInstance;
		purpose: CombatPurpose;
		province: ProvinceId;
	}

	interface Verdict {
		tone: 'good' | 'neutral' | 'bad';
		text: string;
	}

	// Constantes
	/** Modèles gardés pour ne pas reposer tout de suite la même question */
	const MAX_RECENT = 40;
	const PROVINCE_NAMES: Record<ProvinceId, string> = Object.fromEntries(
		PROVINCES.map((p) => [p.id, p.name])
	) as Record<ProvinceId, string>;

	// Variables
	let { combat, quitHref }: Props = $props();

	// svelte-ignore state_referenced_locally
	const beast = combat.beast;
	// svelte-ignore state_referenced_locally
	const openProvinces = new Set<ProvinceId>(combat.openProvinces);

	let fight = $state<CombatState>(
		startCombat({ kind: beast.kind, beastHp: beast.hp, beastMaxHp: beast.maxHp })
	);
	let question = $state<CurrentQuestion | null>(null);
	/** Réponse validée de la question affichée ; `null` tant que l'élève n'a pas validé */
	let answered = $state<AnswerData | null>(null);
	let verdict = $state<Verdict | null>(null);
	let loading = $state(false);
	/** Réponse non enregistrée (réseau) : un mot discret, le combat continue */
	let unsaved = $state(false);
	/** Combat interrompu : Bête partie, vaincue ailleurs, aucune question */
	let stopped = $state<string | null>(null);
	let reward = $state<{ paid: number; capReached: boolean } | null>(null);
	/** Victoire à renvoyer (la réponse qui a achevé la Bête ne l'a pas enregistrée) */
	let victoryPending = $state(false);
	let cardKey = $state(0);
	/**
	 * Question de la carte affichée, jamais remise à `null` : la carte la relit
	 * encore pendant sa fermeture (fin de combat, retour au choix des coups)
	 */
	let shownInstance = $state<QuestionInstance | null>(null);
	let recent: string[] = [];
	let root = $state<HTMLElement>();

	const hpPercent = $derived(fight.beastMaxHp > 0 ? (fight.beastHp / fight.beastMaxHp) * 100 : 0);
	const over = $derived(isCombatOver(fight) || stopped !== null);
	const beastProvinceName = $derived(PROVINCE_NAMES[beast.province]);
	const rewardText = $derived(
		reward && reward.paid > 0
			? `+${reward.paid} ${reward.paid > 1 ? 'gidouilles' : 'gidouille'}`
			: null
	);

	// Functions
	async function focusIn(selector: string) {
		await tick();
		root?.querySelector<HTMLElement>(selector)?.focus();
	}

	function stopMessage(code: string): string {
		if (code === 'defeated') return 'Cette Bête est déjà vaincue.';
		if (code === 'gone') return 'Cette Bête est repartie.';
		if (code === 'not_found') return 'Cette Bête est introuvable.';
		if (code === 'no_question' || code === 'move_closed')
			return 'Aucune question ne peut être posée pour ce coup pour l’instant.';
		return 'Le combat ne peut pas continuer pour l’instant. Réessaie un peu plus tard.';
	}

	function remember(templateId: string) {
		recent = [templateId, ...recent.filter((id) => id !== templateId)].slice(0, MAX_RECENT);
	}

	async function ask(purpose: CombatPurpose, province: ProvinceId) {
		loading = true;
		verdict = null;
		answered = null;
		const result = await requestQuestion(beast.id, { purpose, province, recent });
		loading = false;
		if (!result.ok) {
			// Coup fermé ou sans question : on reste au choix des coups
			if (
				purpose === 'attack' &&
				(result.code === 'no_question' || result.code === 'move_closed')
			) {
				verdict = { tone: 'neutral', text: stopMessage(result.code) };
				return;
			}
			// Hoquet du réseau ou du serveur : rien n'est écrit, on peut redemander
			// (choix du coup, ou bouton « La Bête riposte » pour l'esquive)
			if (result.code === 'network' || result.code === 'server_error') {
				verdict = {
					tone: 'neutral',
					text: 'La question n’a pas pu arriver. Réessaie.'
				};
				return;
			}
			stopped = stopMessage(result.code);
			return;
		}
		remember(result.value.instance.templateId);
		shownInstance = result.value.instance;
		question = { instance: result.value.instance, purpose, province };
		cardKey += 1;
	}

	function chooseMove(move: CombatMove) {
		if (loading || question || fight.phase !== 'attack') return;
		void ask('attack', move.province);
	}

	async function handleAnswerSubmit(answer: AnswerData) {
		if (!question || answered) return;
		answered = answer;
		const current = question;
		loading = true;
		const result = await sendAnswer(beast.id, {
			purpose: current.purpose,
			province: current.province,
			instance: current.instance,
			answer
		});
		loading = false;

		if (!result.ok && result.code !== 'network' && result.code !== 'server_error') {
			stopped = stopMessage(result.code);
			return;
		}
		unsaved = !result.ok || !result.value.recorded;

		// Bête à 0 côté serveur, quelle que soit la question (une réponse perdue plus tôt
		// a pu l'achever) : victoire
		if (result.ok && result.value.beastHp === 0) {
			fight = { ...fight, beastHp: 0, phase: 'won' };
			reward = result.value.victory;
			victoryPending = result.value.victory === null;
			void focusIn('[data-combat-next]');
			return;
		}

		if (current.purpose === 'attack') {
			// Réponse perdue : le coup ne part pas, le combat continue
			const hp = result.ok ? result.value.beastHp : fight.beastHp;
			fight = afterAttack(fight, hp);
			verdict =
				answer.isCorrect && !result.ok
					? { tone: 'neutral', text: 'Ta réponse n’a pas pu arriver : le coup n’est pas parti.' }
					: attackVerdict(answer.isCorrect, current.province);
		} else {
			fight = afterDodge(fight, answer.isCorrect);
			verdict = answer.isCorrect
				? { tone: 'good', text: 'Esquivé ! La Bête frappe dans le vide.' }
				: { tone: 'bad', text: 'Touché : tu perds un cœur.' };
		}
		void focusIn('[data-combat-next]');
	}

	function attackVerdict(success: boolean, province: ProvinceId): Verdict {
		if (!success) return { tone: 'bad', text: 'Tu as dévié : le coup est raté.' };
		const damage = hitDamage(province, beast.province);
		return province === beast.province
			? { tone: 'good', text: `Coup de Maître ! La Bête perd ${damage} points de vie.` }
			: { tone: 'good', text: `Coup porté : la Bête perd ${damage} points de vie.` };
	}

	/** « Continuer » : riposte de la Bête, ou retour au choix des coups */
	function goOn() {
		question = null;
		answered = null;
		verdict = null;
		if (fight.phase === 'dodge') {
			void ask('dodge', beast.province);
		}
	}

	async function retryVictory() {
		loading = true;
		const result = await claimVictory(beast.id);
		loading = false;
		if (result.ok) {
			reward = result.value;
			victoryPending = false;
		} else if (result.code === 'defeated') {
			// Déjà enregistrée par un autre envoi
			victoryPending = false;
		}
	}

	onMount(() => {
		// Bête à 0 sans défaite enregistrée : la victoire est à renvoyer
		if (beast.hp === 0) {
			fight = { ...fight, beastHp: 0, phase: 'won' };
			void retryVictory();
		}
	});
</script>

<div class="mx-auto w-full max-w-4xl space-y-6" bind:this={root}>
	<BackLink href={quitHref} label="Quitter le combat" kind="quit" class="mb-0" />

	<!-- La Bête et l'élève -->
	<Card.Root data-testid="combat-header">
		<Card.Content class="space-y-4 p-6">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h1 class="text-2xl font-semibold">{beast.name}</h1>
				<p class="text-sm text-muted-foreground">
					Sensible aux coups de <strong>{beastProvinceName}</strong>
				</p>
			</div>
			<div class="space-y-1">
				<div class="flex justify-between text-sm">
					<span>Points de vie de la Bête</span>
					<span data-testid="combat-beast-hp">{fight.beastHp} / {fight.beastMaxHp}</span>
				</div>
				<Progress value={hpPercent} class="h-3" />
			</div>
			<div class="flex flex-wrap items-center justify-between gap-2 text-sm">
				<p class="flex items-center gap-1" data-testid="combat-hearts">
					<span class="sr-only">Tes cœurs : {fight.hearts} sur {STARTING_HEARTS}</span>
					{#each Array.from({ length: STARTING_HEARTS }, (_, i) => i) as index (index)}
						<Heart
							aria-hidden="true"
							class={index < fight.hearts
								? 'h-5 w-5 fill-[var(--color-destructive)] text-[var(--color-destructive)]'
								: 'h-5 w-5 text-muted-foreground'}
						/>
					{/each}
				</p>
				{#if !over}
					<p class="text-muted-foreground" data-testid="combat-round">
						Tour {fight.round}{#if fight.phase === 'attack'}
							· coup {fight.actionsThisRound + 1} sur {ACTIONS_PER_ROUND}{/if}
					</p>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	{#if unsaved}
		<p class="text-center text-sm text-muted-foreground" role="status">
			Une réponse n’a pas pu être enregistrée ; le combat continue.
		</p>
	{/if}

	{#if stopped}
		<Card.Root>
			<Card.Content class="space-y-4 p-6 text-center">
				<p>{stopped}</p>
				<Button href={quitHref} variant="outline">Quitter le combat</Button>
			</Card.Content>
		</Card.Root>
	{:else if fight.phase === 'won'}
		<Card.Root data-testid="combat-won">
			<Card.Content class="space-y-3 p-6 text-center">
				<h2 class="text-2xl font-semibold" tabindex="-1" data-combat-next>Victoire !</h2>
				<p>{beast.name} entre dans ton carnet de voyage.</p>
				{#if reward}
					{#if rewardText}
						<p class="font-medium">{rewardText}</p>
					{/if}
					{#if reward.capReached || reward.paid === 0}
						<p class="text-sm text-muted-foreground">
							Tu as atteint le plafond de gidouilles du jour : tes combats comptent quand même pour
							ton travail.
						</p>
					{/if}
				{:else if victoryPending}
					<p class="text-sm text-muted-foreground">Ta victoire n’a pas encore été enregistrée.</p>
					<Button onclick={retryVictory} disabled={loading}>Enregistrer ma victoire</Button>
				{/if}
				<Button href={quitHref} variant="outline">Quitter le combat</Button>
			</Card.Content>
		</Card.Root>
	{:else if fight.phase === 'lost'}
		<Card.Root data-testid="combat-lost">
			<Card.Content class="space-y-3 p-6 text-center">
				<h2 class="text-xl font-semibold" tabindex="-1" data-combat-next>
					La Bête l’emporte cette fois
				</h2>
				<p>
					Perdre ne coûte rien : {beast.name} t’attend, en pleine forme. Tu peux revenir la combattre
					quand tu veux.
				</p>
				<Button href={quitHref} variant="outline">Quitter le combat</Button>
			</Card.Content>
		</Card.Root>
	{:else if fight.phase === 'retreat'}
		<Card.Root data-testid="combat-retreat">
			<Card.Content class="space-y-3 p-6 text-center">
				<h2 class="text-xl font-semibold" tabindex="-1" data-combat-next>La Bête se replie</h2>
				<p>
					{beast.name} garde ses blessures ({fight.beastHp} / {fight.beastMaxHp}). Reviens la finir
					dans un prochain combat.
				</p>
				<Button href={quitHref} variant="outline">Quitter le combat</Button>
			</Card.Content>
		</Card.Root>
	{:else if question && shownInstance}
		<div class="space-y-3" data-testid="combat-question">
			<p class="flex items-center gap-2 font-medium">
				{#if question.purpose === 'dodge'}
					<Shield class="h-5 w-5" aria-hidden="true" />
					La Bête riposte ! Réponds pour esquiver.
				{:else}
					<Swords class="h-5 w-5" aria-hidden="true" />
					Coup de {PROVINCE_NAMES[question.province]}
				{/if}
			</p>
			{#key cardKey}
				<FlashCard
					instance={shownInstance}
					interactive
					flipOnSubmit
					flippable={answered !== null}
					size="lg"
					onAnswerSubmit={handleAnswerSubmit}
				/>
			{/key}
			{#if verdict}
				<p
					class="text-center font-medium"
					class:text-[var(--color-success)]={verdict.tone === 'good'}
					role="status"
					data-testid="combat-verdict"
				>
					{verdict.text}
				</p>
				<div class="flex justify-center">
					<Button size="lg" onclick={goOn} data-combat-next>
						{fight.phase === 'dodge' ? 'La Bête riposte' : 'Continuer'}
						<ArrowRight class="ml-2 h-4 w-4" aria-hidden="true" />
					</Button>
				</div>
			{/if}
		</div>
	{:else if fight.phase === 'dodge'}
		<!-- Question d'esquive pas encore arrivée (ou à redemander) -->
		<div class="space-y-3 text-center" data-testid="combat-dodge-wait">
			{#if verdict}
				<p class="text-sm text-muted-foreground" role="status">{verdict.text}</p>
			{/if}
			<Button size="lg" onclick={goOn} disabled={loading}>
				<Shield class="mr-2 h-4 w-4" aria-hidden="true" />
				La Bête riposte
			</Button>
		</div>
	{:else}
		<!-- Choix du coup -->
		<section class="space-y-3" aria-labelledby="combat-moves-title">
			<h2 id="combat-moves-title" class="font-medium">Choisis ton coup</h2>
			{#if verdict}
				<p class="text-sm text-muted-foreground" role="status">{verdict.text}</p>
			{/if}
			<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{#each STARTING_MOVES as move (move.key)}
					{@const open = openProvinces.has(move.province)}
					<li>
						<Button
							variant={move.province === beast.province ? 'default' : 'outline'}
							class="h-auto w-full flex-col items-start gap-1 p-4 text-left whitespace-normal"
							disabled={!open || loading}
							onclick={() => chooseMove(move)}
							data-testid="combat-move-{move.province}"
						>
							<span class="font-semibold">{move.name}</span>
							{#if !open}
								<span class="text-xs font-normal">
									Pas encore de question de {PROVINCE_NAMES[move.province]} à ton niveau.
								</span>
							{:else if move.province === beast.province}
								<span class="text-xs font-normal">Double dégâts sur cette Bête</span>
							{/if}
						</Button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
