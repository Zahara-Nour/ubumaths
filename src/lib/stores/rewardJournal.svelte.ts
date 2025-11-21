/**
 * Reward Journal Store
 * ====================
 *
 * Manages reward event history with pagination, filtering, and infinite scroll support.
 *
 * Usage:
 * import { rewardJournalStore } from '$lib/stores/rewardJournal.svelte';
 *
 * // Fetch events for current student
 * await rewardJournalStore.fetchEvents();
 *
 * // Fetch events for specific student (teacher view)
 * await rewardJournalStore.fetchEvents('student-uuid');
 *
 * // Apply filters
 * rewardJournalStore.setFilters({ reward_type: 'gidouilles', event_type: 'earned' });
 *
 * // Load more for infinite scroll
 * if (rewardJournalStore.hasMore) {
 *   await rewardJournalStore.loadMore();
 * }
 *
 * // Reset state
 * rewardJournalStore.reset();
 */

import type {
	RewardEvent,
	RewardJournalFilters,
	RewardJournalResponse,
	PaginationMeta
} from '$lib/types/reward-journal';

// Default filters (empty = no filtering)
const DEFAULT_FILTERS: RewardJournalFilters = {};

// Default pagination settings
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * Build query string from filters and pagination
 */
function buildQueryString(filters: RewardJournalFilters, page: number, limit: number): string {
	const params = new URLSearchParams();

	params.set('page', String(page));
	params.set('limit', String(limit));

	if (filters.reward_type) {
		params.set('reward_type', filters.reward_type);
	}
	if (filters.event_type) {
		params.set('event_type', filters.event_type);
	}
	if (filters.from) {
		params.set('from', filters.from);
	}
	if (filters.to) {
		params.set('to', filters.to);
	}

	return params.toString();
}

class RewardJournalStore {
	// State - Using Svelte 5 runes
	events = $state<RewardEvent[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);
	pagination = $state<PaginationMeta | null>(null);
	filters = $state<RewardJournalFilters>({ ...DEFAULT_FILTERS });

	// Private state
	private currentStudentId = $state<string | null>(null);
	private currentPage = $state(DEFAULT_PAGE);

	// Computed values using $derived
	hasMore = $derived(this.pagination?.hasMore ?? false);
	isEmpty = $derived(this.events.length === 0 && !this.loading);
	isFiltered = $derived(
		Boolean(
			this.filters.reward_type || this.filters.event_type || this.filters.from || this.filters.to
		)
	);

	/**
	 * Fetch events from the API
	 * @param studentId - Optional student ID for teacher view
	 */
	async fetchEvents(studentId?: string): Promise<void> {
		this.loading = true;
		this.error = null;
		this.currentPage = DEFAULT_PAGE;
		this.currentStudentId = studentId ?? null;

		try {
			const queryString = buildQueryString(this.filters, this.currentPage, DEFAULT_LIMIT);
			const baseUrl = studentId ? `/api/rewards/journal/${studentId}` : '/api/rewards/journal';
			const url = `${baseUrl}?${queryString}`;

			const response = await fetch(url);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `Erreur lors du chargement du journal (${response.status})`
				);
			}

			const data: RewardJournalResponse = await response.json();

			this.events = data.events;
			this.pagination = data.pagination;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erreur lors du chargement du journal';
			this.error = message;
			console.error('[RewardJournalStore] Error fetching events:', err);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Load next page (append to existing events for infinite scroll)
	 */
	async loadMore(): Promise<void> {
		if (this.loading || !this.hasMore) {
			return;
		}

		this.loading = true;
		this.error = null;

		try {
			const nextPage = this.currentPage + 1;
			const queryString = buildQueryString(this.filters, nextPage, DEFAULT_LIMIT);
			const baseUrl = this.currentStudentId
				? `/api/rewards/journal/${this.currentStudentId}`
				: '/api/rewards/journal';
			const url = `${baseUrl}?${queryString}`;

			const response = await fetch(url);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Erreur lors du chargement (${response.status})`);
			}

			const data: RewardJournalResponse = await response.json();

			// Append new events to existing ones
			this.events = [...this.events, ...data.events];
			this.pagination = data.pagination;
			this.currentPage = nextPage;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
			this.error = message;
			console.error('[RewardJournalStore] Error loading more events:', err);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Update filters and refresh events
	 * @param newFilters - Partial filter object to merge with current filters
	 */
	setFilters(newFilters: Partial<RewardJournalFilters>): void {
		this.filters = { ...this.filters, ...newFilters };
		// Re-fetch with new filters (uses current student ID)
		this.fetchEvents(this.currentStudentId ?? undefined);
	}

	/**
	 * Reset filters to defaults and refresh
	 */
	clearFilters(): void {
		this.filters = { ...DEFAULT_FILTERS };
		// Re-fetch with cleared filters (uses current student ID)
		this.fetchEvents(this.currentStudentId ?? undefined);
	}

	/**
	 * Reset all state to initial values
	 */
	reset(): void {
		this.events = [];
		this.loading = false;
		this.error = null;
		this.pagination = null;
		this.filters = { ...DEFAULT_FILTERS };
		this.currentStudentId = null;
		this.currentPage = DEFAULT_PAGE;
	}
}

// Factory function to create the store
function createRewardJournalStore(): RewardJournalStore {
	return new RewardJournalStore();
}

// Export singleton instance
export const rewardJournalStore = createRewardJournalStore();
