<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import MySelect from '$lib/components/MySelect.svelte';
	import VipCardActionEditor from '$lib/components/vip-cards/VipCardActionEditor.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';
	import type { VipCardAction } from '$lib/types/vip-card';

	interface Props {
		card?: VipCardTemplate;
		onSave: (cardData: CreateTemplateData, imageFile?: File) => Promise<void>;
		onCancel: () => void;
	}

	interface CreateTemplateData {
		id: string;
		name: string;
		description: string;
		rarity: 'common' | 'rare' | 'epic' | 'legendary';
		category: 'bonus' | 'privilege' | 'social' | 'power';
		is_enabled: boolean;
		image_path: string;
		sort_order: number;
		action?: VipCardAction | null;
		activation_context: string | null;
	}

	const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

	let { card, onSave, onCancel }: Props = $props();

	// Form state using Svelte 5 $state
	let formData = $state<CreateTemplateData>({
		id: card?.id ?? '',
		name: card?.name ?? '',
		description: card?.description ?? '',
		rarity: (card?.rarity as 'common' | 'rare' | 'epic' | 'legendary') ?? 'common',
		category: (card?.category as 'bonus' | 'privilege' | 'social' | 'power') ?? 'bonus',
		is_enabled: card?.is_enabled ?? true,
		image_path: card?.image_path ?? '',
		sort_order: card?.sort_order ?? 0,
		action: card?.action as VipCardAction | null,
		activation_context: card?.activation_context ?? null
	});

	let saving = $state(false);

	// Image upload state
	let selectedFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let dragOver = $state(false);
	let fileInput: HTMLInputElement;

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) validateAndPreview(file);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const file = event.dataTransfer?.files[0];
		if (file) validateAndPreview(file);
	}

	function validateAndPreview(file: File) {
		if (!ACCEPTED_TYPES.includes(file.type)) {
			toaster.error('Formats acceptés : JPG, PNG, WebP');
			return;
		}
		if (file.size > 2 * 1024 * 1024) {
			toaster.error("L'image doit faire moins de 2MB");
			return;
		}
		selectedFile = file;
		const reader = new FileReader();
		reader.onload = (e) => {
			previewUrl = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function removeSelectedFile() {
		selectedFile = null;
		previewUrl = null;
	}

	// Dropdown items for MySelect
	const rarityItems = [
		{ value: 'common', label: 'Commune' },
		{ value: 'rare', label: 'Rare' },
		{ value: 'epic', label: 'Épique' },
		{ value: 'legendary', label: 'Légendaire' }
	];

	const categoryItems = [
		{ value: 'bonus', label: 'Bonus' },
		{ value: 'privilege', label: 'Privilège' },
		{ value: 'social', label: 'Social' },
		{ value: 'power', label: 'Pouvoir' }
	];

	const activationContextItems = [
		{ value: '', label: 'Approbation enseignant (défaut)' },
		{ value: 'any', label: 'Auto-activation libre' },
		{ value: 'minesweeper', label: 'Pendant une partie de démineur' }
	];

	// Bind helper: MySelect uses '' for "no selection", but we store null in DB
	let activationContextValue = $state(card?.activation_context ?? '');

	// Sync activationContextValue → formData.activation_context
	$effect(() => {
		formData.activation_context = activationContextValue === '' ? null : activationContextValue;
	});

	// Validation using Svelte 5 $derived - separate errors and validation
	const errors = $derived.by(() => {
		const newErrors: Record<string, string> = {};

		if (!formData.id.trim()) {
			newErrors.id = "L'ID est requis";
		} else if (!/^[a-z0-9_-]+$/.test(formData.id)) {
			newErrors.id = "L'ID doit contenir uniquement des lettres minuscules, chiffres, - et _";
		}

		if (!formData.name.trim()) {
			newErrors.name = 'Le nom est requis';
		} else if (formData.name.length > 100) {
			newErrors.name = 'Le nom doit faire moins de 100 caractères';
		}

		if (!formData.description.trim()) {
			newErrors.description = 'La description est requise';
		} else if (formData.description.length > 500) {
			newErrors.description = 'La description doit faire moins de 500 caractères';
		}

		if (formData.sort_order < 0) {
			newErrors.sort_order = "L'ordre doit être positif";
		}

		// Validate action parameters if action is set
		if (formData.action) {
			if (formData.action.type === 'draw_cards') {
				if (formData.action.count < 1 || formData.action.count > 10) {
					newErrors.action = 'Le nombre de cartes doit être entre 1 et 10';
				}
			} else if (formData.action.type === 'remove_warnings') {
				if (formData.action.count < 1 || formData.action.count > 5) {
					newErrors.action = "Le nombre d'avertissements doit être entre 1 et 5";
				}
			} else if (formData.action.type === 'add_gidouilles') {
				if (formData.action.amount < 1 || formData.action.amount > 200) {
					newErrors.action = 'Le nombre de gidouilles doit être entre 1 et 200';
				}
			} else if (formData.action.type === 'exchange_cards') {
				if (formData.action.exchange.mode === 'replace_random') {
					// Count is optional for flexible mode. If provided, validate range.
					if (
						formData.action.exchange.count !== undefined &&
						formData.action.exchange.count !== null &&
						(formData.action.exchange.count < 1 || formData.action.exchange.count > 10)
					) {
						newErrors.action = 'Le nombre de cartes à remplacer doit être entre 1 et 10';
					}
				} else if (formData.action.exchange.mode === 'discard_for_specific') {
					if (
						formData.action.exchange.discardCount < 1 ||
						formData.action.exchange.discardCount > 10
					) {
						newErrors.action = 'Le nombre de cartes à échanger doit être entre 1 et 10';
					}
					if (!formData.action.exchange.targetCardId.trim()) {
						newErrors.action = "L'ID de la carte cible est requis";
					}
				}
			}
		}

		return newErrors;
	});

	const isFormValid = $derived(Object.keys(errors).length === 0);

	async function handleSubmit() {
		if (!isFormValid) return;

		saving = true;
		try {
			const dataToSave: CreateTemplateData = {
				...formData,
				action: formData.action ?? null
			};
			await onSave(dataToSave, selectedFile ?? undefined);
		} finally {
			saving = false;
		}
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	class="space-y-4"
>
	<!-- ID Field -->
	<div class="space-y-2">
		<Label for="id">ID</Label>
		<Input
			id="id"
			bind:value={formData.id}
			placeholder="bonus_points_x2"
			disabled={!!card}
			class={errors.id ? 'border-destructive' : ''}
		/>
		{#if errors.id}
			<p class="text-sm text-destructive">{errors.id}</p>
		{/if}
		{#if card}
			<p class="text-xs text-muted-foreground">L'ID ne peut pas être modifié</p>
		{/if}
	</div>

	<!-- Name Field -->
	<div class="space-y-2">
		<Label for="name">Nom</Label>
		<Input
			id="name"
			bind:value={formData.name}
			placeholder="Bonus de Points x2"
			class={errors.name ? 'border-destructive' : ''}
		/>
		{#if errors.name}
			<p class="text-sm text-destructive">{errors.name}</p>
		{/if}
	</div>

	<!-- Description Field -->
	<div class="space-y-2">
		<Label for="description">Description</Label>
		<Textarea
			id="description"
			bind:value={formData.description}
			placeholder="Double les points gagnés lors du prochain exercice"
			rows={3}
			class={errors.description ? 'border-destructive' : ''}
		/>
		{#if errors.description}
			<p class="text-sm text-destructive">{errors.description}</p>
		{/if}
		<p class="text-xs text-muted-foreground">
			{formData.description.length} / 500 caractères
		</p>
	</div>

	<!-- Rarity Field - USING MySelect -->
	<div class="space-y-2">
		<Label for="rarity">Rareté</Label>
		<MySelect
			type="single"
			bind:value={formData.rarity}
			items={rarityItems}
			placeholder="Sélectionner une rareté"
		/>
	</div>

	<!-- Category Field - USING MySelect -->
	<div class="space-y-2">
		<Label for="category">Catégorie</Label>
		<MySelect
			type="single"
			bind:value={formData.category}
			items={categoryItems}
			placeholder="Sélectionner une catégorie"
		/>
	</div>

	<!-- Image Upload Zone -->
	<div class="space-y-2">
		<Label>Image de la carte</Label>

		{#if previewUrl}
			<!-- Preview of selected file -->
			<div class="flex items-center gap-4">
				<img src={previewUrl} alt="Aperçu" class="h-24 w-24 rounded border object-cover" />
				<div class="flex-1">
					<p class="text-sm">{selectedFile?.name}</p>
					<p class="text-xs text-muted-foreground">
						{((selectedFile?.size || 0) / 1024).toFixed(1)} KB
					</p>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="mt-1 h-auto p-0 text-xs text-destructive"
						onclick={removeSelectedFile}
					>
						Retirer
					</Button>
				</div>
			</div>
		{:else if card?.image_path}
			<!-- Current image from card -->
			<div class="flex items-center gap-4">
				<img src={card.image_path} alt={card.name} class="h-24 w-24 rounded border object-cover" />
				<p class="text-xs text-muted-foreground">Image actuelle</p>
			</div>
		{/if}

		<!-- Drop zone -->
		<div
			class="rounded-lg border-2 border-dashed p-4 text-center transition-colors {dragOver
				? 'border-primary bg-primary/5'
				: 'border-muted-foreground/25'}"
			ondrop={handleDrop}
			ondragover={(e) => {
				e.preventDefault();
				dragOver = true;
			}}
			ondragleave={() => (dragOver = false)}
			onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
			role="button"
			tabindex="0"
			aria-label="Zone de dépôt d'image"
		>
			<div class="space-y-1">
				<p class="text-sm text-muted-foreground">
					{previewUrl || card?.image_path ? "Changer l'image : " : ''}Glissez-déposez ou
					<button type="button" class="text-primary underline" onclick={() => fileInput.click()}>
						sélectionnez un fichier
					</button>
				</p>
				<p class="text-xs text-muted-foreground">JPG, PNG, WebP - Max 2MB</p>
			</div>

			<input
				bind:this={fileInput}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				onchange={handleFileSelect}
				class="hidden"
			/>
		</div>
	</div>

	<!-- Sort Order Field -->
	<div class="space-y-2">
		<Label for="sort_order">Ordre de tri</Label>
		<Input
			id="sort_order"
			type="number"
			bind:value={formData.sort_order}
			placeholder="0"
			class={errors.sort_order ? 'border-destructive' : ''}
		/>
		{#if errors.sort_order}
			<p class="text-sm text-destructive">{errors.sort_order}</p>
		{/if}
	</div>

	<!-- Is Enabled Checkbox -->
	<div class="flex items-center space-x-2">
		<Checkbox
			id="is_enabled"
			checked={formData.is_enabled}
			onCheckedChange={(checked) => (formData.is_enabled = !!checked)}
		/>
		<Label for="is_enabled" class="cursor-pointer">Carte activée</Label>
	</div>

	<!-- Action Configuration -->
	<VipCardActionEditor
		value={formData.action ?? null}
		onValueChange={(newAction) => {
			formData.action = newAction ?? null;
		}}
	/>

	<!-- Activation Context (only relevant if card has an action) -->
	{#if formData.action}
		<div class="space-y-2">
			<Label for="activation_context">Contexte d'activation</Label>
			<MySelect
				type="single"
				bind:value={activationContextValue}
				items={activationContextItems}
				placeholder="Sélectionner un contexte"
			/>
			<p class="text-xs text-muted-foreground">
				{#if formData.activation_context}
					L'élève peut activer cette carte sans approbation de l'enseignant
				{:else}
					L'élève doit demander l'approbation de l'enseignant avant d'activer
				{/if}
			</p>
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex justify-end gap-2 pt-4">
		<Button type="button" variant="outline" onclick={onCancel} disabled={saving}>Annuler</Button>
		<Button type="submit" disabled={!isFormValid || saving}>
			{saving ? 'Enregistrement...' : card ? 'Modifier' : 'Créer'}
		</Button>
	</div>
</form>
