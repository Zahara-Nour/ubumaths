<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import type { VipCardAction, VipCardRarity } from '$lib/types/vip-card';
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

	// draw_cards filters
	let drawForceRarity = $state<VipCardRarity | undefined>(
		value?.type === 'draw_cards' && value.filters?.forceRarity
			? value.filters.forceRarity
			: undefined
	);
	let drawMinRarity = $state<VipCardRarity | undefined>(
		value?.type === 'draw_cards' && value.filters?.minRarity ? value.filters.minRarity : undefined
	);
	let drawExcludeCardIds = $state<string>(
		value?.type === 'draw_cards' && value.filters?.excludeCardIds
			? value.filters.excludeCardIds.join(', ')
			: ''
	);
	let drawOnlyCardsWithActions = $state<boolean>(
		value?.type === 'draw_cards' && value.filters?.onlyCardsWithActions
			? value.filters.onlyCardsWithActions
			: false
	);

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

	// Choose cards parameters
	let chooseCardCount = $state<number>(value?.type === 'choose_card' ? value.count : 1);
	let chooseCardFilterMode = $state<string>(
		value?.type === 'choose_card'
			? value.filter
				? 'all'
				: value.maxRarity
					? 'maxRarity'
					: value.possibleCardIds
						? 'specific'
						: 'all'
			: 'all'
	);
	let chooseCardMaxRarity = $state<string>(
		value?.type === 'choose_card' && value.maxRarity ? value.maxRarity : 'common'
	);
	let chooseCardPossibleIds = $state<string>(
		value?.type === 'choose_card' && value.possibleCardIds ? value.possibleCardIds.join(', ') : ''
	);

	// Action type options
	const actionTypeItems = [
		{ value: 'none', label: 'Aucune (carte collectionnable uniquement)' },
		{ value: 'draw_cards', label: 'Piocher des cartes' },
		{ value: 'remove_warnings', label: 'Retirer des avertissements' },
		{ value: 'exchange_cards', label: 'Échanger des cartes' },
		{ value: 'add_gidouilles', label: 'Ajouter des gidouilles' },
		{ value: 'choose_card', label: 'Choisir des cartes spécifiques' }
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

	// Rarity options for choose_card max rarity filter (no points display)
	const maxRarityItems = [
		{ value: 'common', label: 'Commune' },
		{ value: 'rare', label: 'Rare' },
		{ value: 'epic', label: 'Épique' },
		{ value: 'legendary', label: 'Légendaire' }
	];

	// Rarity filter options for draw_cards (with undefined option for "no filter")
	const drawRarityFilterItems = [
		{ value: undefined, label: 'Aucune contrainte' },
		{ value: 'common', label: 'Commune' },
		{ value: 'rare', label: 'Rare' },
		{ value: 'epic', label: 'Épique' },
		{ value: 'legendary', label: 'Légendaire' }
	];

	// Filter mode options for choose_card
	const chooseCardFilterModeItems = [
		{ value: 'all', label: 'Toutes les cartes' },
		{ value: 'maxRarity', label: 'Limiter par rareté maximale' },
		{ value: 'specific', label: 'Cartes spécifiques (IDs)' }
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
			const filters: {
				forceRarity?: VipCardRarity;
				minRarity?: VipCardRarity;
				excludeCardIds?: string[];
				onlyCardsWithActions?: boolean;
			} = {};

			if (drawForceRarity) filters.forceRarity = drawForceRarity;
			if (drawMinRarity) filters.minRarity = drawMinRarity;
			if (drawExcludeCardIds.trim()) {
				filters.excludeCardIds = drawExcludeCardIds
					.split(',')
					.map((id) => id.trim())
					.filter((id) => id);
			}
			if (drawOnlyCardsWithActions) filters.onlyCardsWithActions = true;

			return {
				type: 'draw_cards',
				count: drawCardsCount,
				...(Object.keys(filters).length > 0 ? { filters } : {})
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

		if (actionType === 'choose_card') {
			const baseAction = {
				type: 'choose_card' as const,
				count: chooseCardCount
			};

			if (chooseCardFilterMode === 'all') {
				return {
					...baseAction,
					filter: 'all' as const
				};
			}

			if (chooseCardFilterMode === 'maxRarity') {
				return {
					...baseAction,
					maxRarity: chooseCardMaxRarity as 'common' | 'rare' | 'epic' | 'legendary'
				};
			}

			if (chooseCardFilterMode === 'specific') {
				// Parse comma-separated card IDs
				const cardIds = chooseCardPossibleIds
					.split(',')
					.map((id) => id.trim())
					.filter((id) => id.length > 0);

				if (cardIds.length > 0) {
					return {
						...baseAction,
						possibleCardIds: cardIds
					};
				}
			}

			// Default to 'all' if no valid filter
			return {
				...baseAction,
				filter: 'all' as const
			};
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
			drawForceRarity = undefined;
			drawMinRarity = undefined;
			drawExcludeCardIds = '';
			drawOnlyCardsWithActions = false;
		} else if (newType === 'remove_warnings') {
			removeWarningsCount = 1;
			removeWarningsType = 'none';
		} else if (newType === 'add_gidouilles') {
			addGidouillesAmount = 50;
		} else if (newType === 'exchange_cards') {
			exchangeMode = 'replace_random';
			replaceRandomCount = 3;
		} else if (newType === 'choose_card') {
			chooseCardCount = 1;
			chooseCardFilterMode = 'all';
			chooseCardMaxRarity = 'common';
			chooseCardPossibleIds = '';
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
		<div class="space-y-4">
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

			<!-- Advanced Filters Section -->
			<div class="space-y-4 rounded-lg border border-border bg-muted/50 p-4">
				<h4 class="text-sm font-semibold">Filtres avancés (optionnel)</h4>

				<div class="space-y-4">
					<!-- Force Rarity -->
					<div class="space-y-2">
						<Label for="draw-force-rarity">Forcer la rareté</Label>
						<MySelect
							type="single"
							bind:value={drawForceRarity}
							items={drawRarityFilterItems}
							placeholder="Choisir une rareté..."
							triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
						/>
						<p class="text-xs text-muted-foreground">
							Toutes les cartes tirées auront cette rareté
						</p>
					</div>

					<!-- Min Rarity -->
					<div class="space-y-2">
						<Label for="draw-min-rarity">Rareté minimale garantie</Label>
						<MySelect
							type="single"
							bind:value={drawMinRarity}
							items={drawRarityFilterItems}
							placeholder="Choisir une rareté..."
							triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
						/>
						<p class="text-xs text-muted-foreground">Au moins 1 carte aura cette rareté minimale</p>
					</div>

					<!-- Mutual exclusivity warning -->
					{#if drawForceRarity && drawMinRarity}
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							⚠️ "Forcer la rareté" et "Rareté minimale garantie" sont mutuellement exclusifs
						</div>
					{/if}

					<!-- Exclude Card IDs -->
					<div class="space-y-2">
						<Label for="draw-exclude-ids">Exclure des cartes (IDs)</Label>
						<Input
							id="draw-exclude-ids"
							type="text"
							bind:value={drawExcludeCardIds}
							placeholder="bonus, super-bonus, Sheikh"
							class="w-full"
						/>
						<p class="text-xs text-muted-foreground">
							Liste d'IDs de cartes à exclure du tirage (séparés par des virgules)
						</p>
					</div>

					<!-- Only Cards With Actions -->
					<div class="flex items-center space-x-2">
						<MyCheckbox
							bind:checked={drawOnlyCardsWithActions}
							label="Tirer uniquement des cartes avec actions"
						/>
					</div>
				</div>
			</div>
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
	{:else if actionType === 'choose_card'}
		<div class="space-y-4">
			<!-- Card Count -->
			<div class="space-y-2">
				<Label for="choose-card-count">Nombre de cartes à choisir</Label>
				<Input
					id="choose-card-count"
					type="number"
					bind:value={chooseCardCount}
					min={1}
					max={10}
					class="w-32"
				/>
				<p class="text-sm text-muted-foreground">
					L'élève pourra choisir {chooseCardCount} carte{chooseCardCount > 1 ? 's' : ''} VIP.
				</p>
			</div>

			<!-- Filter Mode Selector -->
			<div class="space-y-2">
				<Label for="choose-filter-mode">Mode de filtrage</Label>
				<MySelect
					type="single"
					bind:value={chooseCardFilterMode}
					items={chooseCardFilterModeItems}
					placeholder="Sélectionner un mode de filtrage"
					triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
				/>
			</div>

			<!-- Filter Mode Parameters -->
			{#if chooseCardFilterMode === 'all'}
				<div class="rounded-md bg-muted p-3">
					<p class="text-sm text-muted-foreground">
						L'élève pourra choisir parmi toutes les cartes VIP disponibles.
					</p>
				</div>
			{:else if chooseCardFilterMode === 'maxRarity'}
				<div class="space-y-2">
					<Label for="choose-max-rarity">Rareté maximale</Label>
					<MySelect
						type="single"
						bind:value={chooseCardMaxRarity}
						items={maxRarityItems}
						placeholder="Sélectionner une rareté"
						triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
					<div class="rounded-md bg-muted p-3">
						<p class="text-sm text-muted-foreground">
							{#if chooseCardMaxRarity === 'common'}
								L'élève ne pourra choisir que des cartes <strong>communes</strong>.
							{:else if chooseCardMaxRarity === 'rare'}
								L'élève pourra choisir des cartes <strong>communes</strong> ou
								<strong>rares</strong>.
							{:else if chooseCardMaxRarity === 'epic'}
								L'élève pourra choisir des cartes <strong>communes</strong>,
								<strong>rares</strong> ou <strong>épiques</strong>.
							{:else}
								L'élève pourra choisir parmi toutes les raretés (communes, rares, épiques,
								légendaires).
							{/if}
						</p>
					</div>
				</div>
			{:else if chooseCardFilterMode === 'specific'}
				<div class="space-y-2">
					<Label for="choose-card-ids">IDs des cartes autorisées (séparés par des virgules)</Label>
					<Input
						id="choose-card-ids"
						type="text"
						bind:value={chooseCardPossibleIds}
						placeholder="bonus, super-bonus, mega-bonus"
						class="w-full"
					/>
					<div class="rounded-md bg-muted p-3">
						<p class="text-sm font-medium">
							Cartes autorisées : {chooseCardPossibleIds || 'aucune'}
						</p>
						<p class="mt-1 text-xs text-muted-foreground">
							Séparez les IDs de cartes par des virgules. L'élève ne pourra choisir que parmi ces
							cartes spécifiques.
						</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
