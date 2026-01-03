<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Package, Coins, User, TrendingUp, TrendingDown } from 'lucide-svelte';

	interface Listing {
		id: string;
		created_at: string;
		title: string;
		description?: string;
		listing_type: 'sell' | 'buy';
		status: 'active' | 'completed' | 'cancelled';
		creator_id: string;
		offered_card_ids: string[];
		offered_gidouilles: number;
		wanted_card_template_ids: string[];
		wanted_gidouilles: number;
		creator?: {
			id: string;
			username: string;
			avatar_url?: string;
		};
		proposal_count?: number;
		cards?: Array<{
			id: string;
			template: {
				id: string;
				name: string;
				rarity: string;
			};
		}>;
		wanted_templates?: Array<{
			id: string;
			name: string;
			rarity: string;
		}>;
	}

	let { classId = '' }: { classId?: string } = $props();

	// State
	let listings = $state<Listing[]>([]);
	let isLoading = $state(true);
	let typeFilter = $state('');
	let statusFilter = $state('active');
	let sortBy = $state('created_at');

	// Filter options
	const typeOptions = [
		{ value: '', label: 'Tous les types' },
		{ value: 'sell', label: 'Ventes' },
		{ value: 'buy', label: 'Achats' }
	];

	const statusOptions = [
		{ value: 'active', label: 'Actives' },
		{ value: 'completed', label: 'Terminées' },
		{ value: 'cancelled', label: 'Annulées' },
		{ value: '', label: 'Toutes' }
	];

	const sortOptions = [
		{ value: 'created_at', label: 'Plus récentes' },
		{ value: 'gidouilles', label: 'Plus chères' },
		{ value: 'proposals', label: 'Plus de propositions' }
	];

	// Fetch listings
	async function fetchListings() {
		isLoading = true;
		try {
			// First get student IDs for the class
			let studentIds: string[] = [];

			if (classId) {
				const studentsResponse = await fetch(`/api/classes/${classId}/students`);
				if (studentsResponse.ok) {
					const { students } = (await studentsResponse.json()) as {
						students: Array<{ id: string }>;
					};
					studentIds = students.map((s) => s.id);
				}
			} else {
				// Get all teacher's students
				const classesResponse = await fetch('/api/teacher/classes');
				if (classesResponse.ok) {
					const { classes } = (await classesResponse.json()) as {
						classes: Array<{ id: string }>;
					};
					for (const cls of classes) {
						const studentsResponse = await fetch(`/api/classes/${cls.id}/students`);
						if (studentsResponse.ok) {
							const { students } = (await studentsResponse.json()) as {
								students: Array<{ id: string }>;
							};
							studentIds.push(...students.map((s) => s.id));
						}
					}
				}
			}

			if (studentIds.length === 0) {
				listings = [];
				return;
			}

			// Fetch listings for these students
			const params = new URLSearchParams();
			params.set('page', '1');
			params.set('limit', '50');
			if (typeFilter) params.set('type', typeFilter);

			const response = await fetch(`/api/marketplace/listings?${params}`);
			if (!response.ok) {
				throw new Error('Erreur lors de la récupération des annonces');
			}

			const data = await response.json();

			// Filter to only show listings from teacher's students
			let filteredListings = data.listings.filter((l: Listing) =>
				studentIds.includes(l.creator_id)
			);

			// Apply status filter
			if (statusFilter) {
				filteredListings = filteredListings.filter((l: Listing) => l.status === statusFilter);
			}

			// Sort listings
			switch (sortBy) {
				case 'gidouilles':
					filteredListings.sort((a: Listing, b: Listing) => {
						const aValue = a.listing_type === 'sell' ? a.offered_gidouilles : a.wanted_gidouilles;
						const bValue = b.listing_type === 'sell' ? b.offered_gidouilles : b.wanted_gidouilles;
						return bValue - aValue;
					});
					break;
				case 'proposals':
					filteredListings.sort(
						(a: Listing, b: Listing) => (b.proposal_count || 0) - (a.proposal_count || 0)
					);
					break;
				default:
					// Already sorted by created_at from API
					break;
			}

			listings = filteredListings;
		} catch (err) {
			console.error('Error fetching listings:', err);
			toaster.error('Erreur lors du chargement des annonces');
			listings = [];
		} finally {
			isLoading = false;
		}
	}

	// Handle filter changes
	function handleFilterChange() {
		fetchListings();
	}

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffDays === 0) return "Aujourd'hui";
		if (diffDays === 1) return 'Hier';
		if (diffDays < 7) return `Il y a ${diffDays} jours`;

		return date.toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short'
		});
	}

	// Get status color
	function getStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'active':
				return 'default';
			case 'completed':
				return 'secondary';
			case 'cancelled':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	// Get type icon
	function getTypeIcon(type: string) {
		return type === 'sell' ? TrendingDown : TrendingUp;
	}

	// Get rarity color (unused but kept for potential future enhancement)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function getRarityColor(rarity: string): string {
		switch (rarity.toLowerCase()) {
			case 'legendary':
				return 'text-orange-500 font-bold';
			case 'epic':
				return 'text-purple-500 font-semibold';
			case 'rare':
				return 'text-blue-500';
			default:
				return 'text-gray-600';
		}
	}

	// Load on mount
	// Note: Parent uses {#key classId} so component is recreated when classId changes
	onMount(() => {
		fetchListings();
	});
</script>

