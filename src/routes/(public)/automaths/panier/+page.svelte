<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ShoppingCart, Trash2, ArrowLeft, FileDown, Rocket, Link, Save } from '@lucide/svelte';
	import { questionCart } from '$lib/stores/questionCart.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import CartQuestionCard from '$lib/components/CartQuestionCard.svelte';
	import TestModeDialog from '$lib/components/test/TestModeDialog.svelte';
	import SaveSeriesDialog from '$lib/components/series/SaveSeriesDialog.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { buildSeriesLink } from '$lib/validation/series';
	import { previewCartItem } from '$lib/questions/cart-preview';
	import type { TestMode } from '$lib/types/test';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Prof et admin enregistrent le panier comme série (C18)
	let isTeacher = $derived(data.userRole === 'teacher' || data.userRole === 'admin');

	// Initialize cache with server-loaded templates (SSR support)
	// Or fetch from API if server load failed (e.g., offline after navigation)
	$effect(() => {
		if (data.templates && data.templates.length > 0) {
			questionTemplatesCache.initializeFromServer(data.templates);
		} else if (questionTemplatesCache.isEmpty) {
			// Try to fetch from API if cache is empty and server load failed
			questionTemplatesCache.fetchTemplates().catch((err) => {
				console.error('Failed to fetch templates for cache:', err);
			});
		}
	});

	// Reactive cart state
	let cartItems = $derived(questionCart.allItems);
	let isEmpty = $derived(cartItems.length === 0);
	let totalInstances = $derived(questionCart.totalInstances);

	// Test dialog state
	let testDialogOpen = $state(false);
	let saveSeriesDialogOpen = $state(false);

	/**
	 * Generate instances for cart items
	 * For each category, finds matching templates and randomly selects one
	 */
	let cartItemsWithInstances = $derived(
		cartItems.map((item) => {
			// Use cache if available, fallback to data.templates
			const templates =
				questionTemplatesCache.templates.length > 0
					? questionTemplatesCache.templates
					: data.templates;
			return { item, ...previewCartItem(templates, item.category) };
		})
	);

	/**
	 * Increment quantity for a category
	 */
	function handleIncrementQuantity(category: (typeof cartItems)[0]['category']) {
		questionCart.incrementQuantity(category);
	}

	/**
	 * Decrement quantity for a category
	 * Will remove item from cart if quantity reaches 0
	 */
	function handleDecrementQuantity(category: (typeof cartItems)[0]['category']) {
		questionCart.decrementQuantity(category);
	}

	/**
	 * Update delay for a category
	 */
	function handleUpdateDelay(category: (typeof cartItems)[0]['category'], delay: number) {
		questionCart.updateDelay(category, delay);
	}

	/**
	 * Clear entire cart with confirmation
	 */
	function handleClearCart() {
		if (confirm('Êtes-vous sûr de vouloir vider votre panier ? Cette action est irréversible.')) {
			questionCart.clearCart();
		}
	}

	/**
	 * Go back to question selection
	 */
	function handleBackToSelection() {
		goto('/automaths').then(() => {});
	}

	/**
	 * Open test mode dialog
	 */
	function handleStartTest() {
		testDialogOpen = true;
	}

	/**
	 * Handle test mode selection and navigate to test page
	 */
	function handleTestModeSelect(mode: TestMode, timeLimit?: number) {
		// Encode cart items as JSON for URL param
		const categoriesParam = encodeURIComponent(JSON.stringify(cartItems));

		// Build URL params
		const params = new URLSearchParams({
			mode,
			categories: categoriesParam
		});

		// Add time limit for course mode
		if (timeLimit !== undefined) {
			params.set('time', String(timeLimit));
		}

		// Navigate to test page
		goto(`/automaths/test?${params.toString()}`).then(() => {});
	}

	/**
	 * Placeholder actions (to be implemented)
	 */
	function handleExportPDF() {
		alert(
			'Export PDF - Fonctionnalité à venir !\n\nCette fonction générera un document PDF avec toutes les questions sélectionnées pour impression.'
		);
	}

	/**
	 * Copier le lien de la série (C18) : la composition est dans l'URL, sans
	 * forme — le lien ouvre le choix de la forme.
	 */
	async function handleCopyLink() {
		try {
			await navigator.clipboard.writeText(buildSeriesLink(window.location.origin, cartItems));
			toaster.success('Lien copié');
		} catch {
			toaster.error('Impossible de copier le lien');
		}
	}

	function handleOpenSaveSeries() {
		saveSeriesDialogOpen = true;
	}

	function handleSeriesSaved() {
		goto('/dashboard/teacher/series').then(() => {});
	}
