// Marketplace Store
// ================
// Main store for managing marketplace state with Svelte 5 runes

import { get } from 'svelte/store';
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
import { vipCardTemplates } from '$lib/stores/vipCardTemplates.svelte';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	MarketplaceListing,
	MarketplaceTrade,
	MarketplaceProposal,
	MarketplaceConfig,
	MarketplaceStats,
	CreateListingData,
	CreateProposalData,
	CreateTradeOfferData,
	ListingsFilter,
	VipCardWithLockStatus,
	MarketplaceTradeChatMessage
} from '$lib/types/marketplace';
import { toaster } from '$lib/stores/toaster.svelte';
import {
	createListingSchema,
	createProposalSchema,
	createTradeSchema,
	createOfferSchema,
	// chatMessageSchema, // TODO Phase 6: Uncomment when trade chat is implemented
	updateProposalSchema
} from '$lib/validation/marketplace';

class MarketplaceStore {
	// State - Using Svelte 5 runes
	listings = $state<MarketplaceListing[]>([]);
	myListings = $state<MarketplaceListing[]>([]);
	activeTrades = $state<MarketplaceTrade[]>([]);
	myProposals = $state<MarketplaceProposal[]>([]);
	receivedProposals = $state<MarketplaceProposal[]>([]);
	config = $state<MarketplaceConfig | null>(null);
	myVipCards = $state<VipCardWithLockStatus[]>([]);
	userGidouilles = $state<number>(0);

	// Selected items for details view
	selectedListing = $state<MarketplaceListing | null>(null);
	selectedTrade = $state<MarketplaceTrade | null>(null);

	// Pending actions count for badges
	pendingActions = $state({
		listings: 0, // Proposals received on my listings
		trades: 0, // Trade offers awaiting my response
		proposals: 0 // My proposals that got response
	});

	// Loading states
	isLoading = $state({
		listings: false,
		myListings: false,
		trades: false,
		proposals: false,
		cards: false,
		config: false
	});

	// Error states
	errors = $state({
		listings: null as string | null,
		trades: null as string | null,
		proposals: null as string | null
	});

	// Pagination
	pagination = $state({
		listings: { page: 1, limit: 12, hasMore: true },
		myListings: { page: 1, limit: 10, hasMore: true }
	});

	// Filters
	filters = $state<ListingsFilter>({
		type: 'all',
		sort_by: 'recent'
	});

	// Stats
	stats = $state<MarketplaceStats>({
		total_listings: 0,
		active_listings: 0,
		my_active_listings: 0,
		my_pending_proposals: 0,
		my_active_trades: 0
	});

	// Trade chat messages (keyed by trade ID)
	tradeChatMessages = $state<Map<string, MarketplaceTradeChatMessage[]>>(new Map());

	// Private
	private supabase: SupabaseClient | null = null;
	private userId: string | null = null;
	private classId: string | null = null;

	// Cache management
	private lastFetch = {
		listings: 0,
		myListings: 0,
		proposals: 0,
		trades: 0,
		cards: 0
	};
	private readonly CACHE_TTL = 60000; // 1 minute - shorter TTL since no realtime

	// Cache helper methods
	private shouldRefetch(key: keyof typeof this.lastFetch): boolean {
		return Date.now() - this.lastFetch[key] > this.CACHE_TTL;
	}

	private invalidateCache(key: keyof typeof this.lastFetch): void {
		this.lastFetch[key] = 0;
	}

	private invalidateAllCaches(): void {
		this.lastFetch.listings = 0;
		this.lastFetch.myListings = 0;
		this.lastFetch.proposals = 0;
		this.lastFetch.trades = 0;
		this.lastFetch.cards = 0;
	}

	// Initialize
	async init(supabase: SupabaseClient, userId: string, classId?: string) {
		this.supabase = supabase;
		this.userId = userId;
		this.classId = classId || null;
		await this.fetchConfig();
		await this.fetchInitialData();
	}

	// Refresh all marketplace data (manual refresh button)
	async refresh() {
		this.invalidateAllCaches();
		await this.fetchInitialData();
		toaster.success('Données actualisées');
	}

