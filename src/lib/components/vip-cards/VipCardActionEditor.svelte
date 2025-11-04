<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import type { VipCardAction } from '$lib/types/vip-card';
	import type { WarningType } from '$lib/server/warnings';
	import { getRarityPoints } from '$lib/types/vip-card';

	interface Props {
		value: VipCardAction | null;
		onValueChange: (action: VipCardAction | null) => void;
	}

	let { value, onValueChange }: Props = $props();

	// Internal state for building the action
	let actionType = $state<string>(value?.type ?? 'none');

	// Parameters for each action type
	let drawCardsCount = $state<number>(value?.type === 'draw_cards' ? value.count : 2);
	let removeWarningsCount = $state<number>(value?.type === 'remove_warnings' ? value.count : 1);
	let removeWarningsType = $state<string>(
		value?.type === 'remove_warnings' && value.warningType ? value.warningType : 'none'
	);
	let addGidouillesAmount = $state<number>(value?.type === 'add_gidouilles' ? value.amount : 50);

	// Exchange cards parameters
	let exchangeMode = $state<string>(
		value?.type === 'exchange_cards' ? value.exchange.mode : 'replace_random'
	);
	let replaceRandomCount = $state<number>(
		value?.type === 'exchange_cards' && value.exchange.mode === 'replace_random'
			? value.exchange.count
			: 3
	);
	let rarityPointsTargetRarity = $state<string>(
		value?.type === 'exchange_cards' && value.exchange.mode === 'rarity_points'
			? value.exchange.targetRarity
			: 'common'
	);
	let discardForSpecificCount = $state<number>(
		value?.type === 'exchange_cards' && value.exchange.mode === 'discard_for_specific'
			? value.exchange.discardCount
			: 3
	);
	let discardForSpecificTargetCardId = $state<string>(
		value?.type === 'exchange_cards' && value.exchange.mode === 'discard_for_specific'
			? value.exchange.targetCardId
			: ''
	);

	// Action type options
	const actionTypeItems = [
		{ value: 'none', label: 'Aucune (carte collectionnable uniquement)' },
		{ value: 'draw_cards', label: 'Piocher des cartes' },
		{ value: 'remove_warnings', label: 'Retirer des avertissements' },
		{ value: 'exchange_cards', label: 'Échanger des cartes' },
		{ value: 'add_gidouilles', label: 'Ajouter des gidouilles' }
	];

	// Warning type options
	const warningTypeItems = [
		{ value: 'none', label: 'Tous les types' },
		{ value: 'C', label: 'Comportement' },
		{ value: 'M', label: 'Matériel' },
		{ value: 'R', label: 'Retard' },
		{ value: 'T', label: 'Travail' }
	];

	// Exchange mode options
	const exchangeModeItems = [
		{ value: 'replace_random', label: 'Remplacer des cartes aléatoires' },
		{ value: 'rarity_points', label: 'Système de points de rareté' },
		{ value: 'discard_for_specific', label: 'Échanger contre une carte spécifique' }
	];

	// Rarity options for rarity points mode
	const rarityItems = [
		{ value: 'common', label: 'Commune (1 point)' },
		{ value: 'rare', label: 'Rare (3 points)' },
		{ value: 'epic', label: 'Épique (9 points)' },
		{ value: 'legendary', label: 'Légendaire (27 points)' }
	];

	// Auto-calculated points required based on target rarity
	const pointsRequired = $derived(
		getRarityPoints(rarityPointsTargetRarity as 'common' | 'rare' | 'epic' | 'legendary')
	);

	// Build the complete VipCardAction based on current state
	const currentAction = $derived.by((): VipCardAction | null => {
		if (actionType === 'none') {
			return null;
		}

		if (actionType === 'draw_cards') {
			return {
				type: 'draw_cards',
				count: drawCardsCount
			};
		}

		if (actionType === 'remove_warnings') {
			return {
				type: 'remove_warnings',
				count: removeWarningsCount,
				...(removeWarningsType !== 'none' && { warningType: removeWarningsType as WarningType })
			};
		}

		if (actionType === 'add_gidouilles') {
			return {
				type: 'add_gidouilles',
				amount: addGidouillesAmount
			};
		}

		if (actionType === 'exchange_cards') {
			if (exchangeMode === 'replace_random') {
				return {
					type: 'exchange_cards',
					exchange: {
						mode: 'replace_random',
						count: replaceRandomCount
					}
				};
			}

			if (exchangeMode === 'rarity_points') {
				return {
					type: 'exchange_cards',
					exchange: {
						mode: 'rarity_points',
						targetRarity: rarityPointsTargetRarity as 'common' | 'rare' | 'epic' | 'legendary',
						pointsRequired
					}
				};
			}

			if (exchangeMode === 'discard_for_specific') {
				return {
					type: 'exchange_cards',
					exchange: {
						mode: 'discard_for_specific',
						discardCount: discardForSpecificCount,
						targetCardId: discardForSpecificTargetCardId
					}
				};
			}
		}

		return null;
	});

	// Effect to sync changes back to parent
	$effect(() => {
		onValueChange(currentAction);
	});

	// Reset parameters when action type changes
	function handleActionTypeChange(newType: string) {
		actionType = newType;

		// Reset to default values when switching action types
		if (newType === 'draw_cards') {
			drawCardsCount = 2;
		} else if (newType === 'remove_warnings') {
			removeWarningsCount = 1;
			removeWarningsType = 'none';
		} else if (newType === 'add_gidouilles') {
			addGidouillesAmount = 50;
		} else if (newType === 'exchange_cards') {
			exchangeMode = 'replace_random';
			replaceRandomCount = 3;
		}
	}

	// Reset exchange-specific parameters when exchange mode changes
	function handleExchangeModeChange(newMode: string) {
		exchangeMode = newMode;

		// Reset to defaults
		if (newMode === 'replace_random') {
			replaceRandomCount = 3;
		} else if (newMode === 'rarity_points') {
			rarityPointsTargetRarity = 'common';
		} else if (newMode === 'discard_for_specific') {
			discardForSpecificCount = 3;
			discardForSpecificTargetCardId = '';
		}
	}
