<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		ShoppingCart,
		Trash2,
		ArrowLeft,
		FileDown,
		Rocket,
		Save,
		AlertCircle
	} from '@lucide/svelte';
	import { questionCart } from '$lib/stores/questionCart.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import CartQuestionCard from '$lib/components/CartQuestionCard.svelte';
	import TestModeDialog from '$lib/components/test/TestModeDialog.svelte';
	import SaveSeriesDialog from '$lib/components/series/SaveSeriesDialog.svelte';
	import SeriesLinkShare from '$lib/components/series/SeriesLinkShare.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { parseCategoriesParam, type SeriesCategories } from '$lib/validation/series';
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

	// Série reçue par un lien `?categories=…` alors que le panier n'est pas vide (Q45)
	let incomingSeries = $state<SeriesCategories | null>(null);
	let incomingDialogOpen = $state(false);
	// Lien de série abîmé : message affiché, panier inchangé
	let linkError = $state<string | null>(null);

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

	function handleOpenSaveSeries() {
		saveSeriesDialogOpen = true;
	}

	function handleSeriesSaved() {
		goto('/dashboard/teacher/series').then(() => {});
	}

	/**
	 * Retire `categories` de l'URL : un rechargement ne redemande rien (Q45)
	 */
	function clearCategoriesParam() {
		const url = new URL(page.url);
		url.searchParams.delete('categories');
		replaceState(`${url.pathname}${url.search}${url.hash}`, page.state);
	}

	/** Remplacer / Ajouter / Annuler : le choix fait, l'URL est nettoyée */
	function resolveIncomingSeries(choice: 'replace' | 'add' | 'cancel') {
		if (incomingSeries && choice === 'replace') {
			questionCart.replaceWith(incomingSeries);
			toaster.success('Série chargée dans ton panier');
		} else if (incomingSeries && choice === 'add') {
			questionCart.mergeItems(incomingSeries);
			toaster.success('Série ajoutée à ton panier');
		}
		incomingSeries = null;
		incomingDialogOpen = false;
		clearCategoriesParam();
	}

	/** Fermer la fenêtre (Échap, clic dehors) vaut Annuler */
	function handleIncomingOpenChange(open: boolean) {
		if (!open && incomingSeries) resolveIncomingSeries('cancel');
	}

	/**
	 * Lien de série `/automaths/panier?categories=…` (Q45) : panier vide → la
	 * série y est mise ; sinon on demande. Lien abîmé → message, panier intact.
	 */
	onMount(() => {
		const raw = page.url.searchParams.get('categories');
		if (raw === null) return;

		// Au premier affichage, le routeur de SvelteKit n'est pas forcément prêt
		// (`replaceState` lève alors en dev) : on nettoie l'URL juste après
		const clearSoon = () => setTimeout(clearCategoriesParam, 0);

		const parsed = parseCategoriesParam(raw);
		if (!parsed.success) {
			linkError = parsed.error;
			clearSoon();
			return;
		}
		if (questionCart.totalItems === 0) {
			questionCart.replaceWith(parsed.data);
			toaster.success('Série chargée dans ton panier');
			clearSoon();
			return;
		}
		incomingSeries = parsed.data;
		incomingDialogOpen = true;
	});
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

	{#if linkError}
		<div
			role="alert"
			class="mb-6 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm"
		>
			<AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
			<p>{linkError} Ton panier n'a pas été modifié.</p>
		</div>
	{/if}

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
				<Card.Content class="grid gap-4 {isTeacher ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}">
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
				</Card.Content>
				<Card.Footer class="flex-col items-stretch gap-2 border-t pt-6">
					<div>
						<p class="font-semibold">Partager cette série</p>
						<p class="text-xs text-muted-foreground">
							Sans forme, le lien met la série dans le panier de qui l'ouvre ; avec une forme, il la
							lance directement.
						</p>
					</div>
					<SeriesLinkShare categories={cartItems} />
				</Card.Footer>
			</Card.Root>
		</div>
	{/if}
</div>

<!-- Lien de série reçu alors que le panier n'est pas vide (Q45) -->
<Dialog.Root bind:open={incomingDialogOpen} onOpenChange={handleIncomingOpenChange}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Remplacer ton panier par cette série ?</Dialog.Title>
			<Dialog.Description>
				{#if incomingSeries}
					Ce lien contient {incomingSeries.length} catégorie{incomingSeries.length > 1 ? 's' : ''}
					de questions. Tu peux aussi les ajouter à ton panier actuel.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="gap-2">
			<Button variant="ghost" onclick={() => resolveIncomingSeries('cancel')}>Annuler</Button>
			<Button variant="outline" onclick={() => resolveIncomingSeries('add')}>Ajouter</Button>
			<Button onclick={() => resolveIncomingSeries('replace')}>Remplacer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Test Mode Dialog -->
<TestModeDialog bind:open={testDialogOpen} onSelect={handleTestModeSelect} />

{#if isTeacher}
	<SaveSeriesDialog
		bind:open={saveSeriesDialogOpen}
		categories={cartItems}
		onSaved={handleSeriesSaved}
	/>
{/if}