	// Announce status to screen readers for accessibility
	announceStatus(message: string, priority: 'polite' | 'assertive' = 'polite') {
		// Create or update status announcer element
		let announcer = document.getElementById('marketplace-status-announcer');

		if (!announcer) {
			// Create the announcer if it doesn't exist
			announcer = document.createElement('div');
			announcer.id = 'marketplace-status-announcer';
			announcer.setAttribute('role', 'status');
			announcer.setAttribute('aria-live', priority);
			announcer.setAttribute('aria-atomic', 'true');
			announcer.className = 'sr-only';
			document.body.appendChild(announcer);
		}

		// Update the announcement
		announcer.setAttribute('aria-live', priority);
		announcer.textContent = message;

		// Clear after a delay to allow for repeated announcements
		setTimeout(() => {
			if (announcer) {
				announcer.textContent = '';
			}
		}, 1000);
	}

	// Update pending action counts
	private updatePendingCounts() {
		// Count proposals on my listings that are pending
		this.pendingActions.listings = this.receivedProposals.filter(
			(p) => p.status === 'pending'
		).length;

		// Count trades where I need to respond
		this.pendingActions.trades = this.activeTrades.filter(
			(t) => t.status === 'negotiating' && t.last_offer_by && t.last_offer_by !== this.userId
		).length;

		// Count my proposals that got responses
		this.pendingActions.proposals = this.myProposals.filter(
			(p) => p.status !== 'pending' && p.response_message
		).length;
	}

	// Fetch config
	async fetchConfig() {
		if (!this.supabase) return;

		this.isLoading.config = true;
		try {
			const response = await fetch('/api/marketplace/config');
			if (response.ok) {
				this.config = await response.json();
			}
		} catch (_error) {
			console.error('Failed to fetch marketplace config:', _error);
		} finally {
			this.isLoading.config = false;
		}
	}

	// Fetch initial data
	async fetchInitialData() {
		await Promise.all([
			this.fetchListings(),
			this.fetchMyListings(),
			this.fetchMyTrades(),
			this.fetchMyProposals(),
			this.fetchMyVipCards(),
			this.fetchUserGidouilles()
		]);
	}

	// Fetch listings with filters
	async fetchListings(force = false, loadMore = false) {
		if (!this.supabase) return;

		// Check cache unless forced or loading more
		if (!force && !loadMore && !this.shouldRefetch('listings')) {
			return; // Use cached data
		}

		this.isLoading.listings = true;
		this.errors.listings = null;

		try {
			const page = loadMore ? this.pagination.listings.page + 1 : 1;
			const params = new URLSearchParams();
			if (this.filters.type && this.filters.type !== 'all')
				params.append('type', this.filters.type);
			if (this.filters.search) params.append('search', this.filters.search);
			if (this.filters.min_gidouilles !== undefined) {
				params.append('min_gidouilles', String(this.filters.min_gidouilles));
			}
			if (this.filters.max_gidouilles !== undefined) {
				params.append('max_gidouilles', String(this.filters.max_gidouilles));
			}
			if (this.filters.card_template_id) {
				params.append('card_template_id', this.filters.card_template_id);
			}
			if (this.filters.sort_by) params.append('sort_by', this.filters.sort_by);
			params.append('page', page.toString());
			params.append('limit', this.pagination.listings.limit.toString());

			const response = await fetch(`/api/marketplace/listings?${params}`);
			if (response.ok) {
				const data = await response.json();

				if (loadMore) {
					this.listings = [...this.listings, ...data.listings];
				} else {
					this.listings = data.listings;
				}

				this.pagination.listings.page = page;
				this.pagination.listings.hasMore = data.hasMore;
				this.stats.total_listings = data.total;
				this.stats.active_listings = data.active;

				// Update cache timestamp
				this.lastFetch.listings = Date.now();
			} else {
				throw new Error('Failed to fetch listings');
			}
		} catch (_error) {
			this.errors.listings = _error instanceof Error ? _error.message : 'Failed to fetch listings';
			toaster.error('Erreur lors du chargement des annonces');
		} finally {
			this.isLoading.listings = false;
		}
	}

