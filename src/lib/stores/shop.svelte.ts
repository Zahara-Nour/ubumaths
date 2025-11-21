// Shop Store
// ==========
// Store for managing shop items, purchases, and student inventory

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	ShopItemTemplate,
	ShopItemWithStatus,
	StudentItemWithTemplate,
	InventoryItemWithLockStatus,
	PurchaseRequest,
	PurchaseResponse,
	UseItemRequest,
	UseItemResponse,
	EquipItemRequest,
	EquipItemResponse,
	ShopItemCategory,
	ShopItemRarity,
	ShopItemsQuery
} from '$lib/types/shop';
import { toaster } from '$lib/stores/toaster.svelte';

class ShopStore {
	// State - Using Svelte 5 runes
	shopItems = $state<ShopItemWithStatus[]>([]);
	inventory = $state<InventoryItemWithLockStatus[]>([]);
	gidouillesBalance = $state<number>(0);

	// Selected items for details view
	selectedShopItem = $state<ShopItemWithStatus | null>(null);
	selectedInventoryItem = $state<InventoryItemWithLockStatus | null>(null);

	// Loading states
	isLoading = $state({
		shop: false,
		inventory: false,
		purchase: false,
		use: false,
		equip: false
	});

	// Error states
	errors = $state({
		shop: null as string | null,
		inventory: null as string | null
	});

	// Filters
	filters = $state<{
		category: ShopItemCategory | 'all';
		search: string;
		rarity: ShopItemRarity | 'all';
		sortBy: 'price' | 'name' | 'rarity';
	}>({
		category: 'all',
		search: '',
		rarity: 'all',
		sortBy: 'price'
	});

	// Private
	private supabase: SupabaseClient | null = null;
	private userId: string | null = null;

	// Computed values
	get filteredShopItems() {
		let items = this.shopItems;

		// Category filter
		if (this.filters.category !== 'all') {
			items = items.filter(item => item.category === this.filters.category);
		}

		// Rarity filter
		if (this.filters.rarity !== 'all') {
			items = items.filter(item => item.rarity === this.filters.rarity);
		}

		// Search filter
		if (this.filters.search) {
			const search = this.filters.search.toLowerCase();
			items = items.filter(
				item =>
					item.display_name.toLowerCase().includes(search) ||
					(item.description && item.description.toLowerCase().includes(search))
			);
		}

		// Sort
		items = [...items].sort((a, b) => {
			switch (this.filters.sortBy) {
				case 'price':
					return a.final_price - b.final_price;
				case 'name':
					return a.display_name.localeCompare(b.display_name, 'fr');
				case 'rarity': {
					const rarityOrder: Record<ShopItemRarity, number> = {
						common: 0,
						uncommon: 1,
						rare: 2,
						epic: 3,
						legendary: 4
					};
					return rarityOrder[b.rarity as ShopItemRarity] - rarityOrder[a.rarity as ShopItemRarity];
				}
				default:
					return 0;
			}
		});

		return items;
	}

	get inventoryByCategory() {
		const categories = new Map<ShopItemCategory, InventoryItemWithLockStatus[]>();

		for (const item of this.inventory) {
			const category = item.template.category as ShopItemCategory;
			if (!categories.has(category)) {
				categories.set(category, []);
			}
			categories.get(category)!.push(item);
		}

		return categories;
	}

	get equippedItems() {
		return this.inventory.filter(item => item.is_equipped);
	}

	// Initialize
	async init(supabase: SupabaseClient, userId: string) {
		this.supabase = supabase;
		this.userId = userId;

		// Load initial data
		await Promise.all([
			this.loadShopItems(),
			this.loadInventory(),
			this.loadGidouillesBalance()
		]);
	}

	// Load shop items
	async loadShopItems() {
		if (!this.supabase || !this.userId) return;

		this.isLoading.shop = true;
		this.errors.shop = null;

		try {
			const response = await fetch('/api/shop/items');
			if (!response.ok) {
				throw new Error('Erreur lors du chargement de la boutique');
			}

			const data = await response.json();
			this.shopItems = data.items;
		} catch (error) {
			console.error('Error loading shop items:', error);
			this.errors.shop = 'Impossible de charger la boutique';
			toaster.error('Impossible de charger la boutique');
		} finally {
			this.isLoading.shop = false;
		}
	}

	// Load student inventory
	async loadInventory() {
		if (!this.supabase || !this.userId) return;

		this.isLoading.inventory = true;
		this.errors.inventory = null;

		try {
			const response = await fetch('/api/inventory');
			if (!response.ok) {
				throw new Error('Erreur lors du chargement de l\'inventaire');
			}

			const data = await response.json();
			this.inventory = data.items;
		} catch (error) {
			console.error('Error loading inventory:', error);
			this.errors.inventory = 'Impossible de charger l\'inventaire';
			toaster.error('Impossible de charger l\'inventaire');
		} finally {
			this.isLoading.inventory = false;
		}
	}

