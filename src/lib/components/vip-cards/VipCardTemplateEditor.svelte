<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import MySelect from '$lib/components/MySelect.svelte';
	import VipCardActionEditor from '$lib/components/vip-cards/VipCardActionEditor.svelte';
	import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';
	import type { VipCardAction } from '$lib/types/vip-card';

	interface Props {
		card?: VipCardTemplate;
		onSave: (cardData: CreateTemplateData) => Promise<void>;
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
	}

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
		action: card?.action as VipCardAction | null
	});

	let saving = $state(false);

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
			// Ensure action is properly typed (null or VipCardAction, not undefined)
			const dataToSave: CreateTemplateData = {
				...formData,
				action: formData.action ?? null
			};
			await onSave(dataToSave);
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

	<!-- Image URL Field -->
	<div class="space-y-2">
		<Label for="image_url">URL de l'image</Label>
		<Input
			id="image_path"
			bind:value={formData.image_path}
			placeholder="/images/vip-cards/bonus_points_x2.webp"
		/>
		<p class="text-xs text-muted-foreground">
			Utilisez l'uploader d'image pour modifier l'image existante
		</p>
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

	<!-- Action Buttons -->
	<div class="flex justify-end gap-2 pt-4">
		<Button type="button" variant="outline" onclick={onCancel} disabled={saving}>Annuler</Button>
		<Button type="submit" disabled={!isFormValid || saving}>
			{saving ? 'Enregistrement...' : card ? 'Modifier' : 'Créer'}
		</Button>
	</div>
</form>