	// Fetch my listings
	async fetchMyListings() {
		if (!this.supabase || !this.userId) return;

		this.isLoading.myListings = true;

		try {
			const response = await fetch('/api/marketplace/listings?creator_id=' + this.userId);
			if (response.ok) {
				const data = await response.json();
				this.myListings = data.listings;
				this.stats.my_active_listings = data.listings.filter(
					(l: MarketplaceListing) => l.status === 'active'
				).length;

				// Also fetch proposals on my listings
				await this.fetchReceivedProposals();
			}
		} catch (_error) {
			console.error('Failed to fetch my listings:', _error);
		} finally {
			this.isLoading.myListings = false;
		}
	}

	// Fetch received proposals
	async fetchReceivedProposals() {
		if (!this.myListings.length) return;

		try {
			const listingIds = this.myListings.map((l) => l.id);
			const response = await fetch(
				'/api/marketplace/proposals?listing_ids=' + listingIds.join(',')
			);
			if (response.ok) {
				this.receivedProposals = await response.json();
				this.updatePendingCounts();
			}
		} catch (_error) {
			console.error('Failed to fetch received proposals:', _error);
		}
	}

	// Fetch my proposals (proposals I made on other people's listings)
	async fetchMyProposals() {
		if (!this.userId) return;

		this.isLoading.proposals = true;

		try {
			const response = await fetch('/api/marketplace/proposals/my');
			if (response.ok) {
				this.myProposals = await response.json();
				this.stats.my_pending_proposals = this.myProposals.filter(
					(p) => p.status === 'pending'
				).length;
				this.updatePendingCounts();
			}
		} catch (_error) {
			console.error('Failed to fetch my proposals:', _error);
		} finally {
			this.isLoading.proposals = false;
		}
	}

	// Fetch my trades
	async fetchMyTrades() {
		if (!this.userId) return;

		this.isLoading.trades = true;
		this.errors.trades = null;

		try {
			const response = await fetch('/api/marketplace/trades');
			if (response.ok) {
				this.activeTrades = await response.json();
				this.stats.my_active_trades = this.activeTrades.filter(
					(t) => t.status === 'negotiating'
				).length;
				this.updatePendingCounts();
			}
		} catch (_error) {
			this.errors.trades = 'Failed to fetch trades';
			console.error('Failed to fetch trades:', _error);
		} finally {
			this.isLoading.trades = false;
		}
	}