</script>

<div class="space-y-4 rounded-lg border p-4">
	<h3 class="font-semibold">Action de la carte</h3>

	<!-- Action Type Selector -->
	<div class="space-y-2">
		<Label for="action-type">Type d'action</Label>
		<MySelect
			type="single"
			value={actionType}
			items={actionTypeItems}
			placeholder="Sélectionner un type d'action"
			triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
			onValueChange={(newValue) => {
				if (newValue && typeof newValue === 'string') {
					handleActionTypeChange(newValue);
				}
			}}
		/>
	</div>

	<!-- Conditional parameter sections based on action type -->
	{#if actionType === 'none'}
		<div class="rounded-md bg-muted p-3">
			<p class="text-sm text-muted-foreground">
				Cette carte sera uniquement collectionnable et n'aura pas d'action spéciale.
			</p>
		</div>
	{:else if actionType === 'draw_cards'}
		<div class="space-y-2">
			<Label for="draw-count">Nombre de cartes à piocher</Label>
			<Input
				id="draw-count"
				type="number"
				bind:value={drawCardsCount}
				min={1}
				max={10}
				class="w-32"
			/>
			<p class="text-sm text-muted-foreground">
				L'élève piochera {drawCardsCount} nouvelle{drawCardsCount > 1 ? 's' : ''} carte{drawCardsCount >
				1
					? 's'
					: ''} VIP aléatoire{drawCardsCount > 1 ? 's' : ''}.
			</p>
		</div>
	{:else if actionType === 'remove_warnings'}
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="warning-count">Nombre d'avertissements à retirer</Label>
				<Input
					id="warning-count"
					type="number"
					bind:value={removeWarningsCount}
					min={1}
					max={5}
					class="w-32"
				/>
			</div>
			<div class="space-y-2">
				<Label for="warning-type">Type d'avertissement (optionnel)</Label>
				<MySelect
					type="single"
					bind:value={removeWarningsType}
					items={warningTypeItems}
					placeholder="Sélectionner un type"
					triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
				/>
				<p class="text-sm text-muted-foreground">
					{#if removeWarningsType === 'none'}
						Retire {removeWarningsCount} avertissement{removeWarningsCount > 1 ? 's' : ''} de n'importe
						quel type.
					{:else}
						Retire {removeWarningsCount} avertissement{removeWarningsCount > 1 ? 's' : ''} de type
						{warningTypeItems
							.find((item) => item.value === removeWarningsType)
							?.label.toLowerCase()}.
					{/if}
				</p>
			</div>
		</div>
	{:else if actionType === 'add_gidouilles'}
		<div class="space-y-2">
			<Label for="gidouilles-amount">Nombre de gidouilles</Label>
			<Input
				id="gidouilles-amount"
				type="number"
				bind:value={addGidouillesAmount}
				min={1}
				max={200}
				class="w-32"
			/>
			<p class="text-sm text-muted-foreground">
				Ajoute {addGidouillesAmount} gidouille{addGidouillesAmount > 1 ? 's' : ''} au solde de l'élève.
			</p>
		</div>
	{:else if actionType === 'exchange_cards'}
		<div class="space-y-4">
			<!-- Exchange Mode Selector -->
			<div class="space-y-2">
				<Label for="exchange-mode">Mode d'échange</Label>
				<MySelect
					type="single"
					value={exchangeMode}
					items={exchangeModeItems}
					placeholder="Sélectionner un mode"
					triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					onValueChange={(newValue) => {
						if (newValue && typeof newValue === 'string') {
							handleExchangeModeChange(newValue);
						}
					}}
				/>
			</div>

			<!-- Mode-specific parameters -->
			{#if exchangeMode === 'replace_random'}
				<div class="space-y-2">
					<Label for="replace-count">Nombre de cartes à remplacer</Label>
					<Input
						id="replace-count"
						type="number"
						bind:value={replaceRandomCount}
						min={1}
						max={10}
						class="w-32"
					/>
					<p class="text-sm text-muted-foreground">
						L'élève échange {replaceRandomCount} carte{replaceRandomCount > 1 ? 's' : ''} aléatoire{replaceRandomCount >
						1
							? 's'
							: ''} contre {replaceRandomCount} nouvelle{replaceRandomCount > 1 ? 's' : ''} carte{replaceRandomCount >
						1
							? 's'
							: ''}.
					</p>
				</div>
			{:else if exchangeMode === 'rarity_points'}
				<div class="space-y-2">
					<Label for="target-rarity">Rareté cible</Label>
					<MySelect
						type="single"
						bind:value={rarityPointsTargetRarity}
						items={rarityItems}
						placeholder="Sélectionner une rareté"
						triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
					<div class="rounded-md bg-muted p-3">
						<p class="text-sm font-medium">Points requis : {pointsRequired}</p>
						<p class="mt-1 text-xs text-muted-foreground">
							Système de points : Commune=1, Rare=3, Épique=9, Légendaire=27
						</p>
						<p class="mt-1 text-xs text-muted-foreground">
							L'élève peut échanger plusieurs cartes dont la somme des points correspond à la rareté
							cible.
						</p>
					</div>
				</div>
			{:else if exchangeMode === 'discard_for_specific'}
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="discard-count">Nombre de cartes à échanger</Label>
						<Input
							id="discard-count"
							type="number"
							bind:value={discardForSpecificCount}
							min={1}
							max={10}
							class="w-32"
						/>
					</div>
					<div class="space-y-2">
						<Label for="target-card-id">ID de la carte cible</Label>
						<Input
							id="target-card-id"
							type="text"
							bind:value={discardForSpecificTargetCardId}
							placeholder="bonus"
							class="w-full"
						/>
						<p class="text-sm text-muted-foreground">
							L'élève échange {discardForSpecificCount} carte{discardForSpecificCount > 1
								? 's'
								: ''} contre une carte spécifique (ID : {discardForSpecificTargetCardId ||
								'à définir'}).
						</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
