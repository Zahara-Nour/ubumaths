<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ShoppingCart, Trash2, ArrowLeft, FileDown, Rocket, Share2, ClipboardList } from 'lucide-svelte';
	import { questionCart } from '$lib/stores/questionCart.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import CartQuestionCard from '$lib/components/CartQuestionCard.svelte';
	import TestModeDialog from '$lib/components/test/TestModeDialog.svelte';
	import { generateInstance } from '$lib/questions/generator/instance-generator';
	import type { QuestionInstance } from '$lib/questions/types';
	import type { TestMode } from '$lib/types/test';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Check if user is a teacher
	let isTeacher = $derived(data.userRole === 'teacher');

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

			// Find all templates matching this category
			const matchingTemplates = templates.filter(
				(t) =>
					t.theme === item.category.theme &&
					t.domain === item.category.domain &&
					(t.subdomain || null) === item.category.subdomain &&
					t.level === item.category.level
			);

			// Randomly select one template from matching ones
			let template = undefined;
			let instance: QuestionInstance | undefined;

			if (matchingTemplates.length > 0) {
				// Select random template
				const randomIndex = Math.floor(Math.random() * matchingTemplates.length);
				template = matchingTemplates[randomIndex];

				// Generate an instance from the selected template
				try {
					const result = generateInstance(template);
					if (result.success && result.instance) {
						instance = result.instance;
					} else {
						const errors = 'errors' in result ? result.errors : ['Unknown error'];
						console.error(
							`Failed to generate instance for category ${item.category.theme}/${item.category.domain}:`,
							errors
						);
					}
				} catch (error) {
					console.error(
						`Exception generating instance for category ${item.category.theme}/${item.category.domain}:`,
						error
					);
				}
			}

			return {
				item,
				template,
				instance
			};
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
		goto('/automaths');
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
		goto(`/automaths/test?${params.toString()}`);
	}

	/**
	 * Placeholder actions (to be implemented)
	 */
	function handleExportPDF() {
		alert(
			'Export PDF - Fonctionnalité à venir !\n\nCette fonction générera un document PDF avec toutes les questions sélectionnées pour impression.'
		);
	}

	function handleShare() {
		alert(
			'Partage - Fonctionnalité à venir !\n\nCette fonction générera un lien de partage pour cette sélection de questions.'
		);
	}

	function handleCreateAssessment() {
		goto('/dashboard/teacher/assessments/new');
	}
</script>

<svelte:head>
	<title>Panier - Automaths | UbuMaths</title>
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
				{#each cartItemsWithInstances as { item, instance }, index (index)}
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
				<Card.Content class="grid gap-4 {isTeacher ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}">
					{#if isTeacher}
						<Button onclick={handleCreateAssessment} class="h-auto flex-col gap-2 py-6" variant="default">
							<ClipboardList class="h-6 w-6" />
							<div class="text-center">
								<div class="font-semibold">Créer une évaluation</div>
								<div class="text-xs font-normal opacity-80">Pour vos classes</div>
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

					<Button onclick={handleShare} class="h-auto flex-col gap-2 py-6" variant="outline">
						<Share2 class="h-6 w-6" />
						<div class="text-center">
							<div class="font-semibold">Partager</div>
							<div class="text-xs font-normal opacity-80">Générer un lien</div>
						</div>
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>

<!-- Test Mode Dialog -->
<TestModeDialog bind:open={testDialogOpen} onSelect={handleTestModeSelect} />
