<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { Check, ImageIcon, Trash2 } from 'lucide-svelte';
	import type { Database } from '$lib/types/database';
	import { categoryIcon } from './utils';
	import MySelect from '$lib/components/MySelect.svelte';

	type VipCardTemplate = Database['public']['Tables']['vip_card_templates']['Row'];
	type ActionType = 'draw_cards' | 'remove_warnings' | 'exchange_cards' | 'add_gidouilles';

	// Typed action interface (Database stores as Json, but we know the structure)
	interface TypedAction {
		type: ActionType;
		count?: number;
		amount?: number;
	}

	// Type guard to safely access action properties
	function isTypedAction(action: unknown): action is TypedAction {
		if (!action || typeof action !== 'object') return false;
		const a = action as Record<string, unknown>;
		return (
			typeof a.type === 'string' &&
			['draw_cards', 'remove_warnings', 'exchange_cards', 'add_gidouilles'].includes(a.type)
		);
	}

	interface Props {
		card: VipCardTemplate;
		isEnabled?: boolean;
		showActions?: boolean;
		onToggle?: (enabled: boolean) => void;
		onInlineEdit?: (
			name: string,
			description: string,
			action: VipCardTemplate['action'],
			rarity: VipCardTemplate['rarity']
		) => Promise<void>;
		onDelete?: () => void;
		onUploadImage?: () => void;
	}

	// Action display utilities
	function getActionIcon(type: ActionType | null): string {
		if (!type) return '❌';
		switch (type) {
			case 'draw_cards':
				return '🎴';
			case 'remove_warnings':
				return '⚠️';
			case 'exchange_cards':
				return '🔄';
			case 'add_gidouilles':
				return '💰';
		}
	}

	function getActionType(action: VipCardTemplate['action']): ActionType | null {
		return isTypedAction(action) ? action.type : null;
	}

	function getActionLabel(action: VipCardTemplate['action']): string {
		if (!isTypedAction(action)) return 'Aucune action';

		switch (action.type) {
			case 'draw_cards':
				return `Tirer ${action.count || 1} carte${(action.count || 1) > 1 ? 's' : ''}`;
			case 'remove_warnings':
				return `Retirer ${action.count || 1} avertissement${(action.count || 1) > 1 ? 's' : ''}`;
			case 'exchange_cards':
				return `Échanger ${action.count || 1} carte${(action.count || 1) > 1 ? 's' : ''}`;
			case 'add_gidouilles':
				return `Ajouter ${action.amount || 0} Gidouilles`;
		}
	}

	let {
		card,
		isEnabled,
		showActions = false,
		onToggle,
		onInlineEdit,
		onDelete,
		onUploadImage
	}: Props = $props();

	const currentEnabled = $derived(isEnabled ?? card.is_enabled);

	// Inline editing state
	let editingTitle = $state(false);
	let editingDescription = $state(false);
	let editingAction = $state(false);
	let editingRarity = $state(false);
	let tempName = $state(card.name);
	let tempDescription = $state(card.description);
	let tempActionType = $state<string | undefined>(
		isTypedAction(card.action) ? card.action.type : undefined
	);
	let tempActionValue = $state<number>(
		isTypedAction(card.action) && card.action.type === 'add_gidouilles'
			? card.action.amount || 0
			: isTypedAction(card.action)
				? card.action.count || 1
				: 1
	);
	let tempRarity = $state(card.rarity);
	let isSaving = $state(false);

	const isEditing = $derived(editingTitle || editingDescription || editingAction || editingRarity);

	// Action type options for select
	const actionTypeOptions = [
		{ value: '', label: 'Aucune action' },
		{ value: 'draw_cards', label: 'Tirer des cartes' },
		{ value: 'remove_warnings', label: 'Retirer des avertissements' },
		{ value: 'exchange_cards', label: 'Échanger des cartes' },
		{ value: 'add_gidouilles', label: 'Ajouter des Gidouilles' }
	];

	// Rarity options for select
	const rarityOptions = [
		{ value: 'common', label: 'Commune' },
		{ value: 'rare', label: 'Rare' },
		{ value: 'epic', label: 'Épique' },
		{ value: 'legendary', label: 'Légendaire' }
	];

	// Rarity gem colors (matching VipCard.svelte)
	const rarityGemInfo = $derived(
		{
			common: { color: '#9ca3af', glow: false },
			rare: { color: '#3b82f6', glow: true },
			epic: { color: '#a855f7', glow: true },
			legendary: { color: '#f59e0b', glow: true }
		}[card.rarity] || { color: '#9ca3af', glow: false }
	);

	// Reset all temp values to match current card state
	function resetTempValues() {
		tempName = card.name;
		tempDescription = card.description;
		tempRarity = card.rarity;
		if (isTypedAction(card.action)) {
			tempActionType = card.action.type;
			tempActionValue =
				card.action.type === 'add_gidouilles' ? card.action.amount || 0 : card.action.count || 1;
		} else {
			tempActionType = undefined;
			tempActionValue = 1;
		}
	}

	// Handle double-click to start editing
	function handleTitleDoubleClick() {
		if (!onInlineEdit || !showActions) return;
		resetTempValues();
		editingTitle = true;
	}

	function handleDescriptionDoubleClick() {
		if (!onInlineEdit || !showActions) return;
		resetTempValues();
		editingDescription = true;
	}

	function handleActionDoubleClick() {
		if (!onInlineEdit || !showActions) return;
		resetTempValues();
		editingAction = true;
	}

	function handleRarityDoubleClick() {
		if (!onInlineEdit || !showActions) return;
		resetTempValues();
		editingRarity = true;
	}

	// Handle ESC key to cancel editing
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			cancelEditing();
		}
	}

	function cancelEditing() {
		editingTitle = false;
		editingDescription = false;
		editingAction = false;
		editingRarity = false;
		resetTempValues();
	}

	// Build action object from temp state
	function buildAction(): VipCardTemplate['action'] {
		if (!tempActionType || tempActionType === '') return null;

		if (tempActionType === 'add_gidouilles') {
			return { type: tempActionType, amount: tempActionValue };
		} else {
			return { type: tempActionType as ActionType, count: tempActionValue };
		}
	}

	// Handle save
	async function handleSave() {
		if (!onInlineEdit || isSaving) return;

		isSaving = true;
		try {
			const action = buildAction();
			await onInlineEdit(tempName, tempDescription, action, tempRarity);
			editingTitle = false;
			editingDescription = false;
			editingAction = false;
			editingRarity = false;
		} catch (error) {
			// Error handled by parent component
			console.error('Save failed:', error);
		} finally {
			isSaving = false;
		}
	}

	// Auto-resize textarea
	function autoResize(el: HTMLTextAreaElement) {
		el.style.height = 'auto';
		el.style.height = el.scrollHeight + 'px';
	}

	// Auto-focus action for textarea
	function autoFocus(el: HTMLTextAreaElement) {
		el.focus();
		el.select();
		autoResize(el);
	}
