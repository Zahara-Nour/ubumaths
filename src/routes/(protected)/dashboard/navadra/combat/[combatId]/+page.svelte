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

	// Derived view state for debugging
	const currentView = $derived(
		victory && rewards
			? 'victory'
			: challengeResult
				? 'result'
				: activeChallenge && challengeInstance
					? 'challenge'
					: 'combat'
	);

	// Monitor form responses for spell selection
	$effect(() => {
		if (form?.challenge) {
			activeChallenge = form.challenge;
			challengeInstance = generateChallengeInstance(form.challenge);
		}
	});

	function handleSpellSelect(spellNum: number) {
		selectedSpellNum = spellNum;
	}

	async function handleChallengeSubmit(answer: any, timeTaken: number) {
		console.log('[handleChallengeSubmit] Called with:', { answer, timeTaken });
		console.log('[handleChallengeSubmit] State:', { activeChallenge, selectedSpellNum, challengeInstance });

		if (!activeChallenge || !selectedSpellNum) {
			console.log('[handleChallengeSubmit] Missing activeChallenge or selectedSpellNum, returning');
			return;
		}

		if (submitting) {
			console.log('[handleChallengeSubmit] Already submitting, ignoring');
			return;
		}

		// Store challenge result for display
		const correctAnswer = challengeInstance.correct_answer;

		console.log('[handleChallengeSubmit] Submitting to server:', {
			answer,
			timeTaken,
			correctAnswer
		});

		// Clear challenge instance to prevent showing challenge input again
		challengeInstance = null;

		// Submit directly to server
		submitting = true;

		const formData = new FormData();
		formData.append('challenge_id', activeChallenge.id);
		formData.append('answer', JSON.stringify(answer));
		formData.append('correct_answer', JSON.stringify(correctAnswer));
		formData.append('time_taken', String(timeTaken));
		formData.append('spell_num', String(selectedSpellNum));

		try {
			const response = await fetch('?/submitAnswer', {
				method: 'POST',
				body: formData,
				headers: {
					'x-sveltekit-action': 'true'
				}
			});

			if (response.ok) {
				const result = await response.json();
				console.log('[handleChallengeSubmit] Full server response:', JSON.stringify(result, null, 2));

				// SvelteKit action responses wrap data in a specific structure
				// result.data is a JSON string containing an array:
				// [{ columnIndices... }, actualSuccess, actualDamage, actualVictory]
				let success = false;
				let damageDealt = 0;
				let isVictory = false;

				if (result.type === 'success' && result.data) {
					if (typeof result.data === 'string') {
						console.log('[handleChallengeSubmit] result.data is a string, parsing JSON');
						const parsed = JSON.parse(result.data);
						console.log('[handleChallengeSubmit] Parsed array:', parsed);

						if (Array.isArray(parsed) && parsed.length >= 4) {
							// Array format: [columnIndices, success, damageDealt, victory]
							success = parsed[1] ?? false;
							damageDealt = parsed[2] ?? 0;
							isVictory = parsed[3] ?? false;
							console.log('[handleChallengeSubmit] Extracted from array indices:', {
								success,
								damageDealt,
								isVictory
							});
						} else {
							// Fallback: try to use as object
							const serverData = Array.isArray(parsed) ? parsed[0] : parsed;
							success = serverData?.challengeSuccess ?? false;
							damageDealt = serverData?.damageDealt ?? 0;
							isVictory = serverData?.victory ?? false;
							console.log('[handleChallengeSubmit] Extracted from object:', {
								success,
								damageDealt,
								isVictory
							});
						}
					} else if (Array.isArray(result.data) && result.data.length >= 4) {
						// Already parsed array
						success = result.data[1] ?? false;
						damageDealt = result.data[2] ?? 0;
						isVictory = result.data[3] ?? false;
					} else {
						// Object format
						const serverData = Array.isArray(result.data) ? result.data[0] : result.data;
						success = serverData?.challengeSuccess ?? false;
						damageDealt = serverData?.damageDealt ?? 0;
						isVictory = serverData?.victory ?? false;
					}
				}

				console.log('[handleChallengeSubmit] Parsed values:', {
					success,
					damageDealt,
					isVictory
				});

				// Set challenge result with server validation
				challengeResult = {
					answer,
					timeTaken,
					correctAnswer,
					success
				};

				// Show toast messages
				if (isVictory) {
					victory = true;
					rewards = serverData.rewards;
					toaster.success('🎉 Victoire ! Monstre vaincu !');
				} else if (damageDealt > 0) {
					toaster.success(`⚔️ ${damageDealt} points de dégâts !`);
				} else {
					toaster.error('❌ Réponse incorrecte ! Aucun dégât infligé.');
				}

				// Refresh data
				await invalidateAll();
			} else {
				console.error('[handleChallengeSubmit] Server error:', response.status);
				toaster.error('Erreur lors de la validation de la réponse');
				handleChallengeContinue();
			}
		} catch (error) {
			console.error('[handleChallengeSubmit] Fetch error:', error);
			toaster.error('Erreur de connexion');
			handleChallengeContinue();
		} finally {
			submitting = false;
		}
	}

	function handleChallengeContinue() {
		// Reset challenge state
		activeChallenge = null;
		challengeInstance = null;
		challengeResult = null;
		selectedSpellNum = null;
	}
</script>

<!-- DEBUG: Template state -->
<div class="fixed left-0 top-0 z-50 bg-black p-2 text-xs text-white opacity-75">
	<div>currentView: {currentView}</div>
	<div>victory: {victory}</div>
	<div>challengeResult: {challengeResult ? 'SET' : 'null'}</div>
	<div>activeChallenge: {activeChallenge ? 'SET' : 'null'}</div>
	<div>challengeInstance: {challengeInstance ? 'SET' : 'null'}</div>
	<div>submitting: {submitting}</div>
</div>

{#key currentView}
	{#if currentView === 'victory'}
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
	{:else if currentView === 'result'}
		<!-- Challenge Result -->
		<div class="mx-auto max-w-4xl p-8">
			<ChallengeResult
				success={challengeResult.success ?? false}
				studentAnswer={challengeResult.answer}
				correctAnswer={challengeResult.correctAnswer}
				timeTaken={challengeResult.timeTaken}
			/>

			<Button onclick={handleChallengeContinue} size="lg" class="mt-6 w-full">
				Continuer
			</Button>
		</div>
	{:else if currentView === 'challenge'}
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
					<div class="mt-4 border-t border-border pt-4">
						<Button href="/dashboard/navadra" variant="ghost" size="sm" class="w-full gap-2">
							← Abandonner le combat
						</Button>
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
{/key}
