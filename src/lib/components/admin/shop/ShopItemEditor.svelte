<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import type { ShopItemTemplate, CreateShopItemRequest } from '$lib/types/shop';

	interface Props {
		item?: ShopItemTemplate;
		onSave: (data: CreateShopItemRequest) => Promise<void>;
		onCancel: () => void;
	}

	let { item, onSave, onCancel }: Props = $props();

	// Form state using Svelte 5 runes
	let internal_name = $state(item?.internal_name || '');
	let display_name = $state(item?.display_name || '');
	let description = $state(item?.description || '');
	let category = $state<'consumable' | 'booster' | 'cosmetic' | 'utility'>(
		item?.category || 'consumable'
	);
	let item_type = $state(item?.item_type || '');
	let rarity = $state<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'>(
		item?.rarity || 'common'
	);
	let base_price = $state(item?.base_price || 100);
	let discount_percentage = $state(item?.discount_percentage || 0);
	let is_active = $state(item?.is_active ?? true);
	let is_tradeable = $state(item?.is_tradeable ?? true);
	let trade_cooldown_hours = $state(item?.trade_cooldown_hours || 24);
	let max_owned_per_student = $state(item?.max_owned_per_student || null);
	let daily_purchase_limit = $state(item?.daily_purchase_limit || null);
	let weekly_purchase_limit = $state(item?.weekly_purchase_limit || null);
	let purchase_cooldown_hours = $state(item?.purchase_cooldown_hours || null);
	let available_from = $state(item?.available_from || '');
	let available_until = $state(item?.available_until || '');
	let icon_url = $state(item?.icon_url || '');
	let sort_order = $state(item?.sort_order || 0);

	// Properties JSON editor
	let properties_json = $state(item?.properties ? JSON.stringify(item.properties, null, 2) : '{}');
	let properties_error = $state('');

	// Categories and rarities for selects
	const categories = [
		{ value: 'consumable', label: 'Consommable' },
		{ value: 'booster', label: 'Booster' },
		{ value: 'cosmetic', label: 'Cosmétique' },
		{ value: 'utility', label: 'Utilitaire' }
	];

	const rarities = [
		{ value: 'common', label: 'Commun', color: 'text-gray-600' },
		{ value: 'uncommon', label: 'Peu commun', color: 'text-green-600' },
		{ value: 'rare', label: 'Rare', color: 'text-blue-600' },
		{ value: 'epic', label: 'Épique', color: 'text-purple-600' },
		{ value: 'legendary', label: 'Légendaire', color: 'text-yellow-600' }
	];

	// Loading state
	let isSubmitting = $state(false);

	// Derived final price
	const final_price = $derived(Math.floor(base_price * (1 - discount_percentage / 100)));

	// Validate properties JSON
	function validateProperties(): boolean {
		try {
			if (properties_json.trim()) {
				JSON.parse(properties_json);
			}
			properties_error = '';
			return true;
		} catch (_e) {
			properties_error = 'JSON invalide';
			return false;
		}
	}

	// Handle form submission
	async function handleSubmit() {
		// Validate required fields
		if (!internal_name.trim()) {
			alert('Le nom interne est requis');
			return;
		}
		if (!display_name.trim()) {
			alert("Le nom d'affichage est requis");
			return;
		}
		if (!item_type.trim()) {
			alert("Le type d'article est requis");
			return;
		}

		// Validate properties JSON
		if (!validateProperties()) {
			return;
		}

		// Parse properties
		let properties = null;
		if (properties_json.trim() && properties_json.trim() !== '{}') {
			try {
				properties = JSON.parse(properties_json);
			} catch {
				// Should not happen as we validated above
			}
		}

		// Build data object
		const data: CreateShopItemRequest = {
			internal_name: internal_name.trim(),
			display_name: display_name.trim(),
			description: description.trim() || undefined,
			category,
			item_type: item_type.trim(),
			rarity,
			base_price,
			discount_percentage,
			is_active,
			is_tradeable,
			trade_cooldown_hours,
			max_owned_per_student: max_owned_per_student || undefined,
			daily_purchase_limit: daily_purchase_limit || undefined,
			weekly_purchase_limit: weekly_purchase_limit || undefined,
			purchase_cooldown_hours: purchase_cooldown_hours || undefined,
			available_from: available_from || undefined,
			available_until: available_until || undefined,
			icon_url: icon_url.trim() || undefined,
			sort_order,
			properties
		};

		isSubmitting = true;
		try {
			await onSave(data);
		} catch (err) {
			console.error('Error saving item:', err);
			// Error handling is done in parent component
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	class="space-y-6"
>
	<!-- Basic Information -->
	<div class="space-y-4">
		<h3 class="text-lg font-semibold">Informations de base</h3>

		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label for="internal_name">Nom interne (snake_case) *</Label>
				<Input
					id="internal_name"
					bind:value={internal_name}
					placeholder="ex: potion_sante_petite"
					disabled={!!item}
					pattern="^[a-z][a-z0-9_]*$"
					required
				/>
				{#if !item}
					<p class="text-xs text-muted-foreground">Ne peut pas être modifié après création</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="display_name">Nom d'affichage *</Label>
				<Input
					id="display_name"
					bind:value={display_name}
					placeholder="ex: Petite potion de santé"
					required
				/>
			</div>
		</div>

		<div class="space-y-2">
			<Label for="description">Description</Label>
			<Textarea
				id="description"
				bind:value={description}
				placeholder="Description de l'article..."
				rows={3}
			/>
		</div>

		<div class="grid grid-cols-3 gap-4">
			<div class="space-y-2">
				<Label>Catégorie *</Label>
				<MySelect type="single" bind:value={category} items={categories} />
			</div>

			<div class="space-y-2">
				<Label for="item_type">Type d'article *</Label>
				<Input id="item_type" bind:value={item_type} placeholder="ex: health_potion" required />
			</div>

			<div class="space-y-2">
				<Label>Rareté</Label>
				<MySelect type="single" bind:value={rarity} items={rarities} />
			</div>
		</div>
	</div>

	<!-- Pricing -->
	<div class="space-y-4">
		<h3 class="text-lg font-semibold">Prix et réductions</h3>

		<div class="grid grid-cols-3 gap-4">
			<div class="space-y-2">
				<Label for="base_price">Prix de base (gidouilles) *</Label>
				<Input
					id="base_price"
					type="number"
					bind:value={base_price}
					min="1"
					max="100000"
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="discount_percentage">Réduction (%)</Label>
				<Input
					id="discount_percentage"
					type="number"
					bind:value={discount_percentage}
					min="0"
					max="99"
				/>
			</div>

			<div class="space-y-2">
				<Label>Prix final</Label>
				<div class="flex h-10 items-center rounded-md border bg-muted px-3">
					<span class="font-semibold {discount_percentage > 0 ? 'text-green-600' : ''}">
						{final_price} gidouilles
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Purchase Limits -->
	<div class="space-y-4">
		<h3 class="text-lg font-semibold">Limites d'achat</h3>

		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label for="max_owned">Maximum possédé par élève</Label>
				<Input
					id="max_owned"
					type="number"
					bind:value={max_owned_per_student}
					min="1"
					max="1000"
					placeholder="Illimité"
				/>
			</div>

			<div class="space-y-2">
				<Label for="daily_limit">Limite d'achat quotidienne</Label>
				<Input
					id="daily_limit"
					type="number"
					bind:value={daily_purchase_limit}
					min="1"
					max="100"
					placeholder="Illimité"
				/>
			</div>

			<div class="space-y-2">
				<Label for="weekly_limit">Limite d'achat hebdomadaire</Label>
				<Input
					id="weekly_limit"
					type="number"
					bind:value={weekly_purchase_limit}
					min="1"
					max="500"
					placeholder="Illimité"
				/>
			</div>

			<div class="space-y-2">
				<Label for="cooldown">Délai entre achats (heures)</Label>
				<Input
					id="cooldown"
					type="number"
					bind:value={purchase_cooldown_hours}
					min="1"
					max="168"
					placeholder="Aucun délai"
				/>
			</div>
		</div>
	</div>

	<!-- Availability -->
	<div class="space-y-4">
		<h3 class="text-lg font-semibold">Disponibilité</h3>

		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label for="available_from">Disponible à partir de</Label>
				<Input id="available_from" type="datetime-local" bind:value={available_from} />
			</div>

			<div class="space-y-2">
				<Label for="available_until">Disponible jusqu'à</Label>
				<Input id="available_until" type="datetime-local" bind:value={available_until} />
			</div>
		</div>

		<div class="flex gap-6">
			<MyCheckbox bind:checked={is_active} label="Article actif" />
			<MyCheckbox bind:checked={is_tradeable} label="Échangeable entre élèves" />
		</div>

		{#if is_tradeable}
			<div class="max-w-xs space-y-2">
				<Label for="trade_cooldown">Délai avant échange (heures)</Label>
				<Input
					id="trade_cooldown"
					type="number"
					bind:value={trade_cooldown_hours}
					min="0"
					max="168"
				/>
			</div>
		{/if}
	</div>

	<!-- Advanced -->
	<div class="space-y-4">
		<h3 class="text-lg font-semibold">Options avancées</h3>

		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label for="icon_url">URL de l'icône</Label>
				<Input id="icon_url" type="url" bind:value={icon_url} placeholder="https://..." />
			</div>

			<div class="space-y-2">
				<Label for="sort_order">Ordre d'affichage</Label>
				<Input id="sort_order" type="number" bind:value={sort_order} min="0" />
			</div>
		</div>

		<div class="space-y-2">
			<Label for="properties">Propriétés (JSON)</Label>
			<Textarea
				id="properties"
				bind:value={properties_json}
				onblur={validateProperties}
				placeholder={'{\n  "stackable": true,\n  "uses": 1\n}'}
				rows={6}
				class="font-mono text-sm"
			/>
			{#if properties_error}
				<p class="text-sm text-destructive">{properties_error}</p>
			{/if}
			<p class="text-xs text-muted-foreground">
				Propriétés spécifiques au type d'article (stackable, uses, effect, etc.)
			</p>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-2">
		<Button variant="outline" onclick={onCancel} disabled={isSubmitting}>Annuler</Button>
		<Button type="submit" disabled={isSubmitting}>
			{#if isSubmitting}
				Enregistrement...
			{:else if item}
				Mettre à jour
			{:else}
				Créer l'article
			{/if}
		</Button>
	</div>
</form>
