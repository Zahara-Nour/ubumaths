<script lang="ts" module>
	// Auto-trigger file input when component mounts
	function autoTrigger(node: HTMLInputElement) {
		node.click();
		return {
			destroy() {}
		};
	}
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Dialog from '$lib/components/ui/dialog';
	import MySelect from '$lib/components/MySelect.svelte';
	import ShopItemCard from '$lib/components/admin/shop/ShopItemCard.svelte';
	import ShopItemEditor from '$lib/components/admin/shop/ShopItemEditor.svelte';
	import ShopAnalyticsDashboard from '$lib/components/admin/shop/ShopAnalyticsDashboard.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { ShopItemTemplate, CreateShopItemRequest } from '$lib/types/shop';
	import type { PageData } from './$types';
	import { Plus, Search } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Local state with Svelte 5 $state
	let items = $state<ShopItemTemplate[]>(data.items);
	let analytics = $state(data.analytics);

	// Optimistic UI state for toggles
	let optimisticToggles = $state<Record<string, boolean>>({});

	// Modal states
	let creatingItem = $state(false);
	let editingItem = $state<ShopItemTemplate | null>(null);
	let uploadingImageItem = $state<ShopItemTemplate | null>(null);
	let deletingItem = $state<ShopItemTemplate | null>(null);

	// Filters
	let searchQuery = $state('');
	let categoryFilter = $state<string>('all');
	let rarityFilter = $state<string>('all');
	let activeFilter = $state<string>('all');

	// Categories and rarities for filters
	const categories = [
		{ value: 'all', label: 'Toutes les catégories' },
		{ value: 'consumable', label: 'Consommables' },
		{ value: 'booster', label: 'Boosters' },
		{ value: 'cosmetic', label: 'Cosmétiques' },
		{ value: 'utility', label: 'Utilitaires' }
	];

	const rarities = [
		{ value: 'all', label: 'Toutes les raretés' },
		{ value: 'common', label: 'Commun' },
		{ value: 'uncommon', label: 'Peu commun' },
		{ value: 'rare', label: 'Rare' },
		{ value: 'epic', label: 'Épique' },
		{ value: 'legendary', label: 'Légendaire' }
	];

	const activeStates = [
		{ value: 'all', label: 'Tous les états' },
		{ value: 'active', label: 'Actifs uniquement' },
		{ value: 'inactive', label: 'Inactifs uniquement' }
	];

	// Filter items based on search and filters
	const filteredItems = $derived.by(() => {
		let filtered = items;

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(item) =>
					item.display_name.toLowerCase().includes(query) ||
					item.internal_name.toLowerCase().includes(query) ||
					item.description?.toLowerCase().includes(query)
			);
		}

		// Category filter
		if (categoryFilter && categoryFilter !== 'all') {
			filtered = filtered.filter((item) => item.category === categoryFilter);
		}

		// Rarity filter
		if (rarityFilter && rarityFilter !== 'all') {
			filtered = filtered.filter((item) => item.rarity === rarityFilter);
		}

		// Active state filter
		if (activeFilter === 'active') {
			filtered = filtered.filter((item) => item.is_active);
		} else if (activeFilter === 'inactive') {
			filtered = filtered.filter((item) => !item.is_active);
		}

		// Sort by sort_order, then by created_at
		filtered.sort((a, b) => {
			const aSort = a.sort_order ?? Number.MAX_SAFE_INTEGER;
			const bSort = b.sort_order ?? Number.MAX_SAFE_INTEGER;
			if (aSort !== bSort) {
				return aSort - bSort;
			}
			return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
		});

		return filtered;
	});

	// Group items by category
	const groupedItems = $derived.by(() => {
		const groups: Record<string, ShopItemTemplate[]> = {
			consumable: [],
			booster: [],
			cosmetic: [],
			utility: []
		};

		filteredItems.forEach((item) => {
			if (groups[item.category]) {
				groups[item.category].push(item);
			}
		});

		return groups;
	});

	// === ITEM HANDLERS ===

	async function handleToggleItem(itemId: string, newState: boolean) {
		// Optimistic UI update
		optimisticToggles[itemId] = newState;

		try {
			const response = await fetch(`/api/admin/shop/items/${itemId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_active: newState })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to update');
			}

			const updated: ShopItemTemplate = await response.json();
			items = items.map((i) => (i.id === itemId ? updated : i));
			delete optimisticToggles[itemId];
			toaster.success('Article mis à jour');
		} catch (error) {
			console.error('Toggle error:', error);
			delete optimisticToggles[itemId];
			toaster.error(error instanceof Error ? error.message : 'Échec de la mise à jour');
		}
	}

	async function handleSaveItem(itemData: CreateShopItemRequest) {
		const isEditing = !!editingItem;
		const url =
			isEditing && editingItem
				? `/api/admin/shop/items/${editingItem.id}`
				: '/api/admin/shop/items';
		const method = isEditing ? 'PATCH' : 'POST';

		try {
			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(itemData)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to save');
			}

			const savedItem: ShopItemTemplate = await response.json();

			if (isEditing) {
				items = items.map((i) => (i.id === savedItem.id ? savedItem : i));
				toaster.success('Article modifié avec succès');
			} else {
				items = [...items, savedItem];
				toaster.success('Article créé avec succès');
			}

			creatingItem = false;
			editingItem = null;
		} catch (error) {
			console.error('Save error:', error);
			toaster.error(error instanceof Error ? error.message : "Échec de l'enregistrement");
			throw error;
		}
	}

	async function confirmDeleteItem() {
		if (!deletingItem) return;

		const itemId = deletingItem.id;

		try {
			const response = await fetch(`/api/admin/shop/items/${itemId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to delete');
			}

			// Update item to be inactive
			items = items.map((i) => (i.id === itemId ? { ...i, is_active: false } : i));
			toaster.success('Article désactivé');
			deletingItem = null;
		} catch (error) {
			console.error('Delete error:', error);
			toaster.error(error instanceof Error ? error.message : 'Échec de la suppression');
		}
	}

	async function handleImageUpload(event: Event) {
		if (!uploadingImageItem) return;

		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const formData = new FormData();
		formData.append('image', file);

		try {
			const response = await fetch(`/api/admin/shop/items/${uploadingImageItem.id}/image`, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to upload');
			}

			const result = await response.json();
			const uploadItemId = uploadingImageItem!.id;
			items = items.map((i) => (i.id === uploadItemId ? { ...i, icon_url: result.icon_url } : i));

			toaster.success('Image mise à jour');
			uploadingImageItem = null;
		} catch (error) {
			console.error('Upload error:', error);
			toaster.error(error instanceof Error ? error.message : "Échec de l'upload");
		}
	}

	// Refresh analytics
	async function refreshAnalytics() {
		try {
			const response = await fetch('/api/admin/shop/analytics');
			if (response.ok) {
				analytics = await response.json();
			}
		} catch (error) {
			console.error('Failed to refresh analytics:', error);
		}
	}
</script>

<svelte:head>
	<title>Gestion de la Boutique - Admin | UbuMaths</title>
</svelte:head>

<div class="container mx-auto space-y-6 py-8">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Gestion de la Boutique</h1>
		<Button onclick={() => (creatingItem = true)}>
			<Plus class="mr-2 h-4 w-4" />
			Nouvel Article
		</Button>
	</div>

	<Tabs.Root value="items" class="w-full">
		<Tabs.List class="grid w-full max-w-md grid-cols-2">
			<Tabs.Trigger value="items">Articles</Tabs.Trigger>
			<Tabs.Trigger value="analytics" onclick={refreshAnalytics}>Analytiques</Tabs.Trigger>
		</Tabs.List>

		<!-- ITEMS TAB -->
		<Tabs.Content value="items" class="mt-6 space-y-6">
			<!-- Filters -->
			<div class="flex flex-wrap gap-4">
				<div class="relative max-w-xs min-w-[200px] flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input bind:value={searchQuery} placeholder="Rechercher un article..." class="pl-9" />
				</div>

				<div class="flex gap-2">
					<MySelect type="single" bind:value={categoryFilter} items={categories} />
					<MySelect type="single" bind:value={rarityFilter} items={rarities} />
					<MySelect type="single" bind:value={activeFilter} items={activeStates} />
				</div>
			</div>

			<!-- Statistics bar -->
			<div class="flex items-center justify-between text-sm text-muted-foreground">
				<p>
					{filteredItems.length} article{filteredItems.length > 1 ? 's' : ''} trouvé{filteredItems.length >
					1
						? 's'
						: ''}
					{searchQuery ||
					categoryFilter !== 'all' ||
					rarityFilter !== 'all' ||
					activeFilter !== 'all'
						? ' (filtré)'
						: ''}
				</p>
				<p>
					{items.filter((i) => i.is_active).length} actif{items.filter((i) => i.is_active).length >
					1
						? 's'
						: ''},
					{items.filter((i) => !i.is_active).length} inactif{items.filter((i) => !i.is_active)
						.length > 1
						? 's'
						: ''}
				</p>
			</div>

			<!-- Items grouped by category -->
			{#each Object.entries(groupedItems) as [category, categoryItems] (category)}
				{#if categoryItems.length > 0}
					<div class="space-y-4">
						<h2 class="text-xl font-semibold capitalize">
							{category === 'consumable'
								? 'Consommables'
								: category === 'booster'
									? 'Boosters'
									: category === 'cosmetic'
										? 'Cosmétiques'
										: category === 'utility'
											? 'Utilitaires'
											: category}
							<span class="ml-2 text-sm font-normal text-muted-foreground">
								({categoryItems.length})
							</span>
						</h2>

						<div
							class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
						>
							{#each categoryItems as item (item.id)}
								<ShopItemCard
									{item}
									isEnabled={optimisticToggles[item.id] ?? item.is_active}
									onToggle={(enabled) => handleToggleItem(item.id, enabled)}
									onEdit={() => (editingItem = item)}
									onDelete={() => (deletingItem = item)}
									onUploadImage={() => (uploadingImageItem = item)}
								/>
							{/each}
						</div>
					</div>
				{/if}
			{/each}

			{#if filteredItems.length === 0}
				<div class="rounded-lg border bg-muted/20 py-12 text-center">
					<p class="text-muted-foreground">
						{searchQuery ||
						categoryFilter !== 'all' ||
						rarityFilter !== 'all' ||
						activeFilter !== 'all'
							? 'Aucun article trouvé avec ces filtres'
							: 'Aucun article dans la boutique'}
					</p>
					{#if items.length === 0}
						<Button onclick={() => (creatingItem = true)} variant="outline" class="mt-4">
							Créer le premier article
						</Button>
					{/if}
				</div>
			{/if}
		</Tabs.Content>

		<!-- ANALYTICS TAB -->
		<Tabs.Content value="analytics" class="mt-6">
			<ShopAnalyticsDashboard {analytics} />
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- MODALS -->

<!-- Create/Edit Item Modal -->
{#if creatingItem || editingItem}
	<Dialog.Root
		open={true}
		onOpenChange={() => {
			creatingItem = false;
			editingItem = null;
		}}
	>
		<Dialog.Content class="max-h-[90vh] max-w-3xl overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title>
					{editingItem ? 'Modifier' : 'Créer'} un article de boutique
				</Dialog.Title>
				<Dialog.Description>
					{editingItem
						? "Modifiez les propriétés de l'article"
						: 'Créez un nouvel article pour la boutique des élèves'}
				</Dialog.Description>
			</Dialog.Header>
			<ShopItemEditor
				item={editingItem ?? undefined}
				onSave={handleSaveItem}
				onCancel={() => {
					creatingItem = false;
					editingItem = null;
				}}
			/>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Delete Confirmation Modal -->
{#if deletingItem}
	<Dialog.Root
		open={true}
		onOpenChange={() => {
			deletingItem = null;
		}}
	>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Confirmer la désactivation</Dialog.Title>
				<Dialog.Description>
					Êtes-vous sûr de vouloir désactiver l'article
					<strong class="font-semibold text-foreground">"{deletingItem.display_name}"</strong> ?
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4">
				<!-- Warning message -->
				<div class="rounded-lg border border-orange-200 bg-orange-50 p-4">
					<p class="text-sm text-orange-800">
						⚠️ L'article sera <strong>désactivé</strong> et ne sera plus disponible à l'achat. Les élèves
						qui le possèdent déjà pourront toujours l'utiliser.
					</p>
				</div>

				<!-- Item preview -->
				<div class="rounded-lg border bg-muted/20 p-4">
					<div class="flex items-center gap-3">
						{#if deletingItem.icon_url}
							<img
								src={deletingItem.icon_url}
								alt={deletingItem.display_name}
								class="h-12 w-12 rounded object-cover"
							/>
						{/if}
						<div class="flex-1">
							<p class="font-medium">{deletingItem.display_name}</p>
							<p class="text-sm text-muted-foreground">{deletingItem.internal_name}</p>
						</div>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="flex justify-end gap-2">
					<Button variant="outline" onclick={() => (deletingItem = null)}>Annuler</Button>
					<Button variant="destructive" onclick={confirmDeleteItem}>Désactiver l'article</Button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Hidden file input for image upload -->
{#if uploadingImageItem}
	<input
		type="file"
		accept="image/jpeg,image/jpg,image/png,image/webp"
		onchange={handleImageUpload}
		class="hidden"
		use:autoTrigger
	/>
{/if}
