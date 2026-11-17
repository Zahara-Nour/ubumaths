/**
 * Panier de questions
 * ===================
 *
 * Le panier est une série en cours de composition : des lignes `{ templateId,
 * quantity, delay }` (ADR 0035), gardées dans le navigateur (localStorage).
 *
 * Un panier enregistré AVANT l'ADR 0035 porte des catégories (thème, domaine…) :
 * ces lignes ne sont plus relues. Au chargement elles sont retirées, le panier
 * est réécrit et un message le dit.
 */

import { toaster } from '$lib/stores/toaster.svelte';
import { MAX_ITEM_QUANTITY, seriesItemSchema, type SeriesItem } from '$lib/validation/series';

// Constantes

/** Durée par question d'une ligne ajoutée sans durée (secondes) */
const DEFAULT_DELAY = 20;
const MIN_DELAY = 5;
const MAX_DELAY = 300;

/** Exportée pour les tests (un panier neuf relu du localStorage) ; l'appli utilise `questionCart` */
export class QuestionCartStore {
	private items = $state<SeriesItem[]>([]);
	private readonly storageKey = 'chiphre_question_cart';

	constructor() {
		// Client seulement
		if (typeof window !== 'undefined') {
			this.loadFromStorage();
		}
	}

	/**
	 * Relit le panier ; une ligne illisible est ignorée, jamais un plantage.
	 * Une ligne d'ancienne forme (catégorie) est retirée et dite à l'élève.
	 */
	private loadFromStorage() {
		try {
			const stored = localStorage.getItem(this.storageKey);
			if (!stored) return;
			const parsed: unknown = JSON.parse(stored);
			if (!Array.isArray(parsed)) return;
			const items: SeriesItem[] = [];
			let anciennes = 0;
			for (const raw of parsed) {
				if (raw && typeof raw === 'object' && 'category' in raw) {
					anciennes += 1;
					continue;
				}
				// Très ancien panier sans durée
				const withDelay =
					raw && typeof raw === 'object' && !('delay' in raw)
						? { ...raw, delay: DEFAULT_DELAY }
						: raw;
				const line = seriesItemSchema.safeParse(withDelay);
				if (line.success) items.push(line.data);
			}
			this.items = items;
			if (anciennes > 0) {
				this.saveToStorage();
				toaster.info(
					items.length === 0
						? "Panier d'une ancienne version vidé."
						: `${anciennes} question${anciennes > 1 ? 's' : ''} d'une ancienne version retirée${anciennes > 1 ? 's' : ''} du panier.`
				);
			}
		} catch (error) {
			console.error('Failed to load cart from localStorage:', error);
			this.items = [];
		}
	}

	private saveToStorage() {
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.items));
		} catch (error) {
			console.error('Failed to save cart to localStorage:', error);
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				alert("Le panier est plein : supprimer des questions avant d'en ajouter d'autres.");
			}
		}
	}

	/** Lignes du panier (réactif) */
	get allItems(): SeriesItem[] {
		return this.items;
	}

	/** Nombre de lignes */
	get totalItems(): number {
		return this.items.length;
	}

	/** Nombre de questions (somme des répétitions) */
	get totalInstances(): number {
		return this.items.reduce((sum, item) => sum + item.quantity, 0);
	}

	private find(templateId: string): SeriesItem | undefined {
		return this.items.find((item) => item.templateId === templateId);
	}

	hasTemplate(templateId: string): boolean {
		return this.find(templateId) !== undefined;
	}

	getItem(templateId: string): SeriesItem | undefined {
		return this.find(templateId);
	}

	/** Ajoute un modèle ; déjà présent → sa quantité augmente (99 au plus) et il garde sa durée */
	addToCart(templateId: string, quantity: number = 1, delay: number = DEFAULT_DELAY) {
		const existing = this.find(templateId);
		if (existing) {
			existing.quantity = Math.min(MAX_ITEM_QUANTITY, existing.quantity + quantity);
		} else {
			this.items.push({ templateId, quantity: Math.min(MAX_ITEM_QUANTITY, quantity), delay });
		}
		this.saveToStorage();
	}

	removeFromCart(templateId: string) {
		this.items = this.items.filter((item) => item.templateId !== templateId);
		this.saveToStorage();
	}

	/** Nouvelle quantité (1 à 99) ; 0 ou moins retire la ligne */
	updateQuantity(templateId: string, quantity: number) {
		const item = this.find(templateId);
		if (!item) return;
		if (quantity <= 0) {
			this.removeFromCart(templateId);
			return;
		}
		item.quantity = Math.max(1, Math.min(MAX_ITEM_QUANTITY, quantity));
		this.saveToStorage();
	}

	incrementQuantity(templateId: string) {
		const item = this.find(templateId);
		if (item && item.quantity < MAX_ITEM_QUANTITY) {
			item.quantity += 1;
			this.saveToStorage();
		}
	}

	/** Une question de moins ; la dernière retire la ligne */
	decrementQuantity(templateId: string) {
		const item = this.find(templateId);
		if (!item) return;
		if (item.quantity <= 1) {
			this.removeFromCart(templateId);
		} else {
			item.quantity -= 1;
			this.saveToStorage();
		}
	}

	/** Durée par question, bornée à 5..300 s */
	updateDelay(templateId: string, delay: number) {
		const item = this.find(templateId);
		if (item) {
			item.delay = Math.max(MIN_DELAY, Math.min(MAX_DELAY, delay));
			this.saveToStorage();
		}
	}

	/**
	 * Remplace tout le panier par une série (lien de série, Q45). Les lignes
	 * sont supposées validées ; la quantité reste bornée ; un modèle présent
	 * deux fois (lien fabriqué) n'en fait qu'une ligne.
	 */
	replaceWith(items: readonly SeriesItem[]) {
		this.items = [];
		this.mergeItems(items);
		this.saveToStorage();
	}

	/**
	 * Ajoute une série au panier (Q45) : un modèle déjà présent voit sa quantité
	 * augmenter (99 au plus) et garde sa durée ; les autres s'ajoutent.
	 */
	mergeItems(items: readonly SeriesItem[]) {
		for (const item of items) {
			this.addToCart(item.templateId, item.quantity, item.delay);
		}
	}

	clearCart() {
		this.items = [];
		this.saveToStorage();
	}
}

export const questionCart = new QuestionCartStore();
