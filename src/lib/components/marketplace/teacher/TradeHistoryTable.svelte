<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ChevronLeft, ChevronRight, Package, Coins, Calendar } from 'lucide-svelte';

	interface Trade {
		id: string;
		created_at: string;
		updated_at: string;
		initiator_id: string;
		partner_id: string;
		status: 'negotiating' | 'completed' | 'cancelled';
		final_trade?: {
			initiator_gidouilles?: number;
			partner_gidouilles?: number;
			initiator_cards?: string[];
			partner_cards?: string[];
		};
		initiator?: {
			id: string;
			username: string;
			avatar_url: string | null;
		};
		partner?: {
			id: string;
			username: string;
			avatar_url: string | null;
		};
	}

	let { classId = '' }: { classId?: string } = $props();

	// State
	let trades = $state<Trade[]>([]);
	let isLoading = $state(true);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalCount = $state(0);
	let statusFilter = $state('');
	// Search functionality to be implemented
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let searchTerm = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');

	// Options for filters
	const statusOptions = [
		{ value: '', label: 'Tous les statuts' },
		{ value: 'completed', label: 'Terminés' },
		{ value: 'negotiating', label: 'En négociation' },
		{ value: 'cancelled', label: 'Annulés' }
	];

	// Fetch trades
	async function fetchTrades() {
		isLoading = true;
		try {
			const params = new URLSearchParams();
			params.set('page', currentPage.toString());
			params.set('limit', '20');

			if (classId) params.set('class_id', classId);
			if (statusFilter) params.set('status', statusFilter);
			if (dateFrom) params.set('date_from', new Date(dateFrom).toISOString());
			if (dateTo) {
				const endDate = new Date(dateTo);
				endDate.setHours(23, 59, 59, 999);
				params.set('date_to', endDate.toISOString());
			}

			const response = await fetch(`/api/marketplace/admin/trades?${params}`);
			if (!response.ok) {
				throw new Error('Erreur lors de la récupération des échanges');
			}

			const data = await response.json();
			trades = data.trades;
			totalPages = data.pagination.totalPages;
			totalCount = data.pagination.total;
		} catch (err) {
			console.error('Error fetching trades:', err);
			toaster.error('Erreur lors du chargement des échanges');
			trades = [];
		} finally {
			isLoading = false;
		}
	}

	// Handle filter changes
	function handleStatusChange() {
		currentPage = 1;
		fetchTrades();
	}

	function handleDateChange() {
		currentPage = 1;
		fetchTrades();
	}

	// Pagination
	function nextPage() {
		if (currentPage < totalPages) {
			currentPage++;
			fetchTrades();
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			currentPage--;
			fetchTrades();
		}
	}

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Format short date for inputs
	function formatDateForInput(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Get status badge color
	function getStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'completed':
				return 'default';
			case 'negotiating':
				return 'secondary';
			case 'cancelled':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	// Get status label
	function getStatusLabel(status: string): string {
		switch (status) {
			case 'completed':
				return 'Terminé';
			case 'negotiating':
				return 'En négociation';
			case 'cancelled':
				return 'Annulé';
			default:
				return status;
		}
	}

	// Set default date range (last 30 days) and fetch on mount
	// Note: Parent uses {#key classId} so component is recreated when classId changes,
	// which automatically resets pagination and refetches data via onMount
	onMount(() => {
		const today = new Date();
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(today.getDate() - 30);

		dateFrom = formatDateForInput(thirtyDaysAgo);
		dateTo = formatDateForInput(today);

		fetchTrades();
	});
</script>

<div class="space-y-4">
	<!-- Filters -->
	<div class="flex flex-wrap gap-4">
		<div class="min-w-[200px] flex-1">
			<MySelect
				type="single"
				bind:value={statusFilter}
				items={statusOptions}
				onchange={handleStatusChange}
			/>
		</div>
		<div class="flex gap-2">
			<Input type="date" bind:value={dateFrom} onchange={handleDateChange} class="w-40" />
			<span class="flex items-center px-2">à</span>
			<Input type="date" bind:value={dateTo} onchange={handleDateChange} class="w-40" />
		</div>
	</div>

	<!-- Table -->
	<div class="rounded-md border">
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Date</TableHead>
					<TableHead>Initiateur</TableHead>
					<TableHead>Partenaire</TableHead>
					<TableHead>Statut</TableHead>
					<TableHead class="text-center">Gidouilles</TableHead>
					<TableHead class="text-center">Cartes</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{#if isLoading}
					{#each Array(5) as _, i (i)}
						<TableRow>
							<TableCell><div class="h-4 w-24 animate-pulse rounded bg-gray-200"></div></TableCell>
							<TableCell><div class="h-4 w-20 animate-pulse rounded bg-gray-200"></div></TableCell>
							<TableCell><div class="h-4 w-20 animate-pulse rounded bg-gray-200"></div></TableCell>
							<TableCell><div class="h-4 w-16 animate-pulse rounded bg-gray-200"></div></TableCell>
							<TableCell
								><div class="mx-auto h-4 w-12 animate-pulse rounded bg-gray-200"></div></TableCell
							>
							<TableCell
								><div class="mx-auto h-4 w-12 animate-pulse rounded bg-gray-200"></div></TableCell
							>
						</TableRow>
					{/each}
				{:else if trades.length === 0}
					<TableRow>
						<TableCell colspan={6} class="py-8 text-center">
							<Package class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
							<p class="text-muted-foreground">Aucun échange trouvé</p>
						</TableCell>
					</TableRow>
				{:else}
					{#each trades as trade (trade.id)}
						<TableRow>
							<TableCell class="whitespace-nowrap">
								<div class="flex items-center gap-1 text-sm">
									<Calendar class="h-3 w-3 text-muted-foreground" />
									{formatDate(trade.created_at)}
								</div>
							</TableCell>
							<TableCell>
								<div class="font-medium">
									{trade.initiator?.username || 'Inconnu'}
								</div>
							</TableCell>
							<TableCell>
								<div class="font-medium">
									{trade.partner?.username || 'Inconnu'}
								</div>
							</TableCell>
							<TableCell>
								<Badge variant={getStatusColor(trade.status)}>
									{getStatusLabel(trade.status)}
								</Badge>
							</TableCell>
							<TableCell class="text-center">
								{#if trade.status === 'completed' && trade.final_trade}
									<div class="flex flex-col gap-1 text-sm">
										{#if trade.final_trade.initiator_gidouilles}
											<div class="flex items-center justify-center gap-1">
												<Coins class="h-3 w-3" />
												<span>{trade.final_trade.initiator_gidouilles}</span>
												<span class="text-muted-foreground">→</span>
											</div>
										{/if}
										{#if trade.final_trade.partner_gidouilles}
											<div class="flex items-center justify-center gap-1">
												<span class="text-muted-foreground">←</span>
												<span>{trade.final_trade.partner_gidouilles}</span>
												<Coins class="h-3 w-3" />
											</div>
										{/if}
										{#if !trade.final_trade.initiator_gidouilles && !trade.final_trade.partner_gidouilles}
											<span class="text-muted-foreground">-</span>
										{/if}
									</div>
								{:else}
									<span class="text-muted-foreground">-</span>
								{/if}
							</TableCell>
							<TableCell class="text-center">
								{#if trade.status === 'completed' && trade.final_trade}
									<div class="flex flex-col gap-1 text-sm">
										{#if trade.final_trade.initiator_cards?.length}
											<div class="flex items-center justify-center gap-1">
												<Package class="h-3 w-3" />
												<span>{trade.final_trade.initiator_cards.length}</span>
												<span class="text-muted-foreground">→</span>
											</div>
										{/if}
										{#if trade.final_trade.partner_cards?.length}
											<div class="flex items-center justify-center gap-1">
												<span class="text-muted-foreground">←</span>
												<span>{trade.final_trade.partner_cards.length}</span>
												<Package class="h-3 w-3" />
											</div>
										{/if}
										{#if !trade.final_trade.initiator_cards?.length && !trade.final_trade.partner_cards?.length}
											<span class="text-muted-foreground">-</span>
										{/if}
									</div>
								{:else}
									<span class="text-muted-foreground">-</span>
								{/if}
							</TableCell>
						</TableRow>
					{/each}
				{/if}
			</TableBody>
		</Table>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				Page {currentPage} sur {totalPages} ({totalCount} échanges au total)
			</p>
			<div class="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={prevPage}
					disabled={currentPage === 1 || isLoading}
				>
					<ChevronLeft class="h-4 w-4" />
					Précédent
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={nextPage}
					disabled={currentPage === totalPages || isLoading}
				>
					Suivant
					<ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}
</div>
