<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import MySelect from '$lib/components/MySelect.svelte';
	import type { Database } from '$lib/types/database';

	type VipCardTemplate = Database['public']['Tables']['vip_card_templates']['Row'];

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
		category: 'gameplay' | 'academic' | 'fun' | 'social';
		is_enabled: boolean;
		image_url: string;
		sort_order: number;
	}

	let { card, onSave, onCancel }: Props = $props();

	// Form state using Svelte 5 $state
	let formData = $state<CreateTemplateData>({
		id: card?.id ?? '',
		name: card?.name ?? '',
		description: card?.description ?? '',
		rarity: card?.rarity ?? 'common',
		category: card?.category ?? 'gameplay',
		is_enabled: card?.is_enabled ?? true,
		image_url: card?.image_url ?? '',
		sort_order: card?.sort_order ?? 0
	});

	let saving = $state(false);
	let errors = $state<Record<string, string>>({});

	// Dropdown items for MySelect
	const rarityItems = [
		{ value: 'common', label: 'Commune' },
		{ value: 'rare', label: 'Rare' },
		{ value: 'epic', label: 'Épique' },
		{ value: 'legendary', label: 'Légendaire' }
	];

	const categoryItems = [
		{ value: 'gameplay', label: 'Gameplay' },
		{ value: 'academic', label: 'Académique' },
		{ value: 'fun', label: 'Amusement' },
		{ value: 'social', label: 'Social' }
	];

	// Validation using Svelte 5 $derived
	const isFormValid = $derived(() => {
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

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	});

	async function handleSubmit() {
		if (!isFormValid()) return;

		saving = true;
		try {
			await onSave(formData);
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
			id="image_url"
			bind:value={formData.image_url}
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

	<!-- Action Buttons -->
	<div class="flex justify-end gap-2 pt-4">
		<Button type="button" variant="outline" onclick={onCancel} disabled={saving}>Annuler</Button>
		<Button type="submit" disabled={!isFormValid() || saving}>
			{saving ? 'Enregistrement...' : card ? 'Modifier' : 'Créer'}
		</Button>
	</div>
</form>