</script>

<div
	class="group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:shadow-md"
>
	<!-- Card Image Container -->
	<div class="relative aspect-square bg-muted">
		{#if card.image_path}
			<img src={card.image_path} alt={card.name} class="h-full w-full object-cover" />
		{:else}
			<div class="flex h-full w-full items-center justify-center text-6xl">
				{categoryIcon(card.category || 'gameplay')}
			</div>
		{/if}

		<!-- Rarity Diamond (Top Left) - Editable on double-click -->
		{#if editingRarity}
			<div class="absolute top-2 left-2 z-10 w-32">
				<MySelect type="single" bind:value={tempRarity} items={rarityOptions} />
			</div>
		{:else}
			<div class="absolute top-2 left-2 z-10">
				<div
					class="h-8 w-8 rounded-full bg-white/80 p-1.5 shadow-lg backdrop-blur-sm transition-all {onInlineEdit &&
					showActions
						? 'cursor-pointer hover:scale-110'
						: ''}"
					style="color: {rarityGemInfo.color}; {rarityGemInfo.glow
						? 'filter: drop-shadow(0 0 4px currentColor) drop-shadow(0 0 8px currentColor);'
						: ''}"
					ondblclick={handleRarityDoubleClick}
					title={onInlineEdit && showActions ? 'Double-cliquez pour éditer la rareté' : card.rarity}
				>
					<svg class="h-full w-full" viewBox="0 0 24 24" fill="none">
						<path
							d="M12 2L4 8L2 12L12 22L22 12L20 8L12 2Z"
							fill="currentColor"
							stroke="currentColor"
							stroke-width="1.5"
						/>
						<path d="M12 2L8 8H16L12 2Z" fill="white" opacity="0.3" />
						<path d="M4 8L8 8L12 22L4 8Z" fill="black" opacity="0.2" />
						<path d="M20 8L16 8L12 22L20 8Z" fill="black" opacity="0.2" />
					</svg>
				</div>
			</div>
		{/if}

		{#if showActions}
			<!-- Save Button (Top Right) - Only shown during editing -->
			{#if isEditing && onInlineEdit}
				<button
					type="button"
					class="absolute top-2 right-2 z-10 rounded-full bg-green-500 p-2 text-white shadow-lg transition-all hover:scale-110 hover:bg-green-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={(e) => {
						e.stopPropagation();
						handleSave();
					}}
					disabled={isSaving}
					aria-label="Sauvegarder les modifications"
				>
					<Check class="h-4 w-4" />
				</button>
			{/if}

			<!-- Upload Image Button (Bottom Left) -->
			{#if onUploadImage}
				<button
					type="button"
					class="absolute bottom-2 left-2 z-10 rounded-full bg-purple-500 p-2 text-white shadow-lg transition-all hover:scale-110 hover:bg-purple-600 active:scale-95"
					onclick={(e) => {
						e.stopPropagation();
						onUploadImage();
					}}
					aria-label="Changer l'image"
				>
					<ImageIcon class="h-4 w-4" />
				</button>
			{/if}

			<!-- Delete Button (Bottom Right) -->
			{#if onDelete}
				<button
					type="button"
					class="absolute right-2 bottom-2 z-10 rounded-full bg-destructive p-2 text-destructive-foreground shadow-lg transition-all hover:scale-110 hover:bg-destructive/90 active:scale-95"
					onclick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
					aria-label="Supprimer la carte"
				>
					<Trash2 class="h-4 w-4" />
				</button>
			{/if}
		{/if}
	</div>

	<!-- Card Content -->
	<div class="space-y-2 bg-card p-3">
		<div class="space-y-1">
			<!-- Title - Editable on double-click -->
			{#if editingTitle}
				<textarea
					bind:value={tempName}
					onkeydown={handleKeyDown}
					oninput={(e) => autoResize(e.currentTarget)}
					class="w-full resize-none overflow-hidden rounded border border-primary bg-background px-2 py-1 text-sm font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
					placeholder="Nom de la carte"
					rows="1"
					autofocus
					use:autoFocus
				/>
			{:else}
				<h3
					class="truncate text-sm font-semibold {card.name
						? ''
						: 'text-muted-foreground/50 italic'} {onInlineEdit && showActions
						? 'cursor-pointer hover:text-primary'
						: ''}"
					ondblclick={handleTitleDoubleClick}
					title={onInlineEdit && showActions ? 'Double-cliquez pour éditer' : card.name}
				>
					{card.name || (onInlineEdit && showActions ? '(Sans nom)' : '')}
				</h3>
			{/if}

			<!-- Description - Editable on double-click -->
			{#if editingDescription}
				<textarea
					bind:value={tempDescription}
					onkeydown={handleKeyDown}
					oninput={(e) => autoResize(e.currentTarget)}
					class="w-full resize-none overflow-hidden rounded border border-primary bg-background px-2 py-1 text-xs text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
					placeholder="Description de la carte"
					rows="2"
					autofocus
					use:autoFocus
				/>
			{:else}
				<p
					class="line-clamp-2 text-xs {card.description
						? 'text-muted-foreground'
						: 'text-muted-foreground/50 italic'} {onInlineEdit && showActions
						? 'cursor-pointer hover:text-primary'
						: ''}"
					ondblclick={handleDescriptionDoubleClick}
					title={onInlineEdit && showActions ? 'Double-cliquez pour éditer' : card.description}
				>
					{card.description ||
						(onInlineEdit && showActions ? '(Double-cliquez pour ajouter une description)' : '')}
				</p>
			{/if}

			<!-- Action - Editable on double-click -->
			{#if editingAction}
				<div class="space-y-2 rounded border border-primary bg-background p-2">
					<MySelect
						type="single"
						bind:value={tempActionType}
						items={actionTypeOptions}
						placeholder="Type d'action"
					/>
					{#if tempActionType && tempActionType !== ''}
						<input
							type="number"
							bind:value={tempActionValue}
							min="0"
							max="999"
							class="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
							placeholder={tempActionType === 'add_gidouilles' ? 'Montant' : 'Nombre'}
						/>
					{/if}
				</div>
			{:else}
				<div
					class="flex items-center gap-1 text-xs {onInlineEdit && showActions
						? 'cursor-pointer hover:text-primary'
						: 'text-muted-foreground'}"
					ondblclick={handleActionDoubleClick}
					title={onInlineEdit && showActions
						? 'Double-cliquez pour éditer'
						: getActionLabel(card.action)}
				>
					<span>{getActionIcon(getActionType(card.action))}</span>
					<span>{getActionLabel(card.action)}</span>
				</div>
			{/if}
		</div>

		<!-- Toggle Switch -->
		{#if onToggle}
			<div class="flex items-center justify-between border-t pt-2">
				<span class="text-xs font-medium">{currentEnabled ? 'Activée' : 'Désactivée'}</span>
				<Switch checked={currentEnabled} onCheckedChange={(checked) => onToggle(!!checked)} />
			</div>
		{/if}
	</div>
</div>
