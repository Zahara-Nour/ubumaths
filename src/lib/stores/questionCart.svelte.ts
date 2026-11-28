/**
 * Panier de questions
 * ===================
 *
 * Le panier est une série en cours de composition : des lignes `{ templateId,
 * quantity, delay, variations?, choiceVariations? }` (ADR 0035 ; variations
 * choisies et variations « en QCM », chantier `idees-format` idées 2 et 4),
 * gardées dans le navigateur (localStorage).
 *
 * Un panier enregistré AVANT l'ADR 0035 porte des catégories (thème, domaine…) :
 * ces lignes ne sont plus relues. Au chargement elles sont retirées, le panier
 * est réécrit et un message le dit.
 */

import { toaster } from '#lib/stores/toaster.svelte.ts';
import {
	MAX_ITEM_QUANTITY,
	MAX_QUESTION_DELAY_SECONDS,
	seriesItemSchema,
	type SeriesItem
} from '#lib/validation/series.ts';

// Constantes

/** Durée par question d'une ligne ajoutée sans durée (secondes) */
const DEFAULT_DELAY = 20;
const MIN_DELAY = 5;
/** Celle de la série enregistrée (écart L92 : à 300, une série à 10 min perdait 5 min) */
const MAX_DELAY = MAX_QUESTION_DELAY_SECONDS;

/** Numéros distincts, dans l'ordre */
function sortedUnique(indexes: readonly number[]): number[] {
	return [...new Set(indexes)].sort((a, b) => a - b);
}

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
						? "Série d'une ancienne version vidée."
						: `${anciennes} question${anciennes > 1 ? 's' : ''} d'une ancienne version retirée${anciennes > 1 ? 's' : ''} de ta série.`
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
				alert("Ta série est pleine : retire des questions avant d'en ajouter d'autres.");
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

	/**
	 * Ajoute un modèle ; déjà présent → sa quantité augmente (99 au plus) et il
	 * garde sa durée, ses variations choisies et ses variations en QCM.
	 */
	addToCart(
		templateId: string,
		quantity: number = 1,
		delay: number = DEFAULT_DELAY,
		variations?: readonly number[],
		choiceVariations?: readonly number[]
	) {
		const existing = this.find(templateId);
		if (existing) {
			existing.quantity = Math.min(MAX_ITEM_QUANTITY, existing.quantity + quantity);
		} else {
			const item: SeriesItem = {
				templateId,
				quantity: Math.min(MAX_ITEM_QUANTITY, quantity),
				delay
			};
			if (variations && variations.length > 0) item.variations = sortedUnique(variations);
			if (choiceVariations && choiceVariations.length > 0)
				item.choiceVariations = sortedUnique(choiceVariations);
			this.items.push(item);
		}
		this.saveToStorage();
	}

	/** Variations choisies d'une ligne ; `undefined` ou liste vide = toutes (le champ disparaît) */
	setVariations(templateId: string, variations: readonly number[] | undefined) {
		const item = this.find(templateId);
		if (!item) return;
		if (variations && variations.length > 0) {
			item.variations = sortedUnique(variations);
			// Une variation retirée emporte son QCM (idée 4)
			const kept = item.choiceVariations?.filter((index) => variations.includes(index));
			if (kept && kept.length > 0) item.choiceVariations = kept;
			else delete item.choiceVariations;
		} else {
			delete item.variations;
		}
		this.saveToStorage();
	}

	/** Variations en QCM d'une ligne (idée 4) ; `undefined` ou liste vide = aucune (le champ disparaît) */
	setChoiceVariations(templateId: string, choiceVariations: readonly number[] | undefined) {
		const item = this.find(templateId);
		if (!item) return;
		if (choiceVariations && choiceVariations.length > 0) {
			item.choiceVariations = sortedUnique(choiceVariations);
		} else {
			delete item.choiceVariations;
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

	/** Durée par question, bornée à 5..600 s */
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
	 * augmenter (99 au plus) et garde sa durée et ses variations (QCM compris) ;
	 * les autres s'ajoutent.
	 */
	mergeItems(items: readonly SeriesItem[]) {
		for (const item of items) {
			this.addToCart(
				item.templateId,
				item.quantity,
				item.delay,
				item.variations,
				item.choiceVariations
			);
		}
	}

	clearCart() {
		this.items = [];
		this.saveToStorage();
	}
}

export const questionCart = new QuestionCartStore();
