<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import PlayerPanel from '$lib/components/game/combat/PlayerPanel.svelte';
	import MonsterPanel from '$lib/components/game/combat/MonsterPanel.svelte';
	import SpellSelector from '$lib/components/game/combat/SpellSelector.svelte';
	import CombatLog from '$lib/components/game/combat/CombatLog.svelte';
	import ChallengeContainer from '$lib/components/game/challenges/ChallengeContainer.svelte';
	import ChallengeResult from '$lib/components/game/challenges/ChallengeResult.svelte';
	import { generateChallengeInstance } from '$lib/utils/game/challenge-variables';
	import { calculatePlayerMaxEndurance } from '$lib/utils/game/combat';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Combat state
	let selectedSpellNum = $state<number | null>(null);
	let activeChallenge = $state<any>(null);
	let challengeInstance = $state<any>(null);
	let challengeResult = $state<any>(null);
	let submitting = $state(false);
	let victory = $state(false);
	let rewards = $state<any>(null);

	// Player HP calculation
	const playerMaxHP = $derived(calculatePlayerMaxEndurance(data.gamePlayer.level));
	const playerCurrentHP = $state(playerMaxHP);

	// Monitor form responses
	$effect(() => {
		if (form?.challenge) {
			activeChallenge = form.challenge;
			challengeInstance = generateChallengeInstance(form.challenge);
		}

		if (form?.victory) {
			victory = true;
			rewards = form.rewards;
			toaster.success('🎉 Victoire ! Monstre vaincu !');
		} else if (form?.damageDealt) {
			toaster.success(`⚔️ ${form.damageDealt} points de dégâts !`);
			invalidateAll(); // Refresh combat data
		}
	});

	function handleSpellSelect(spellNum: number) {
		selectedSpellNum = spellNum;
	}

	async function handleChallengeSubmit(answer: any, timeTaken: number) {
		if (!activeChallenge || !selectedSpellNum) return;

		challengeResult = {
			answer,
			timeTaken,
			correctAnswer: challengeInstance.correct_answer
		};

		submitting = true;
	}

	function handleChallengeContinue() {
		// Reset challenge state
		activeChallenge = null;
		challengeInstance = null;
		challengeResult = null;
		selectedSpellNum = null;
	}
</script>

{#if victory && rewards}
	<!-- Victory Screen -->
	<div class="victory-screen mx-auto max-w-4xl p-8">
		<div class="space-y-6 rounded-lg border-2 border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 p-8 text-center dark:from-yellow-950/20 dark:to-orange-950/20">
			<div class="text-8xl">🏆</div>

			<h1 class="text-4xl font-bold text-yellow-600 dark:text-yellow-400">VICTOIRE !</h1>

			<p class="text-xl text-foreground">
				Tu as vaincu <strong>{data.monster.name}</strong> !
			</p>

			<!-- Rewards -->
			<div class="grid grid-cols-3 gap-4 rounded-lg bg-background p-6">
				<div class="space-y-1">
					<p class="text-3xl font-bold text-primary">+{rewards.xp}</p>
					<p class="text-sm text-muted-foreground">XP</p>
				</div>
				<div class="space-y-1">
					<p class="text-3xl font-bold text-primary">+{rewards.prestige}</p>
					<p class="text-sm text-muted-foreground">Prestige</p>
				</div>
				<div class="space-y-1">
					<p class="text-3xl font-bold text-primary">+{rewards.pyrs}</p>
					<p class="text-sm text-muted-foreground">Pyrs {rewards.element}</p>
				</div>
			</div>

			<div class="space-y-3">
				<Button href="/dashboard/navadra/combat" size="lg" class="w-full">
					Combattre un autre monstre
				</Button>
				<Button href="/dashboard/navadra" variant="outline" size="lg" class="w-full">
					Retour au hub
				</Button>
			</div>
		</div>
	</div>
{:else if challengeResult}
	<!-- Challenge Result -->
	<div class="mx-auto max-w-4xl p-8">
		<ChallengeResult
			success={form?.challengeSuccess ?? false}
			studentAnswer={challengeResult.answer}
			correctAnswer={challengeResult.correctAnswer}
			timeTaken={challengeResult.timeTaken}
		/>

		<form method="POST" action="?/submitAnswer" use:enhance={() => {
			return async ({ update }) => {
				await update();
				handleChallengeContinue();
			};
		}} class="mt-6">
			<input type="hidden" name="challenge_id" value={activeChallenge.id} />
			<input type="hidden" name="answer" value={JSON.stringify(challengeResult.answer)} />
			<input type="hidden" name="time_taken" value={challengeResult.timeTaken} />
			<input type="hidden" name="spell_num" value={selectedSpellNum} />

			<Button type="submit" size="lg" class="w-full" disabled={submitting}>
				{submitting ? 'Application des dégâts...' : 'Continuer'}
			</Button>
		</form>
	</div>
{:else if activeChallenge && challengeInstance}
	<!-- Active Challenge -->
	<div class="mx-auto max-w-4xl p-8">
		<ChallengeContainer
			instance={challengeInstance}
			onsubmit={handleChallengeSubmit}
		/>
	</div>
{:else}
	<!-- Combat Arena -->
	<div class="combat-arena mx-auto max-w-7xl p-8">
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Left: Player Panel + Log -->
			<div class="space-y-6">
				<PlayerPanel
					playerName="{data.gamePlayer.user_id}"
					level={data.gamePlayer.level}
					currentHP={playerCurrentHP}
					maxHP={playerMaxHP}
				/>

				<CombatLog turns={data.combat.combat_flow || []} />
			</div>

			<!-- Center: Monster Panel -->
			<div>
				<MonsterPanel
					monster={data.monster}
					currentHP={data.combat.monster_endurance_remaining || data.monster.max_endurance}
				/>
			</div>

			<!-- Right: Actions -->
			<div class="space-y-6">
				<!-- Combat Info -->
				<div class="rounded-lg border border-border bg-card p-4">
					<h3 class="mb-2 font-bold text-card-foreground">Combat</h3>
					<div class="space-y-1 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Round :</span>
							<span class="font-medium">{data.combat.current_round}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Tour :</span>
							<span class="font-medium">{data.combat.current_turn}</span>
						</div>
					</div>
				</div>

				<!-- Spell Selection -->
				{#if data.playerSpells.length > 0}
					<SpellSelector
						spells={data.playerSpells}
						{selectedSpellNum}
						onselect={handleSpellSelect}
					/>

					{#if selectedSpellNum !== null}
						<form method="POST" action="?/selectSpell" use:enhance>
							<input type="hidden" name="spell_num" value={selectedSpellNum} />
							<Button type="submit" size="lg" class="w-full">
								Lancer le sort !
							</Button>
						</form>
					{/if}
				{:else}
					<div class="rounded-lg border border-border bg-card p-6 text-center">
						<p class="text-muted-foreground">
							Tu n'as pas de sorts ! Visite le grimoire pour en débloquer.
						</p>
						<Button href="/dashboard/navadra/spells" class="mt-4">
							Aller au grimoire
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
