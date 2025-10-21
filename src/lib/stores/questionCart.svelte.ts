/**
 * Question Category
 * Represents a category of questions (theme/domain/subdomain/level)
 */
export interface QuestionCategory {
	theme: string;
	domain: string;
	subdomain: string | null;
	level: number;
}

/**
 * Question Cart Item
 * Represents a category selection with quantity and time delay
 * Questions are randomly selected from this category when displayed
 */
export interface CartItem {
	category: QuestionCategory;
	quantity: number;
	delay: number; // Time delay in seconds (default: 20)
}

/**
 * Question Cart Store
 * Manages selected questions with localStorage persistence
 */
class QuestionCartStore {
	private items = $state<CartItem[]>([]);
	private readonly storageKey = 'ubumaths_question_cart';

	constructor() {
		// Load from localStorage on initialization (client-side only)
		if (typeof window !== 'undefined') {
			this.loadFromStorage();
		}
	}

	/**
	 * Load cart items from localStorage
	 * Migrates old data format to include delay if missing
	 */
	private loadFromStorage() {
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed)) {
					// Migrate old items that don't have delay
					this.items = parsed.map((item) => ({
						...item,
						delay: item.delay ?? 20 // Default to 20 seconds if not present
					}));
					// Save migrated data
					this.saveToStorage();
				}
			}
		} catch (error) {
			console.error('Failed to load cart from localStorage:', error);
			this.items = [];
		}
	}

	/**
	 * Save cart items to localStorage
	 */
	private saveToStorage() {
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.items));
		} catch (error) {
			console.error('Failed to save cart to localStorage:', error);
			// Handle quota exceeded or other errors
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				alert("Le panier est plein. Veuillez supprimer des questions avant d'en ajouter d'autres.");
			}
		}
	}

	/**
	 * Get all cart items (reactive)
	 */
	get allItems(): CartItem[] {
		return this.items;
	}

	/**
	 * Get total number of items in cart
	 */
	get totalItems(): number {
		return this.items.length;
	}

	/**
	 * Get total number of question instances (sum of quantities)
	 */
	get totalInstances(): number {
		return this.items.reduce((sum, item) => sum + item.quantity, 0);
	}

	/**
	 * Generate a unique key for a category
	 */
	private getCategoryKey(category: QuestionCategory): string {
		return `${category.theme}|${category.domain}|${category.subdomain || 'null'}|${category.level}`;
	}

	/**
	 * Check if a category is in the cart
	 */
	hasCategory(category: QuestionCategory): boolean {
		const key = this.getCategoryKey(category);
		return this.items.some((item) => this.getCategoryKey(item.category) === key);
	}

	/**
	 * Get cart item by category
	 */
	getItem(category: QuestionCategory): CartItem | undefined {
		const key = this.getCategoryKey(category);
		return this.items.find((item) => this.getCategoryKey(item.category) === key);
	}

	/**
	 * Add a category to the cart
	 * If already exists, increases quantity
	 */
	addToCart(category: QuestionCategory, quantity: number = 1, delay: number = 20) {
		const categoryKey = this.getCategoryKey(category);
		const existingIndex = this.items.findIndex(
			(i) => this.getCategoryKey(i.category) === categoryKey
		);

		if (existingIndex !== -1) {
			// Update existing item quantity
			this.items[existingIndex].quantity += quantity;
		} else {
			// Add new item with default delay
			this.items.push({ category, quantity, delay });
		}

		this.saveToStorage();
	}

	/**
	 * Remove a category from the cart
	 */
	removeFromCart(category: QuestionCategory) {
		const categoryKey = this.getCategoryKey(category);
		this.items = this.items.filter((item) => this.getCategoryKey(item.category) !== categoryKey);
		this.saveToStorage();
	}

	/**
	 * Update quantity for a specific category
	 * If quantity reaches 0, removes the item from cart
	 */
	updateQuantity(category: QuestionCategory, quantity: number) {
		const categoryKey = this.getCategoryKey(category);
		const item = this.items.find((i) => this.getCategoryKey(i.category) === categoryKey);
		if (item) {
			// If quantity is 0 or less, remove item
			if (quantity <= 0) {
				this.removeFromCart(category);
				return;
			}
			// Clamp quantity between 1 and 99
			item.quantity = Math.max(1, Math.min(99, quantity));
			this.saveToStorage();
		}
	}

	/**
	 * Increment quantity for a specific category
	 */
	incrementQuantity(category: QuestionCategory) {
		const categoryKey = this.getCategoryKey(category);
		const item = this.items.find((i) => this.getCategoryKey(i.category) === categoryKey);
		if (item && item.quantity < 99) {
			item.quantity += 1;
			this.saveToStorage();
		}
	}

	/**
	 * Decrement quantity for a specific category
	 * If quantity reaches 0, removes the item from cart
	 */
	decrementQuantity(category: QuestionCategory) {
		const categoryKey = this.getCategoryKey(category);
		const item = this.items.find((i) => this.getCategoryKey(i.category) === categoryKey);
		if (item) {
			if (item.quantity <= 1) {
				this.removeFromCart(category);
			} else {
				item.quantity -= 1;
				this.saveToStorage();
			}
		}
	}

	/**
	 * Update delay for a specific category
	 */
	updateDelay(category: QuestionCategory, delay: number) {
		const categoryKey = this.getCategoryKey(category);
		const item = this.items.find((i) => this.getCategoryKey(i.category) === categoryKey);
		if (item) {
			// Clamp delay to reasonable values (5-300 seconds)
			item.delay = Math.max(5, Math.min(300, delay));
			this.saveToStorage();
		}
	}

	/**
	 * Clear all items from cart
	 */
	clearCart() {
		this.items = [];
		this.saveToStorage();
	}

	/**
	 * Get cart items grouped by category
	 */
	getItemsByCategory(): Map<string, CartItem[]> {
		const grouped = new Map<string, CartItem[]>();

		for (const item of this.items) {
			const categoryKey = `${item.category.theme} / ${item.category.domain}`;
			if (!grouped.has(categoryKey)) {
				grouped.set(categoryKey, []);
			}
			grouped.get(categoryKey)!.push(item);
		}

		return grouped;
	}
}

// Export singleton instance
export const questionCart = new QuestionCartStore();
