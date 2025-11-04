<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { Check, ImageIcon, Trash2 } from 'lucide-svelte';
	import type { Database } from '$lib/types/database';
	import { categoryIcon } from './utils';

	type VipCardTemplate = Database['public']['Tables']['vip_card_templates']['Row'];

	interface Props {
		card: VipCardTemplate;
		isEnabled?: boolean;
		showActions?: boolean;
		onToggle?: (enabled: boolean) => void;
		onInlineEdit?: (name: string, description: string) => Promise<void>;
		onDelete?: () => void;
		onUploadImage?: () => void;
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
	let tempName = $state(card.name);
	let tempDescription = $state(card.description);
	let isSaving = $state(false);

	const isEditing = $derived(editingTitle || editingDescription);

	// Rarity gem colors (matching VipCard.svelte)
	const rarityGemInfo = $derived(
		{
			common: { color: '#9ca3af', glow: false },
			rare: { color: '#3b82f6', glow: true },
			epic: { color: '#a855f7', glow: true },
			legendary: { color: '#f59e0b', glow: true }
		}[card.rarity] || { color: '#9ca3af', glow: false }
	);

	// Handle double-click to start editing
	function handleTitleDoubleClick() {
		if (!onInlineEdit || !showActions) return;
		tempName = card.name;
		editingTitle = true;
	}

	function handleDescriptionDoubleClick() {
		if (!onInlineEdit || !showActions) return;
		tempDescription = card.description;
		editingDescription = true;
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
		tempName = card.name;
		tempDescription = card.description;
	}

	// Handle save
	async function handleSave() {
		if (!onInlineEdit || isSaving) return;

		isSaving = true;
		try {
			await onInlineEdit(tempName, tempDescription);
			editingTitle = false;
			editingDescription = false;
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
				{categoryIcon(card.category)}
			</div>
		{/if}

		<!-- Rarity Diamond (Top Left) -->
		<div class="absolute top-2 left-2 z-10">
			<div
				class="h-8 w-8 rounded-full bg-white/80 p-1.5 shadow-lg backdrop-blur-sm"
				style="color: {rarityGemInfo.color}; {rarityGemInfo.glow
					? 'filter: drop-shadow(0 0 4px currentColor) drop-shadow(0 0 8px currentColor);'
					: ''}"
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
					class="truncate text-sm font-semibold {onInlineEdit && showActions
						? 'cursor-pointer hover:text-primary'
						: ''}"
					ondblclick={handleTitleDoubleClick}
					title={onInlineEdit && showActions ? 'Double-cliquez pour éditer' : card.name}
				>
					{card.name}
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
					class="line-clamp-2 text-xs text-muted-foreground {onInlineEdit && showActions
						? 'cursor-pointer hover:text-primary'
						: ''}"
					ondblclick={handleDescriptionDoubleClick}
					title={onInlineEdit && showActions ? 'Double-cliquez pour éditer' : card.description}
				>
					{card.description}
				</p>
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