</script>

<svelte:head>
	<title>Panier - Automaths | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={handleBackToSelection}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
					<ShoppingCart class="h-8 w-8" />
					Mon Panier
				</h1>
			</div>
		</div>

		{#if !isEmpty}
			<Button variant="outline" onclick={handleClearCart}>
				<Trash2 class="mr-2 h-4 w-4" />
				Vider le panier
			</Button>
		{/if}
	</div>

	{#if isEmpty}
		<!-- Empty state -->
		<Card.Root class="border-dashed">
			<Card.Content class="flex min-h-96 items-center justify-center p-12">
				<div class="text-center">
					<ShoppingCart class="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
					<h2 class="text-xl font-semibold text-muted-foreground">Votre panier est vide</h2>
					<p class="mt-2 text-sm text-muted-foreground">
						Ajoutez des questions depuis la page Automaths pour commencer.
					</p>
					<Button onclick={handleBackToSelection} class="mt-6">
						<ArrowLeft class="mr-2 h-4 w-4" />
						Parcourir les questions
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Cart content -->
		<div class="space-y-6">
			<!-- Questions grid -->
			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each cartItemsWithInstances as { item, instance } (item.category.theme + item.category.domain + item.category.subdomain + item.category.level)}
					<CartQuestionCard
						{item}
						{instance}
						onIncrementQuantity={handleIncrementQuantity}
						onDecrementQuantity={handleDecrementQuantity}
						onUpdateDelay={handleUpdateDelay}
					/>
				{/each}
			</div>

			<!-- Action buttons -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Actions disponibles</Card.Title>
					<Card.Description>
						{totalInstances} instance{totalInstances > 1 ? 's' : ''} au total ({cartItems.length}
						catégorie{cartItems.length > 1 ? 's' : ''})
					</Card.Description>
				</Card.Header>
				<Card.Content
					class="grid gap-4 {isTeacher ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}"
				>
					{#if isTeacher}
						<Button
							onclick={handleOpenSaveSeries}
							class="h-auto flex-col gap-2 py-6"
							variant="default"
						>
							<Save class="h-6 w-6" />
							<div class="text-center">
								<div class="font-semibold">Enregistrer comme série</div>
								<div class="text-xs font-normal opacity-80">
									Pour en faire une évaluation pour vos {lore.entities.class}s
								</div>
							</div>
						</Button>
					{/if}

					<Button onclick={handleExportPDF} class="h-auto flex-col gap-2 py-6" variant="outline">
						<FileDown class="h-6 w-6" />
						<div class="text-center">
							<div class="font-semibold">Export PDF</div>
							<div class="text-xs font-normal opacity-80">Imprimer les questions</div>
						</div>
					</Button>

					<Button onclick={handleStartTest} class="h-auto flex-col gap-2 py-6">
						<Rocket class="h-6 w-6" />
						<div class="text-center">
							<div class="font-semibold">Commencer un test</div>
							<div class="text-xs font-normal opacity-80">Révision ou quiz</div>
						</div>
					</Button>

					<Button onclick={handleCopyLink} class="h-auto flex-col gap-2 py-6" variant="outline">
						<Link class="h-6 w-6" />
						<div class="text-center">
							<div class="font-semibold">Copier le lien</div>
							<div class="text-xs font-normal opacity-80">Pour partager cette série</div>
						</div>
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>

<!-- Test Mode Dialog -->
<TestModeDialog bind:open={testDialogOpen} onSelect={handleTestModeSelect} />

{#if isTeacher}
	<SaveSeriesDialog
		bind:open={saveSeriesDialogOpen}
		categories={cartItems}
		onSaved={handleSeriesSaved}
	/>
{/if}