	// Load gidouilles balance
	async loadGidouillesBalance() {
		if (!this.supabase || !this.userId) return;

		try {
			const { data, error } = await this.supabase
				.from('profiles')
				.select('gidouilles')
				.eq('id', this.userId)
				.single();

			if (!error && data) {
				this.gidouillesBalance = data.gidouilles || 0;
			}
		} catch (error) {
			console.error('Error loading gidouilles balance:', error);
		}
	}

	// Purchase an item
	async purchaseItem(templateId: string, quantity: number = 1): Promise<boolean> {
		if (!this.supabase || !this.userId) return false;

		this.isLoading.purchase = true;

		try {
			const response = await fetch('/api/shop/purchase', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					template_id: templateId,
					quantity
				} as PurchaseRequest)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Erreur lors de l\'achat');
			}

			const data: PurchaseResponse = await response.json();

			if (data.success) {
				// Update balance
				if (data.new_balance !== undefined) {
					this.gidouillesBalance = data.new_balance;
				}

				// Reload inventory to show new item
				await this.loadInventory();

				// Update shop items to reflect ownership
				await this.loadShopItems();

				toaster.success(
					`${data.item_name} acheté${quantity > 1 ? ` (x${quantity})` : ''} pour ${data.gidouilles_spent} gidouilles !`
				);

				return true;
			} else {
				throw new Error(data.error || 'Échec de l\'achat');
			}
		} catch (error) {
			console.error('Error purchasing item:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de l\'achat');
			return false;
		} finally {
			this.isLoading.purchase = false;
		}
	}

	// Use an inventory item
	async useItem(inventoryId: string, context: string = 'manual'): Promise<boolean> {
		if (!this.supabase || !this.userId) return false;

		this.isLoading.use = true;

		try {
			const response = await fetch(`/api/inventory/${inventoryId}/use`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					context
				} as UseItemRequest)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Erreur lors de l\'utilisation');
			}

			const data: UseItemResponse = await response.json();

			if (data.success) {
				// Update inventory to reflect usage
				if (data.item_consumed) {
					// Remove item from inventory
					this.inventory = this.inventory.filter(item => item.id !== inventoryId);
				} else if (data.remaining_uses !== undefined) {
					// Update remaining uses
					const item = this.inventory.find(i => i.id === inventoryId);
					if (item) {
						item.uses_remaining = data.remaining_uses;
					}
				}

				toaster.success(
					`${data.item_name} utilisé avec succès !${
						data.remaining_uses ? ` (${data.remaining_uses} utilisations restantes)` : ''
					}`
				);

				return true;
			} else {
				throw new Error(data.error || 'Échec de l\'utilisation');
			}
		} catch (error) {
			console.error('Error using item:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de l\'utilisation');
			return false;
		} finally {
			this.isLoading.use = false;
		}
	}

	// Equip/unequip an item
	async toggleEquip(inventoryId: string, equip: boolean): Promise<boolean> {
		if (!this.supabase || !this.userId) return false;

		this.isLoading.equip = true;

		try {
			const response = await fetch(`/api/inventory/${inventoryId}/equip`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					equip
				} as EquipItemRequest)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Erreur lors de l\'équipement');
			}

			const data: EquipItemResponse = await response.json();

			if (data.success) {
				// Update local state
				const item = this.inventory.find(i => i.id === inventoryId);
				if (item) {
					item.is_equipped = data.is_equipped;
					if (data.is_equipped) {
						item.equipped_at = new Date().toISOString();
					} else {
						item.equipped_at = null;
					}
				}

				toaster.success(
					`${data.item_name} ${data.is_equipped ? 'équipé' : 'déséquipé'} !`
				);

				return true;
			} else {
				throw new Error(data.error || 'Échec de l\'équipement');
			}
		} catch (error) {
			console.error('Error toggling equip:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de l\'équipement');
			return false;
		} finally {
			this.isLoading.equip = false;
		}
	}

	// Set category filter
	setCategory(category: ShopItemCategory | 'all') {
		this.filters.category = category;
	}

	// Set search filter
	setSearch(search: string) {
		this.filters.search = search;
	}

	// Set rarity filter
	setRarity(rarity: ShopItemRarity | 'all') {
		this.filters.rarity = rarity;
	}

	// Set sort
	setSortBy(sortBy: 'price' | 'name' | 'rarity') {
		this.filters.sortBy = sortBy;
	}

	// Select shop item for details
	selectShopItem(item: ShopItemWithStatus | null) {
		this.selectedShopItem = item;
	}

	// Select inventory item for details
	selectInventoryItem(item: InventoryItemWithLockStatus | null) {
		this.selectedInventoryItem = item;
	}

	// Cleanup
	cleanup() {
		// Reset state
		this.shopItems = [];
		this.inventory = [];
		this.gidouillesBalance = 0;
		this.selectedShopItem = null;
		this.selectedInventoryItem = null;
		this.filters = {
			category: 'all',
			search: '',
			rarity: 'all',
			sortBy: 'price'
		};
		this.supabase = null;
		this.userId = null;
	}
}

// Export singleton instance
export const shopStore = new ShopStore();