<div class="space-y-4">
	<!-- Filters -->
	<div class="flex flex-wrap gap-4">
		<div class="min-w-[150px] flex-1">
			<MySelect
				type="single"
				bind:value={typeFilter}
				items={typeOptions}
				onchange={handleFilterChange}
			/>
		</div>
		<div class="min-w-[150px] flex-1">
			<MySelect
				type="single"
				bind:value={statusFilter}
				items={statusOptions}
				onchange={handleFilterChange}
			/>
		</div>
		<div class="min-w-[150px] flex-1">
			<MySelect
				type="single"
				bind:value={sortBy}
				items={sortOptions}
				onchange={handleFilterChange}
			/>
		</div>
	</div>

	<!-- Stats Summary -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card>
			<CardContent class="pt-6">
				<div class="text-2xl font-bold">{listings.length}</div>
				<p class="text-xs text-muted-foreground">Annonces totales</p>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="pt-6">
				<div class="text-2xl font-bold">
					{listings.filter((l) => l.status === 'active').length}
				</div>
				<p class="text-xs text-muted-foreground">Actives</p>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="pt-6">
				<div class="text-2xl font-bold">
					{listings.filter((l) => l.listing_type === 'sell').length}
				</div>
				<p class="text-xs text-muted-foreground">Ventes</p>
			</CardContent>
		</Card>
		<Card>
			<CardContent class="pt-6">
				<div class="text-2xl font-bold">
					{listings.filter((l) => l.listing_type === 'buy').length}
				</div>
				<p class="text-xs text-muted-foreground">Achats</p>
			</CardContent>
		</Card>
	</div>

	<!-- Listings Grid -->
	<ScrollArea class="h-[600px]">
		<div class="grid gap-4 pr-4 md:grid-cols-2 lg:grid-cols-3">
			{#if isLoading}
				{#each Array(6) as _, i (i)}
					<Card>
						<CardHeader>
							<div class="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
							<div class="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200"></div>
						</CardHeader>
						<CardContent>
							<div class="h-20 animate-pulse rounded bg-gray-200"></div>
						</CardContent>
					</Card>
				{/each}
			{:else if listings.length === 0}
				<div class="col-span-full py-8 text-center">
					<Package class="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
					<p class="text-muted-foreground">Aucune annonce trouvée</p>
				</div>
			{:else}
				{#each listings as listing (listing.id)}
					{@const TypeIcon = getTypeIcon(listing.listing_type)}
					<Card class={listing.status !== 'active' ? 'opacity-60' : ''}>
						<CardHeader class="pb-3">
							<div class="flex items-start justify-between">
								<div class="flex-1 space-y-1">
									<CardTitle class="line-clamp-1 text-base">
										{listing.title}
									</CardTitle>
									<div class="flex items-center gap-2 text-sm text-muted-foreground">
										<User class="h-3 w-3" />
										<span>{listing.creator?.username || 'Inconnu'}</span>
										<span>·</span>
										<span>{formatDate(listing.created_at)}</span>
									</div>
								</div>
								<Badge variant={getStatusColor(listing.status)}>
									{listing.status === 'active'
										? 'Active'
										: listing.status === 'completed'
											? 'Terminée'
											: 'Annulée'}
								</Badge>
							</div>
						</CardHeader>
						<CardContent class="space-y-3">
							<!-- Type Badge -->
							<div class="flex items-center gap-2">
								<TypeIcon class="h-4 w-4" />
								<Badge variant="outline">
									{listing.listing_type === 'sell' ? 'Vente' : 'Achat'}
								</Badge>
								{#if listing.proposal_count && listing.proposal_count > 0}
									<Badge variant="secondary">
										{listing.proposal_count} proposition{listing.proposal_count > 1 ? 's' : ''}
									</Badge>
								{/if}
							</div>

							<!-- Offered/Wanted Items -->
							<div class="space-y-2 text-sm">
								{#if listing.listing_type === 'sell'}
									{#if listing.offered_gidouilles > 0}
										<div class="flex items-center gap-2">
											<Coins class="h-4 w-4 text-yellow-500" />
											<span class="font-medium">{listing.offered_gidouilles} gidouilles</span>
											<span class="text-muted-foreground">offertes</span>
										</div>
									{/if}
									{#if listing.offered_card_ids.length > 0}
										<div class="flex items-center gap-2">
											<Package class="h-4 w-4 text-blue-500" />
											<span class="font-medium"
												>{listing.offered_card_ids.length} carte{listing.offered_card_ids.length > 1
													? 's'
													: ''}</span
											>
											<span class="text-muted-foreground"
												>offerte{listing.offered_card_ids.length > 1 ? 's' : ''}</span
											>
										</div>
									{/if}
								{/if}

								{#if listing.wanted_gidouilles > 0}
									<div class="flex items-center gap-2">
										<Coins class="h-4 w-4 text-yellow-500" />
										<span class="font-medium">{listing.wanted_gidouilles} gidouilles</span>
										<span class="text-muted-foreground">demandées</span>
									</div>
								{/if}
								{#if listing.wanted_card_template_ids.length > 0}
									<div class="flex items-center gap-2">
										<Package class="h-4 w-4 text-blue-500" />
										<span class="font-medium"
											>{listing.wanted_card_template_ids.length} modèle{listing
												.wanted_card_template_ids.length > 1
												? 's'
												: ''}</span
										>
										<span class="text-muted-foreground"
											>demandé{listing.wanted_card_template_ids.length > 1 ? 's' : ''}</span
										>
									</div>
								{/if}
							</div>

							{#if listing.description}
								<p class="line-clamp-2 text-sm text-muted-foreground">
									{listing.description}
								</p>
							{/if}
						</CardContent>
					</Card>
				{/each}
			{/if}
		</div>
	</ScrollArea>
</div>