	// Fetch my VIP cards with lock status
	// Uses student cache for cards + templates, only fetches locks from DB
	async fetchMyVipCards() {
		if (!this.supabase || !this.userId) return;

		this.isLoading.cards = true;

		try {
			// Get VIP cards from student cache (already loaded)
			const rewards = await studentCache.getRewards();
			const vipCards = rewards.vip_cards ?? {};
			const cardInstanceIds = Object.keys(vipCards);

			if (cardInstanceIds.length === 0) {
				this.myVipCards = [];
				return;
			}

			// Fetch only locks from DB (lightweight query)
			const { data: locks, error: locksError } = await this.supabase
				.from('marketplace_locked_cards')
				.select('card_instance_id, locked_for, locked_entity_id')
				.eq('student_id', this.userId);

			if (locksError) {
				console.error('Failed to fetch card locks:', locksError);
				this.myVipCards = [];
				return;
			}

			// Create lock map
			const lockMap = new Map(
				(locks || []).map((lock) => [
					lock.card_instance_id,
					{
						locked_for: lock.locked_for as 'listing' | 'trade',
						locked_entity_id: lock.locked_entity_id
					}
				])
			);

			// Get templates from store (already loaded at app startup)
			const templates = get(vipCardTemplates);
			const templateMap = new Map(templates.map((t) => [t.id, t]));

			// Build VipCardWithLockStatus array
			const result: VipCardWithLockStatus[] = [];

			for (const [instanceId, cardData] of Object.entries(vipCards)) {
				// Skip used cards
				if (cardData.usedAt) continue;

				const template = templateMap.get(cardData.cardId);
				if (!template) continue;

				const lock = lockMap.get(instanceId);

				result.push({
					id: instanceId,
					template_id: cardData.cardId,
					earned_at: cardData.earnedAt,
					is_locked: !!lock,
					lock_reason: lock
						? lock.locked_for === 'listing'
							? 'in_listing'
							: 'in_trade'
						: undefined,
					locked_for_listing_id: lock?.locked_for === 'listing' ? lock.locked_entity_id : null,
					locked_for_trade_id: lock?.locked_for === 'trade' ? lock.locked_entity_id : null,
					template: {
						id: template.id,
						name: template.name,
						description: template.description,
						image_path: template.image_path,
						rarity: template.rarity as 'common' | 'rare' | 'epic' | 'legendary',
						category: template.category ?? null
					}
				});
			}

			// Sort by earned_at (most recent first)
			result.sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime());

			this.myVipCards = result;
		} catch (_error) {
			console.error('Failed to fetch VIP cards:', _error);
		} finally {
			this.isLoading.cards = false;
		}
	}

	// Fetch user's gidouilles balance from student cache
	async fetchUserGidouilles() {
		if (!this.userId) return;

		try {
			const rewards = await studentCache.getRewards();
			this.userGidouilles = rewards.gidouilles || 0;
		} catch (_error) {
			console.error('Failed to fetch user gidouilles:', _error);
		}
	}

	// Create a new listing
	async createListing(data: CreateListingData): Promise<boolean> {
		if (!this.supabase || !this.userId) return false;

		// Validate data with Zod
		const validation = createListingSchema.safeParse(data);
		if (!validation.success) {
			toaster.error(validation.error.issues[0].message);
			return false;
		}

		// Create optimistic listing
		const tempId = crypto.randomUUID();
		const optimisticListing: MarketplaceListing = {
			id: tempId,
			creator_id: this.userId,
			listing_type: validation.data.listing_type,
			title: validation.data.title,
			description: validation.data.description || null,
			offered_card_ids: validation.data.offered_card_ids || null,
			offered_gidouilles: validation.data.offered_gidouilles || null,
			offered_item_ids: null,
			wanted_card_template_ids: validation.data.wanted_card_template_ids || null,
			wanted_gidouilles: validation.data.wanted_gidouilles || null,
			wanted_item_template_ids: null,
			status: 'active',
			proposal_count: 0,
			max_proposals: null,
			view_count: null,
			created_at: new Date().toISOString(),
			expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
			cancelled_at: null,
			completed_at: null,
			school_id: '' // Will be set by server
		};

		// Optimistic UI update
		this.myListings = [optimisticListing, ...this.myListings];
		this.stats.my_active_listings++;

		try {
			const response = await fetch('/api/marketplace/listings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validation.data)
			});

			if (response.ok) {
				const newListing = await response.json();

				// Replace optimistic with real listing
				this.myListings = this.myListings.map((l) => (l.id === tempId ? newListing : l));

				toaster.success('Annonce créée avec succès');
				this.announceStatus('Annonce créée avec succès');

				// Invalidate cache
				this.invalidateCache('myListings');
				this.invalidateCache('listings');

				// Refresh card locks (cards are now locked for this listing)
				await this.fetchMyVipCards();

				return true;
			} else {
				// Rollback on error
				this.myListings = this.myListings.filter((l) => l.id !== tempId);
				this.stats.my_active_listings--;

				const error = await response.text();
				toaster.error(error || "Erreur lors de la création de l'annonce");
				return false;
			}
		} catch (_error) {
			// Rollback on error
			this.myListings = this.myListings.filter((l) => l.id !== tempId);
			this.stats.my_active_listings--;

			toaster.error("Erreur lors de la création de l'annonce");
			return false;
		}
	}

	// Submit a proposal
	async submitProposal(listingId: string, data: CreateProposalData): Promise<boolean> {
		// Validate data with Zod (adding listing_id to the data)
		const validationData = { ...data, listing_id: listingId };
		const validation = createProposalSchema.safeParse(validationData);
		if (!validation.success) {
			toaster.error(validation.error.issues[0].message);
			return false;
		}

		try {
			const response = await fetch(`/api/marketplace/listings/${listingId}/proposals`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validation.data)
			});

			if (response.ok) {
				const proposal = await response.json();
				this.myProposals = [proposal, ...this.myProposals];
				toaster.success('Proposition envoyée');
				// Refresh card locks (cards are now locked for this proposal)
				await this.fetchMyVipCards();
				return true;
			} else {
				const error = await response.text();
				toaster.error(error || "Erreur lors de l'envoi de la proposition");
				return false;
			}
		} catch (_error) {
			toaster.error("Erreur lors de l'envoi de la proposition");
			return false;
		}
	}

	/**
	 * Accept a proposal on one of my listings
	 *
	 * CACHE UPDATE STRATEGY:
	 * We use two different patterns for gidouilles vs VIP cards:
	 *
	 * 1. GIDOUILLES - Predictive optimistic update:
	 *    - Delta is predictable (I receive proposal.offered - I give listing.offered)
	 *    - Update cache BEFORE API call for instant UI feedback
	 *    - Rollback on error by applying inverse delta
	 *
	 * 2. VIP CARDS - Server-confirmed update:
	 *    - We know the instanceIds of cards exchanged
	 *    - BUT we don't know the template_id of cards we receive (they belong to proposer)
	 *    - Cannot do optimistic update without template_id (needed for display)
	 *    - Solution: invalidate cache after success, let next access refetch from server
	 *
	 * @see cache-sync.ts for pattern documentation
	 */
	async acceptProposal(proposalId: string, responseMessage?: string): Promise<boolean> {
		const validation = updateProposalSchema.safeParse({
			status: 'accepted',
			response_message: responseMessage
		});
		if (!validation.success) {
			toaster.error(validation.error.issues[0].message);
			return false;
		}

		// Find the proposal and listing to calculate gidouilles delta
		const proposal = this.receivedProposals.find((p) => p.id === proposalId);
		const listing = proposal ? this.myListings.find((l) => l.id === proposal.listing_id) : null;

		// Gidouilles delta: I receive what proposer offers, I give what my listing offers
		const gidouillesDelta =
			(proposal?.offered_gidouilles || 0) - (listing?.offered_gidouilles || 0);

		// GIDOUILLES: Predictive optimistic update BEFORE API call
		if (gidouillesDelta !== 0) {
			studentCache.updateGidouillesOptimistic(gidouillesDelta);
		}

		try {
			const response = await fetch(`/api/marketplace/proposals/${proposalId}/accept`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validation.data)
			});

			if (response.ok) {
				toaster.success('Proposition acceptée - échange effectué');
				this.announceStatus('Proposition acceptée avec succès');

				// VIP CARDS: Server-confirmed pattern - invalidate to force refetch
				// This syncs the new cards (with their templates) from the server
				studentCache.invalidateRewards();

				// Refresh marketplace UI state
				await Promise.all([
					this.fetchMyListings(),
					this.fetchReceivedProposals(),
					this.fetchMyVipCards()
				]);
				return true;
			} else {
				// ROLLBACK: Reverse gidouilles delta on error
				if (gidouillesDelta !== 0) {
					studentCache.updateGidouillesOptimistic(-gidouillesDelta);
				}
				const error = await response.text();
				toaster.error(error || "Erreur lors de l'acceptation");
				return false;
			}
		} catch (_error) {
			// ROLLBACK: Reverse gidouilles delta on error
			if (gidouillesDelta !== 0) {
				studentCache.updateGidouillesOptimistic(-gidouillesDelta);
			}
			toaster.error("Erreur lors de l'acceptation");
			return false;
		}
	}

	// Reject a proposal
	async rejectProposal(proposalId: string, responseMessage?: string): Promise<boolean> {
		// Validate data with Zod
		const validation = updateProposalSchema.safeParse({
			status: 'rejected',
			response_message: responseMessage
		});
		if (!validation.success) {
			toaster.error(validation.error.issues[0].message);
			return false;
		}

		try {
			const response = await fetch(`/api/marketplace/proposals/${proposalId}/reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validation.data)
			});

			if (response.ok) {
				toaster.info('Proposition refusée');
				this.receivedProposals = this.receivedProposals.map((p) =>
					p.id === proposalId ? { ...p, status: 'rejected' as const } : p
				);
				this.updatePendingCounts();
				return true;
			} else {
				const error = await response.text();
				toaster.error(error || 'Erreur lors du refus');
				return false;
			}
		} catch (_error) {
			toaster.error('Erreur lors du refus');
			return false;
		}
	}

	// Cancel a listing
	async cancelListing(listingId: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/marketplace/listings/${listingId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				this.myListings = this.myListings.filter((l) => l.id !== listingId);
				toaster.success('Annonce annulée');
				// Refresh card locks (cards are now unlocked)
				await this.fetchMyVipCards();
				return true;
			} else {
				const error = await response.text();
				toaster.error(error || "Erreur lors de l'annulation");
				return false;
			}
		} catch (_error) {
			toaster.error("Erreur lors de l'annulation");
			return false;
		}
	}

	// Create or get friend trade
	async createFriendTrade(friendId: string): Promise<string | null> {
		// Validate data with Zod
		const validation = createTradeSchema.safeParse({
			partner_id: friendId,
			initial_offer: {
				cards: [],
				gidouilles: 0
			}
		});
		if (!validation.success) {
			toaster.error(validation.error.issues[0].message);
			return null;
		}

		try {
			const response = await fetch('/api/marketplace/trades', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validation.data)
			});

			if (response.ok) {
				const trade = await response.json();
				// Add to trades if not exists
				if (!this.activeTrades.find((t) => t.id === trade.id)) {
					this.activeTrades = [...this.activeTrades, trade];
				}
				return trade.id;
			} else {
				const error = await response.text();
				toaster.error(error || "Erreur lors de la création de l'échange");
				return null;
			}
		} catch (_error) {
			toaster.error("Erreur lors de la création de l'échange");
			return null;
		}
	}

	// Submit trade offer
	async submitTradeOffer(tradeId: string, offer: CreateTradeOfferData): Promise<boolean> {
		// Validate data with Zod (adding trade_id)
		const validationData = {
			trade_id: tradeId,
			initiator_cards: offer.initiator_card_ids || [],
			initiator_gidouilles: offer.initiator_gidouilles || 0,
			partner_cards: offer.partner_card_ids || [],
			partner_gidouilles: offer.partner_gidouilles || 0
		};
		const validation = createOfferSchema.safeParse(validationData);
		if (!validation.success) {
			toaster.error(validation.error.issues[0].message);
			return false;
		}

		try {
			const response = await fetch(`/api/marketplace/trades/${tradeId}/offers`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(validation.data)
			});

			if (response.ok) {
				const updatedTrade = await response.json();
				this.activeTrades = this.activeTrades.map((t) => (t.id === tradeId ? updatedTrade : t));
				if (this.selectedTrade?.id === tradeId) {
					this.selectedTrade = updatedTrade;
				}
				toaster.success('Offre envoyée');
				return true;
			} else {
				const error = await response.text();
				toaster.error(error || "Erreur lors de l'envoi de l'offre");
				return false;
			}
		} catch (_error) {
			toaster.error("Erreur lors de l'envoi de l'offre");
			return false;
		}
	}

	/**
	 * Accept the current offer in a friend trade
	 *
	 * CACHE UPDATE STRATEGY (same as acceptProposal):
	 *
	 * 1. GIDOUILLES - Predictive optimistic update:
	 *    - Delta calculated based on role (initiator vs partner)
	 *    - Initiator gives initiator_gidouilles, receives partner_gidouilles
	 *    - Partner gives partner_gidouilles, receives initiator_gidouilles
	 *    - Update BEFORE API, rollback on error
	 *
	 * 2. VIP CARDS - Server-confirmed update:
	 *    - Cards in offer belong to the other user (partner's cards for me to receive)
	 *    - We don't have their template_id in our local cache
	 *    - Must invalidate and refetch after success to get complete card data
	 *
	 * @see acceptProposal for detailed pattern explanation
	 */
	async acceptTradeOffer(tradeId: string): Promise<boolean> {
		const trade = this.activeTrades.find((t) => t.id === tradeId);
		const offer = trade?.latest_offer;
		const amInitiator = trade?.initiator_id === this.userId;

		// Calculate gidouilles delta based on my role in the trade
		// Initiator gives initiator_*, receives partner_*
		// Partner gives partner_*, receives initiator_*
		const gidouillesIGive = amInitiator
			? offer?.initiator_gidouilles || 0
			: offer?.partner_gidouilles || 0;
		const gidouillesIReceive = amInitiator
			? offer?.partner_gidouilles || 0
			: offer?.initiator_gidouilles || 0;
		const gidouillesDelta = gidouillesIReceive - gidouillesIGive;

		// GIDOUILLES: Predictive optimistic update BEFORE API call
		if (gidouillesDelta !== 0) {
			studentCache.updateGidouillesOptimistic(gidouillesDelta);
		}

		try {
			const response = await fetch(`/api/marketplace/trades/${tradeId}/accept`, {
				method: 'POST'
			});

			if (response.ok) {
				toaster.success('Échange accepté et complété!');

				// VIP CARDS: Server-confirmed pattern - invalidate to force refetch
				studentCache.invalidateRewards();

				// Refresh marketplace UI state
				await Promise.all([this.fetchMyTrades(), this.fetchMyVipCards()]);
				return true;
			} else {
				// ROLLBACK: Reverse gidouilles delta on error
				if (gidouillesDelta !== 0) {
					studentCache.updateGidouillesOptimistic(-gidouillesDelta);
				}
				const error = await response.text();
				toaster.error(error || "Erreur lors de l'acceptation");
				return false;
			}
		} catch (_error) {
			// ROLLBACK: Reverse gidouilles delta on error
			if (gidouillesDelta !== 0) {
				studentCache.updateGidouillesOptimistic(-gidouillesDelta);
			}
			toaster.error("Erreur lors de l'acceptation");
			return false;
		}
	}

	// Cancel trade
	async cancelTrade(tradeId: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/marketplace/trades/${tradeId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				this.activeTrades = this.activeTrades.filter((t) => t.id !== tradeId);
				if (this.selectedTrade?.id === tradeId) {
					this.selectedTrade = null;
				}
				toaster.info('Échange annulé');
				// Refresh card locks (cards are now unlocked)
				await this.fetchMyVipCards();
				return true;
			} else {
				const error = await response.text();
				toaster.error(error || "Erreur lors de l'annulation");
				return false;
			}
		} catch (_error) {
			toaster.error("Erreur lors de l'annulation");
			return false;
		}
	}

	// TODO Phase 6: Implement trade chat feature
	// Fetch trade chat messages
	// async fetchTradeChatMessages(tradeId: string) {
	// 	try {
	// 		const response = await fetch(`/api/marketplace/trades/${tradeId}/chat`);
	// 		if (response.ok) {
	// 			const messages = await response.json();
	// 			this.tradeChatMessages.set(tradeId, messages);
	// 		}
	// 	} catch (_error) {
	// 		console.error('Failed to fetch trade chat messages:', _error);
	// 	}
	// }

	// // Send trade chat message
	// async sendTradeChatMessage(tradeId: string, message: string): Promise<boolean> {
	// 	// Validate data with Zod
	// 	const validation = chatMessageSchema.safeParse({
	// 		trade_id: tradeId,
	// 		message
	// 	});
	// 	if (!validation.success) {
	// 		toaster.error(validation.error.issues[0].message);
	// 		return false;
	// 	}

	// 	try {
	// 		const response = await fetch(`/api/marketplace/trades/${tradeId}/chat`, {
	// 			method: 'POST',
	// 			headers: { 'Content-Type': 'application/json' },
	// 			body: JSON.stringify(validation.data)
	// 		});

	// 		if (response.ok) {
	// 			// Message will be added via realtime
	// 			return true;
	// 		} else {
	// 			toaster.error("Erreur lors de l'envoi du message");
	// 			return false;
	// 		}
	// 	} catch (_error) {
	// 		toaster.error("Erreur lors de l'envoi du message");
	// 		return false;
	// 	}
	// }

	// Set filters
	setFilters(newFilters: Partial<ListingsFilter>) {
		this.filters = { ...this.filters, ...newFilters };
		this.fetchListings();
	}

	// Select listing for details
	selectListing(listing: MarketplaceListing | null) {
		this.selectedListing = listing;
	}

	// Select trade for negotiation
	async selectTrade(trade: MarketplaceTrade | null) {
		this.selectedTrade = trade;
		// TODO Phase 6: Uncomment when trade chat is implemented
		// if (trade) {
		// 	await this.subscribeToTradeChat(trade.id);
		// 	await this.fetchTradeChatMessages(trade.id);
		// }
	}

	// Cleanup
	cleanup() {
		// Reset state
		this.listings = [];
		this.myListings = [];
		this.activeTrades = [];
		this.myProposals = [];
		this.receivedProposals = [];
		this.selectedListing = null;
		this.selectedTrade = null;
		this.tradeChatMessages.clear();

		// Reset cache timestamps
		this.invalidateAllCaches();
	}
}

// Export singleton instance
export const marketplaceStore = new MarketplaceStore();
