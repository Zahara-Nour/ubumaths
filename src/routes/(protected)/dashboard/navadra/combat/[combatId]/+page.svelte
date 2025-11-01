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

	import { generateChallengeInstance } from '$lib/utils/game/challenge-variables'; // For future challenge generation

	import { calculatePlayerMaxEndurance } from '$lib/utils/game/combat'; // For future endurance calculations
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData, ActionData } from './$types';
	import type { ChallengeInstance } from '$lib/types/game';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Combat state
	let selectedSpellNum = $state<number | null>(null);
	let activeChallenge = $state<unknown>(null);
	let challengeInstance = $state<ChallengeInstance | null>(null);
	let challengeResult = $state<{
		success?: boolean;
		answer: unknown;
		correctAnswer: unknown;
		timeTaken: number;
	} | null>(null);
	let submitting = $state(false);
	let victory = $state(false);
	let rewards = $state<unknown>(null);

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

	async function handleChallengeSubmit(answer: unknown, timeTaken: number) {
		console.log('[handleChallengeSubmit] Called with:', { answer, timeTaken });
		console.log('[handleChallengeSubmit] State:', {
			activeChallenge,
			selectedSpellNum,
			challengeInstance
		});

		if (!activeChallenge || !selectedSpellNum) {
			console.log('[handleChallengeSubmit] Missing activeChallenge or selectedSpellNum, returning');
			return;
		}

		if (submitting) {
			console.log('[handleChallengeSubmit] Already submitting, ignoring');
			return;
		}

		// Store challenge result for display
		const correctAnswer = (challengeInstance as { correct_answer: unknown }).correct_answer;

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
		formData.append('challenge_id', (activeChallenge as { id: string }).id);
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
				console.log(
					'[handleChallengeSubmit] Full server response:',
					JSON.stringify(result, null, 2)
				);

				// SvelteKit action responses wrap data in a specific structure
				// result.data contains the server action return value
				let success = false;
				let damageDealt = 0;
				let isVictory = false;
				let serverData: {
					success?: boolean;
					damage_dealt?: number;
					is_victory?: boolean;
					challengeSuccess?: boolean;
					damageDealt?: number;
					victory?: boolean;
					rewards?: unknown;
				} | null = null;

				if (result.type === 'success' && result.data) {
					// Parse result.data if it's a string
					const parsed: unknown =
						typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
					console.log('[handleChallengeSubmit] Parsed response:', parsed);

					// SvelteKit form actions return data directly as objects
					// Check if parsed is already an object with the expected properties
					if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
						// Direct object format from server
						const parsedData = parsed as Record<string, unknown>;
						serverData = parsedData as unknown as typeof serverData;
						success = (parsedData.challengeSuccess as boolean | undefined) ?? false;
						damageDealt = (parsedData.damageDealt as number | undefined) ?? 0;
						isVictory = (parsedData.victory as boolean | undefined) ?? false;

						console.log('[handleChallengeSubmit] Extracted from object:', {
							success,
							damageDealt,
							isVictory,
							rewards: parsedData.rewards
						});
					} else if (Array.isArray(parsed) && parsed.length >= 4) {
						// PostgreSQL array format: [columnIndices, ...values]
						// The first element contains column-to-index mappings
						const columnIndices = parsed[0] as Record<string, number>;
						console.log('[handleChallengeSubmit] Column indices:', columnIndices);

						// Extract values using column indices
						// Note: Column indices can be 1 (true) or 3 (false) for booleans
						// For challengeSuccess: 1 = true (correct), 3 = false (incorrect)
						const challengeSuccessIdx = columnIndices?.challengeSuccess ?? 1;
						success = challengeSuccessIdx === 1;

						const damageDealtIdx = columnIndices?.damageDealt ?? 2;
						damageDealt = (parsed[damageDealtIdx] as number) ?? 0;

						const victoryIdx = columnIndices?.victory ?? 3;
						isVictory = parsed[victoryIdx] === true;

						// Extract rewards - the rewards field contains ANOTHER mapping object
						// that tells us where to find the actual XP, prestige, pyrs values
						let rewardsData = null;
						if (isVictory && columnIndices?.rewards !== undefined) {
							const rewardsMapping = parsed[columnIndices.rewards] as Record<string, number>;
							console.log('[handleChallengeSubmit] Rewards mapping:', rewardsMapping);

							if (rewardsMapping && typeof rewardsMapping === 'object') {
								// Use the rewards mapping to extract actual values
								rewardsData = {
									xp: (parsed[rewardsMapping.xp] as number) ?? 0,
									prestige: (parsed[rewardsMapping.prestige] as number) ?? 0,
									pyrs: (parsed[rewardsMapping.pyrs] as number) ?? 0,
									element: (parsed[rewardsMapping.element] as string) ?? ''
								};
								console.log('[handleChallengeSubmit] Extracted rewards:', rewardsData);
							}
						}

						// Store serverData for rewards access
						serverData = {
							success: parsed[1] as boolean,
							damageDealt: parsed[damageDealtIdx] as number,
							challengeSuccess: success,
							victory: isVictory,
							rewards: rewardsData
						};

						console.log('[handleChallengeSubmit] Extracted values:', {
							success,
							damageDealt,
							isVictory,
							challengeSuccessIdx,
							rewards: serverData?.rewards
						});
					} else {
						// Fallback
						const fallbackRaw: unknown = Array.isArray(parsed) ? parsed[0] : parsed;
						const fallbackData = fallbackRaw as Record<string, unknown>;
						serverData = fallbackData as unknown as typeof serverData;
						success = (fallbackData.challengeSuccess as boolean | undefined) ?? false;
						damageDealt = (fallbackData.damageDealt as number | undefined) ?? 0;
						isVictory = (fallbackData.victory as boolean | undefined) ?? false;

						console.log('[handleChallengeSubmit] Extracted from fallback:', {
							success,
							damageDealt,
							isVictory
						});
					}
				}

				console.log('[handleChallengeSubmit] Final parsed values:', {
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
					rewards = serverData?.rewards;
					console.log('[handleChallengeSubmit] Setting victory state:', {
						victory,
						rewards,
						serverData
					});
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
<div class="fixed top-0 left-0 z-50 bg-black p-2 text-xs text-white opacity-75">
	<div>currentView: {currentView}</div>
	<div>victory: {victory}</div>
	<div>rewards: {rewards ? JSON.stringify(rewards) : 'null'}</div>
	<div>challengeResult: {challengeResult ? 'SET' : 'null'}</div>
	<div>activeChallenge: {activeChallenge ? 'SET' : 'null'}</div>
	<div>challengeInstance: {challengeInstance ? 'SET' : 'null'}</div>
	<div>submitting: {submitting}</div>
</div>

{#key currentView}
	{#if currentView === 'victory'}
		<!-- Victory Screen -->
		<div class="victory-screen mx-auto max-w-4xl p-8">
			<div
				class="space-y-6 rounded-lg border-2 border-yellow-500 bg-gradient-to-br from-yellow-50 to-orange-50 p-8 text-center dark:from-yellow-950/20 dark:to-orange-950/20"
			>
				<div class="text-8xl">🏆</div>

				<h1 class="text-4xl font-bold text-yellow-600 dark:text-yellow-400">VICTOIRE !</h1>

				<p class="text-xl text-foreground">
					Tu as vaincu <strong>{data.monster.name}</strong> !
				</p>

				<!-- Rewards -->
				{#if rewards}
					{@const rewardsData = rewards as {
						xp?: number;
						prestige?: number;
						pyrs?: number;
						element?: string;
					}}
					<div class="grid grid-cols-3 gap-4 rounded-lg bg-background p-6">
						<div class="space-y-1">
							<p class="text-3xl font-bold text-primary">+{rewardsData.xp ?? 0}</p>
							<p class="text-sm text-muted-foreground">XP</p>
						</div>
						<div class="space-y-1">
							<p class="text-3xl font-bold text-primary">+{rewardsData.prestige ?? 0}</p>
							<p class="text-sm text-muted-foreground">Prestige</p>
						</div>
						<div class="space-y-1">
							<p class="text-3xl font-bold text-primary">+{rewardsData.pyrs ?? 0}</p>
							<p class="text-sm text-muted-foreground">Pyrs {rewardsData.element ?? ''}</p>
						</div>
					</div>
				{:else}
					<div class="rounded-lg bg-background p-6 text-center">
						<p class="text-muted-foreground">Calcul des récompenses...</p>
					</div>
				{/if}

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
				success={challengeResult?.success ?? false}
				studentAnswer={challengeResult?.answer as string | number}
				correctAnswer={challengeResult?.correctAnswer as string | number}
				timeTaken={challengeResult?.timeTaken ?? 0}
			/>

			<Button onclick={handleChallengeContinue} size="lg" class="mt-6 w-full">Continuer</Button>
		</div>
	{:else if currentView === 'challenge'}
		<!-- Active Challenge -->
		<div class="mx-auto max-w-4xl p-8">
			{#if challengeInstance}
				<ChallengeContainer instance={challengeInstance} onsubmit={handleChallengeSubmit} />
			{/if}
		</div>
	{:else}
		<!-- Combat Arena -->
		<div class="combat-arena mx-auto max-w-7xl p-8">
			<div class="grid gap-6 lg:grid-cols-3">
				<!-- Left: Player Panel + Log -->
				<div class="space-y-6">
					<PlayerPanel
						playerName={data.gamePlayer.user_id}
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
								<Button type="submit" size="lg" class="w-full">Lancer le sort !</Button>
							</form>
						{/if}
					{:else}
						<div class="rounded-lg border border-border bg-card p-6 text-center">
							<p class="text-muted-foreground">
								Tu n'as pas de sorts ! Visite le grimoire pour en débloquer.
							</p>
							<Button href="/dashboard/navadra/spells" class="mt-4">Aller au grimoire</Button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{/key}
