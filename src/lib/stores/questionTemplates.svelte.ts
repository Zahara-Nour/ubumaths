/**
 * Question Templates Cache Store
 * ================================
 *
 * Client-side cache for published question templates to avoid repeated API/DB calls.
 * Used by automaths pages (public access) for instant template lookups.
 *
 * Les pages Automaths (catalogue, panier, test) ne reçoivent PAS les modèles
 * de leur serveur : elles appellent `fetchTemplates()`, qui lit la liste une
 * fois par onglet ; naviguer entre elles ne la recharge pas.
 *
 * - Accès public (sans authentification)
 * - Lectures simultanées partagées (une seule requête)
 * - Invalidation manuelle (pas de durée de vie) ; la relecture contourne le
 *   cache de Vercel
 *
 * Usage:
 * ```typescript
 * import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
 *
 * // Lire la liste (une fois par onglet)
 * await questionTemplatesCache.fetchTemplates();
 *
 * // Get all templates
 * const templates = questionTemplatesCache.templates;
 *
 * // Find by ID
 * const template = questionTemplatesCache.getTemplateById('abc-123');
 *
 * // Invalidate after admin creates/updates template
 * questionTemplatesCache.invalidate();
 * ```
 */

import type { QuestionTemplate } from '$lib/questions/types';
import type { CatalogueNode } from '$lib/questions/catalogue';
import { questionCart } from '$lib/stores/questionCart.svelte';
import { toaster } from '$lib/stores/toaster.svelte';

/** Liste publique des modèles publiés (gardée 5 min par Vercel) */
const TEMPLATES_URL = '/api/questions/templates/all';

/**
 * Cache storage structure
 */
interface TemplatesCache {
	templates: QuestionTemplate[];
	/** Arbre des notions (nœuds non archivés), qui range le catalogue */
	nodes: CatalogueNode[];
	lastFetched: number | null;
	isLoading: boolean;
	error: string | null;
}

class QuestionTemplatesStore {
	private cache = $state<TemplatesCache>({
		templates: [],
		nodes: [],
		lastFetched: null,
		isLoading: false,
		error: null
	});

	/** Lecture en cours, partagée par toutes les pages qui la demandent */
	private pending: Promise<void> | null = null;

	/** Liste à relire en contournant le cache de Vercel (après `invalidate()`) */
	private stale = false;

	/** Nombre d'`invalidate()` : une invalidation pendant une lecture survit à celle-ci */
	private invalidations = 0;

	/**
	 * Get all cached templates
	 */
	get templates(): QuestionTemplate[] {
		return this.cache.templates;
	}

	/** Arbre des notions (nœuds non archivés), reçu avec les modèles */
	get nodes(): CatalogueNode[] {
		return this.cache.nodes;
	}

	/**
	 * Check if cache is currently loading
	 */
	get isLoading(): boolean {
		return this.cache.isLoading;
	}

	/**
	 * Get error message if any
	 */
	get error(): string | null {
		return this.cache.error;
	}

	/**
	 * Check if cache is empty
	 */
	get isEmpty(): boolean {
		return this.cache.templates.length === 0;
	}

	/** La liste a-t-elle été lue (même vide) ? Faux tant qu'elle charge ou après un échec */
	get isLoaded(): boolean {
		return this.cache.lastFetched !== null;
	}

	/**
	 * Lit la liste des modèles publiés, UNE fois par onglet.
	 *
	 * - Déjà lue (et non invalidée) : rend la main aussitôt.
	 * - Lecture en cours : rend la MÊME promesse, résolue avec les données
	 *   (deux pages qui demandent ensemble ne lancent qu'une lecture).
	 * - Après `invalidate()` : relit avec une adresse distincte (`?frais=…`),
	 *   que le cache de Vercel (5 min, cf. l'API) ne connaît pas.
	 * - Échec : `error` renseigné, la liste n'est pas marquée lue ; un appel
	 *   suivant retentera.
	 *
	 * @param force - Relire même si la liste est déjà là
	 */
	fetchTemplates(force = false): Promise<void> {
		if (this.pending) return this.pending;
		if (!force && !this.stale && this.isLoaded) return Promise.resolve();

		this.pending = this.load(force || this.stale).finally(() => {
			this.pending = null;
		});
		return this.pending;
	}

	private async load(bypassSharedCache: boolean): Promise<void> {
		const invalidationsAtStart = this.invalidations;
		this.cache.isLoading = true;
		this.cache.error = null;

		try {
			const url = bypassSharedCache ? `${TEMPLATES_URL}?frais=${Date.now()}` : TEMPLATES_URL;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error('Impossible de charger les modèles');
			}

			const data = (await response.json()) as {
				templates?: QuestionTemplate[];
				nodes?: CatalogueNode[];
			};

			// Réponse sans arbre : Vercel sert encore une liste d'avant le déploiement
			// (jusqu'à 10 min). Sans arbre, tout le catalogue serait « non classé » :
			// une relecture qui contourne le cache, une seule fois.
			if (!Array.isArray(data.nodes) && !bypassSharedCache) {
				return await this.load(true);
			}

			this.cache.templates = data.templates ?? [];
			this.cache.nodes = data.nodes ?? [];
			// Un panier d'avant l'ADR 0035 attend les modèles pour devenir des lignes
			const dropped = questionCart.resolveLegacy(this.cache.templates);
			if (dropped > 0) {
				toaster.warning(
					`${dropped} question${dropped > 1 ? 's' : ''} de ton panier n'existe${dropped > 1 ? 'nt' : ''} plus.`
				);
			}
			this.cache.lastFetched = Date.now();
			// Invalidée pendant la lecture : la liste reçue peut être antérieure
			if (this.invalidations === invalidationsAtStart) this.stale = false;
		} catch (err) {
			this.cache.error = err instanceof Error ? err.message : 'Erreur inconnue';
			console.error('[Templates Cache] Fetch error:', this.cache.error);
		} finally {
			this.cache.isLoading = false;
		}
	}

	/**
	 * Get template by ID
	 *
	 * @param id - Template ID to find
	 * @returns Template or undefined if not found
	 */
	getTemplateById(id: string): QuestionTemplate | undefined {
		return this.cache.templates.find((t) => t.id === id);
	}

	/**
	 * Invalidate cache (force refresh on next fetch)
	 *
	 * Call this after admin creates/updates/deletes templates
	 * to ensure fresh data on next access.
	 */
	invalidate(): void {
		this.stale = true;
		this.invalidations += 1;
	}

	/**
	 * Clear cache entirely
	 *
	 * Removes all cached templates and resets state.
	 * Next access will trigger a fresh fetch.
	 */
	clear(): void {
		this.cache.templates = [];
		this.cache.nodes = [];
		this.cache.lastFetched = null;
		this.cache.error = null;
		this.stale = false;
	}
}

// Export singleton instance
export const questionTemplatesCache = new QuestionTemplatesStore();
