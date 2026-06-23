<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
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
		uses_total: number | null;
		base_price: number;
		is_purchasable: boolean;
		max_owned_per_student: number;
	}

	const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

	let { card, onSave, onCancel }: Props = $props();

	// Snapshot of the initial card prop for $state initializers.
	// This editor initializes once from the prop and then evolves independently.
	// svelte-ignore state_referenced_locally
	const initialCard = card;

	// Form state using Svelte 5 $state
	let formData = $state<CreateTemplateData>({
		id: initialCard?.id ?? '',
		name: initialCard?.name ?? '',
		description: initialCard?.description ?? '',
		rarity: (initialCard?.rarity as 'common' | 'rare' | 'epic' | 'legendary') ?? 'common',
		category: (initialCard?.category as 'bonus' | 'privilege' | 'social' | 'power') ?? 'bonus',
		is_enabled: initialCard?.is_enabled ?? true,
		image_path: initialCard?.image_path ?? '',
		sort_order: initialCard?.sort_order ?? 0,
		action: initialCard?.action as VipCardAction | null,
		uses_total: initialCard?.uses_total ?? null,
		base_price: initialCard?.base_price ?? 0,
		is_purchasable: initialCard?.is_purchasable ?? true,
		max_owned_per_student: initialCard?.max_owned_per_student ?? 5
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

	// Consumable state: checkbox drives whether uses_total is set
	let isConsumable = $state(
		initialCard?.uses_total !== null && initialCard?.uses_total !== undefined
	);
	let usesTotalInput = $state(initialCard?.uses_total ?? 3);

	// Sync consumable state → formData.uses_total
	$effect(() => {
		formData.uses_total = isConsumable ? usesTotalInput : null;
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

		if (formData.uses_total !== null) {
			if (
				!Number.isInteger(formData.uses_total) ||
				formData.uses_total < 1 ||
				formData.uses_total > 99
			) {
				newErrors.uses_total = 'Le nombre de charges doit être entre 1 et 99';
			}
		}

		if (
			!Number.isInteger(formData.base_price) ||
			formData.base_price < 0 ||
			formData.base_price > 10000
		) {
			newErrors.base_price = 'Le prix doit être entre 0 et 10 000';
		}

		if (
			!Number.isInteger(formData.max_owned_per_student) ||
			formData.max_owned_per_student < 1 ||
			formData.max_owned_per_student > 100
		) {
			newErrors.max_owned_per_student = 'Le nombre de copies doit être entre 1 et 100';
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
	<MyCheckbox bind:checked={formData.is_enabled} label="Carte activée" />

	<!-- Max Owned Per Student (always visible) -->
	<div class="space-y-2">
		<Label for="max_owned_per_student">Copies max par élève</Label>
		<Input
			id="max_owned_per_student"
			type="number"
			bind:value={formData.max_owned_per_student}
			min={1}
			max={100}
			class={errors.max_owned_per_student ? 'border-destructive' : ''}
		/>
		{#if errors.max_owned_per_student}
			<p class="text-sm text-destructive">{errors.max_owned_per_student}</p>
		{/if}
		<p class="text-xs text-muted-foreground">
			Nombre maximum de copies de cette carte qu'un élève peut posséder.
		</p>
	</div>

	<!-- Purchase Section -->
	<div class="space-y-3 rounded-lg border p-4">
		<MyCheckbox bind:checked={formData.is_purchasable} label="Achetable par les élèves" />

		{#if formData.is_purchasable}
			<div class="space-y-2">
				<Label for="base_price">Prix en gidouilles</Label>
				<Input
					id="base_price"
					type="number"
					bind:value={formData.base_price}
					min={0}
					max={10000}
					class={errors.base_price ? 'border-destructive' : ''}
				/>
				{#if errors.base_price}
					<p class="text-sm text-destructive">{errors.base_price}</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Action Configuration -->
	<VipCardActionEditor
		value={formData.action ?? null}
		onValueChange={(newAction) => {
			formData.action = newAction ?? null;
		}}
	/>

	<!-- Consumable Card (uses_total) -->
	{#if formData.action}
		<div class="space-y-3 rounded-lg border p-4">
			<MyCheckbox bind:checked={isConsumable} label="Carte consommable (multi-usage)" />

			{#if isConsumable}
				<div class="space-y-2">
					<Label for="uses_total">Nombre de charges</Label>
					<Input
						id="uses_total"
						type="number"
						bind:value={usesTotalInput}
						min={1}
						max={99}
						class={errors.uses_total ? 'border-destructive' : ''}
					/>
					{#if errors.uses_total}
						<p class="text-sm text-destructive">{errors.uses_total}</p>
					{/if}
					<p class="text-xs text-muted-foreground">
						Chaque utilisation consomme une charge. La carte est épuisée quand toutes les charges
						sont utilisées.
					</p>
				</div>
			{:else}
				<p class="text-xs text-muted-foreground">
					Usage unique : la carte est consommée dès la première utilisation.
				</p>
			{/if}
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex justify-end gap-2 pt-4">
		<Button type="button" variant="outline" onclick={onCancel} disabled={saving}
			>{lore.actions.cancel}</Button
		>
		<Button type="submit" disabled={!isFormValid || saving}>
			{saving ? 'Enregistrement...' : card ? 'Modifier' : 'Créer'}
		</Button>
	</div>
</form>
