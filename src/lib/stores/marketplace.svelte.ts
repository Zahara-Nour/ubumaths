// Marketplace Store
// ================
// Main store for managing marketplace state with Svelte 5 runes and Supabase realtime

import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
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
	private listingsChannel: RealtimeChannel | null = null;
	private tradesChannel: RealtimeChannel | null = null;
	private proposalsChannel: RealtimeChannel | null = null;
	private chatChannel: RealtimeChannel | null = null;

	// Cache management
	private lastFetch = {
		listings: 0,
		myListings: 0,
		proposals: 0,
		trades: 0,
		cards: 0
	};
	private readonly CACHE_TTL = 300000; // 5 minutes (realtime handles instant updates)

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
		await this.subscribeToRealtime();
		await this.fetchConfig();
		await this.fetchInitialData();
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

	// Reconnect realtime subscriptions after connection loss
	private async reconnectRealtime() {
		console.log('Attempting to reconnect realtime subscriptions...');
		try {
			// Cleanup existing subscriptions
			await this.cleanupRealtime();

			// Resubscribe
			await this.subscribeToRealtime();

			// Invalidate all caches to force data refetch
			this.invalidateAllCaches();

			toaster.success('Connexion rétablie');
		} catch (error) {
			console.error('Failed to reconnect realtime:', error);
			toaster.error('Échec de la reconnexion');
		}
	}

	// Cleanup realtime subscriptions
	private async cleanupRealtime() {
		if (this.listingsChannel) {
			await supabaseRealtimeManager.unsubscribeChannel('marketplace-listings');
			this.listingsChannel = null;
		}
		if (this.tradesChannel) {
			await supabaseRealtimeManager.unsubscribeChannel(`marketplace-trades-${this.userId}`);
			this.tradesChannel = null;
		}
		if (this.proposalsChannel) {
			await supabaseRealtimeManager.unsubscribeChannel(`marketplace-proposals-${this.userId}`);
			this.proposalsChannel = null;
		}
		if (this.chatChannel) {
			await supabaseRealtimeManager.unsubscribeChannel(this.chatChannel.topic);
			this.chatChannel = null;
		}
	}

	// Realtime subscriptions
	private async subscribeToRealtime() {
		if (!this.supabase || !this.userId) return;

		// Initialize the underlying realtime manager
		supabaseRealtimeManager.init(this.supabase, this.userId);

		// Subscribe to new listings (all active)
		this.listingsChannel = supabaseRealtimeManager.createChannel('marketplace-listings');
		this.listingsChannel
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'marketplace_listings',
					filter: 'status=eq.active'
				},
				this.handleNewListing.bind(this)
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'marketplace_listings'
				},
				this.handleListingUpdate.bind(this)
			)
			.on(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'marketplace_listings'
				},
				this.handleListingDelete.bind(this)
			)
			.on('system', { event: 'error' }, (payload) => {
				console.error('Realtime error on listings channel:', payload);
				toaster.error('Connexion temps réel perdue. Actualisation...');
				// Attempt to reconnect after 5 seconds
				setTimeout(() => {
					this.reconnectRealtime();
				}, 5000);
			});

		await supabaseRealtimeManager.subscribeChannel('marketplace-listings');

		// Subscribe to trades I'm involved in
		this.tradesChannel = supabaseRealtimeManager.createChannel(`marketplace-trades-${this.userId}`);
		this.tradesChannel
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'marketplace_trades',
					filter: `initiator_id=eq.${this.userId}`
				},
				this.handleTradeUpdate.bind(this)
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'marketplace_trades',
					filter: `partner_id=eq.${this.userId}`
				},
				this.handleTradeUpdate.bind(this)
			);

		await supabaseRealtimeManager.subscribeChannel(`marketplace-trades-${this.userId}`);

		// Subscribe to proposals on my listings and my proposals
		this.proposalsChannel = supabaseRealtimeManager.createChannel(
			`marketplace-proposals-${this.userId}`
		);
		this.proposalsChannel.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'marketplace_proposals',
				filter: `proposer_id=eq.${this.userId}`
			},
			this.handleProposalUpdate.bind(this)
		);

		await supabaseRealtimeManager.subscribeChannel(`marketplace-proposals-${this.userId}`);
	}

	// TODO Phase 6: Implement trade chat feature
	// Subscribe to trade chat
	// async subscribeToTradeChat(tradeId: string) {
	// 	if (!this.supabase || !tradeId) return;

	// 	const channelName = `trade-chat-${tradeId}`;

	// 	// Unsubscribe from previous chat if any
	// 	if (this.chatChannel) {
	// 		await supabaseRealtimeManager.unsubscribeChannel(this.chatChannel.topic);
	// 	}

	// 	this.chatChannel = supabaseRealtimeManager.createChannel(channelName);
	// 	this.chatChannel.on(
	// 		'postgres_changes',
	// 		{
	// 			event: 'INSERT',
	// 			schema: 'public',
	// 			table: 'marketplace_trade_chat',
	// 			filter: `trade_id=eq.${tradeId}`
	// 		},
	// 		(payload: { new: Record<string, unknown> }) => {
	// 			const message = payload.new as MarketplaceTradeChatMessage;
	// 			const messages = this.tradeChatMessages.get(tradeId) || [];
	// 			this.tradeChatMessages.set(tradeId, [...messages, message]);
	// 		}
	// 	);

	// 	await supabaseRealtimeManager.subscribeChannel(channelName);
	// }

	// Handlers
	private handleNewListing(payload: { new: Record<string, unknown> }) {
		const newListing = payload.new as unknown as MarketplaceListing;
		// Add to listings if not already present and not created by current user
		if (
			!this.listings.find((l) => l.id === newListing.id) &&
			newListing.creator_id !== this.userId
		) {
			this.listings = [newListing, ...this.listings];
			this.stats.active_listings++;

			// Show toast notification
			toaster.info(`Nouvelle annonce: ${newListing.title}`);
		}
		// Invalidate cache to force refetch on next navigation
		this.invalidateCache('listings');
	}

	private handleListingUpdate(payload: { new: Record<string, unknown> }) {
		const updated = payload.new as unknown as MarketplaceListing;
		this.listings = this.listings.map((l) => (l.id === updated.id ? updated : l));
		this.myListings = this.myListings.map((l) => (l.id === updated.id ? updated : l));

		// Update selected if viewing
		if (this.selectedListing?.id === updated.id) {
			this.selectedListing = updated;
		}

		// Invalidate caches
		this.invalidateCache('listings');
		this.invalidateCache('myListings');
	}

	private handleListingDelete(payload: { old: Record<string, unknown> }) {
		const deletedId = (payload.old as { id: string }).id;
		this.listings = this.listings.filter((l) => l.id !== deletedId);
		this.myListings = this.myListings.filter((l) => l.id !== deletedId);

		if (this.selectedListing?.id === deletedId) {
			this.selectedListing = null;
		}
	}

	private handleTradeUpdate(payload: { new: Record<string, unknown> }) {
		const trade = payload.new as unknown as MarketplaceTrade;
		const existing = this.activeTrades.find((t) => t.id === trade.id);

		if (existing) {
			this.activeTrades = this.activeTrades.map((t) => (t.id === trade.id ? trade : t));

			// Show toast if status changed
			if (existing.status !== trade.status) {
				if (trade.status === 'completed') {
					toaster.success('Échange terminé!');
				} else if (trade.status === 'cancelled') {
					toaster.info('Échange annulé');
				}
			}
		} else {
			this.activeTrades = [...this.activeTrades, trade];
		}

		// Update pending count
		this.updatePendingCounts();

		// Update selected if viewing
		if (this.selectedTrade?.id === trade.id) {
			this.selectedTrade = trade;
		}

		// Invalidate cache
		this.invalidateCache('trades');
	}

	private handleProposalUpdate(payload: { new: Record<string, unknown> }) {
		const proposal = payload.new as unknown as MarketplaceProposal;

		// Update my proposals
		if (proposal.proposer_id === this.userId) {
			const existing = this.myProposals.find((p) => p.id === proposal.id);
			if (existing) {
				this.myProposals = this.myProposals.map((p) => (p.id === proposal.id ? proposal : p));

				// Show toast if status changed
				if (existing.status !== proposal.status) {
					if (proposal.status === 'accepted') {
						toaster.success('Votre proposition a été acceptée!');
					} else if (proposal.status === 'rejected') {
						toaster.warning('Votre proposition a été refusée');
					}
				}
			} else {
				this.myProposals = [...this.myProposals, proposal];
			}
		}

		// Update pending counts
		this.updatePendingCounts();

		// Invalidate cache
		this.invalidateCache('proposals');
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

	// Fetch my proposals
	async fetchMyProposals() {
		if (!this.userId) return;

		this.isLoading.proposals = true;

		try {
			const response = await fetch('/api/marketplace/proposals?proposer_id=' + this.userId);
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
	async fetchMyVipCards() {
		if (!this.supabase || !this.userId) return;

		this.isLoading.cards = true;

		try {
			// This would typically call an API endpoint that returns cards with lock status
			// For now, we'll simulate the structure
			const response = await fetch('/api/vip-cards/my-cards?include_locked=true');
			if (response.ok) {
				this.myVipCards = await response.json();
			}
		} catch (_error) {
			console.error('Failed to fetch VIP cards:', _error);
		} finally {
			this.isLoading.cards = false;
		}
	}

	// Fetch user's gidouilles balance
	async fetchUserGidouilles() {
		if (!this.supabase || !this.userId) return;

		try {
			const { data, error } = await this.supabase
				.from('profiles')
				.select('gidouilles')
				.eq('id', this.userId)
				.single();

			if (data && !error) {
				this.userGidouilles = data.gidouilles || 0;
			}
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

	// Accept a proposal
	async acceptProposal(proposalId: string, responseMessage?: string): Promise<boolean> {
		// Validate data with Zod
		const validation = updateProposalSchema.safeParse({
			status: 'accepted',
			response_message: responseMessage
		});
		if (!validation.success) {
			toaster.error(validation.error.issues[0].message);
			return false;
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
				await this.fetchMyListings();
				await this.fetchReceivedProposals();
				return true;
			} else {
				const error = await response.text();
				toaster.error(error || "Erreur lors de l'acceptation");
				return false;
			}
		} catch (_error) {
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

	// Accept trade offer
	async acceptTradeOffer(tradeId: string): Promise<boolean> {
		try {
			const response = await fetch(`/api/marketplace/trades/${tradeId}/accept`, {
				method: 'POST'
			});

			if (response.ok) {
				toaster.success('Échange accepté et complété!');
				await this.fetchMyTrades();
				await this.fetchMyVipCards();
				return true;
			} else {
				const error = await response.text();
				toaster.error(error || "Erreur lors de l'acceptation");
				return false;
			}
		} catch (_error) {
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
	async cleanup() {
		await this.cleanupRealtime();

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
