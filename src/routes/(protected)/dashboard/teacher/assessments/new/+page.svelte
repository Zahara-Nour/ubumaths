<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, Check } from 'lucide-svelte';
	import { questionCart } from '$lib/stores/questionCart.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import AssessmentConfigForm from '$lib/components/assessments/AssessmentConfigForm.svelte';
	import CartQuestionCard from '$lib/components/CartQuestionCard.svelte';
	import { generateInstance } from '$lib/questions/generator/instance-generator';
	import type { CreateAssessmentData } from '$lib/types/assessment';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Step state: 1 = review cart, 2 = configure, 3 = review & publish
	let step = $state(1);
	let formData = $state<Partial<CreateAssessmentData>>({});
	let isSubmitting = $state(false);

	// Cart state
	let cartItems = $derived(questionCart.allItems);
	let isEmpty = $derived(cartItems.length === 0);

	// Cart items with instances for preview
	let cartItemsWithInstances = $derived(
		cartItems.map((item) => {
			const matchingTemplates = data.templates.filter(
				(t) =>
					t.theme === item.category.theme &&
					t.domain === item.category.domain &&
					(t.subdomain || null) === item.category.subdomain &&
					t.level === item.category.level
			);

			let template = undefined;
			let instance = undefined;

			if (matchingTemplates.length > 0) {
				const randomIndex = Math.floor(Math.random() * matchingTemplates.length);
				template = matchingTemplates[randomIndex];

				try {
					const result = generateInstance(template);
					if (result.success && result.instance) {
						instance = result.instance;
					}
				} catch (error) {
					console.error('Failed to generate instance:', error);
				}
			}

			return { item, template, instance };
		})
	);

	function handleBackToList() {
		goto('/dashboard/teacher/assessments');
	}

	function handleNextStep() {
		if (step === 1) {
			if (isEmpty) {
				toaster.error('Ajoutez au moins une catégorie de questions');
				return;
			}
			step = 2;
		}
	}

	function handlePreviousStep() {
		if (step > 1) {
			step--;
		}
	}

	function handleConfigSubmit(data: any) {
		formData = {
			...data,
			categories: cartItems
		};
		step = 3;
	}

	async function handlePublish(status: 'draft' | 'published') {
		if (!formData.title || !formData.grade || !formData.settings) {
			toaster.error('Données incomplètes');
			return;
		}

		isSubmitting = true;

		try {
			const createData: CreateAssessmentData = {
				title: formData.title,
				grade: formData.grade,
				description: formData.description,
				categories: cartItems,
				settings: formData.settings,
				status
			};

			const response = await fetch('/api/assessments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(createData)
			});

			if (!response.ok) {
				throw new Error('Failed to create assessment');
			}

			const { assessment } = await response.json();

			// Clear cart
			questionCart.clearCart();

			toaster.success(
				status === 'published' ? 'Évaluation publiée !' : 'Brouillon sauvegardé'
			);

			goto('/dashboard/teacher/assessments');
		} catch (error) {
			console.error('Failed to create assessment:', error);
			toaster.error('Échec de la création');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Nouvelle Évaluation | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Header -->
	<div class="flex items-center gap-4 mb-8">
		<Button variant="ghost" size="icon" onclick={handleBackToList}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Nouvelle Évaluation</h1>
			<p class="text-muted-foreground mt-2">Créez une évaluation pour vos classes</p>
		</div>
	</div>

	<!-- Progress Indicator -->
	<div class="mb-8">
		<div class="flex items-center justify-between max-w-md mx-auto">
			{#each [1, 2, 3] as stepNum}
				<div class="flex flex-col items-center gap-2">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full border-2 {stepNum <=
						step
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-muted bg-background text-muted-foreground'}"
					>
						{#if stepNum < step}
							<Check class="h-5 w-5" />
						{:else}
							{stepNum}
						{/if}
					</div>
					<span class="text-xs text-muted-foreground">
						{stepNum === 1 ? 'Questions' : stepNum === 2 ? 'Configuration' : 'Révision'}
					</span>
				</div>
				{#if stepNum < 3}
					<div class="flex-1 h-0.5 {stepNum < step ? 'bg-primary' : 'bg-muted'}"></div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Step 1: Review Cart -->
	{#if step === 1}
		<div class="space-y-6">
			{#if isEmpty}
				<Card.Root class="border-dashed">
					<Card.Content class="flex min-h-96 items-center justify-center p-12">
						<div class="text-center">
							<p class="text-xl font-semibold">Panier vide</p>
							<p class="mt-2 text-muted-foreground">
								Allez dans Automaths pour ajouter des questions
							</p>
							<Button onclick={() => goto('/automaths')} class="mt-6">
								Parcourir les questions
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Header>
						<Card.Title>Questions sélectionnées</Card.Title>
						<Card.Description>
							{cartItems.length} catégorie{cartItems.length > 1 ? 's' : ''} ({questionCart.totalInstances}
							questions)
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{#each cartItemsWithInstances as { item, instance }}
								<CartQuestionCard
									{item}
									{instance}
									onIncrementQuantity={(cat) => questionCart.incrementQuantity(cat)}
									onDecrementQuantity={(cat) => questionCart.decrementQuantity(cat)}
									onUpdateDelay={(cat, delay) => questionCart.updateDelay(cat, delay)}
								/>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<div class="flex justify-between">
					<Button variant="outline" onclick={() => goto('/automaths')}>
						Ajouter des questions
					</Button>
					<Button onclick={handleNextStep}>
						Suivant
					</Button>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Step 2: Configuration -->
	{#if step === 2}
		<Card.Root>
			<Card.Header>
				<Card.Title>Configuration de l'évaluation</Card.Title>
				<Card.Description>
					Définissez les paramètres de votre évaluation
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<AssessmentConfigForm
					initialData={formData}
					onSubmit={handleConfigSubmit}
					onCancel={handlePreviousStep}
					submitLabel="Suivant"
				/>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Step 3: Review & Publish -->
	{#if step === 3}
		<div class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Révision</Card.Title>
					<Card.Description>Vérifiez les détails avant de publier</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<!-- Summary -->
					<div class="grid gap-4 md:grid-cols-2">
						<div>
							<h3 class="font-semibold mb-2">Informations</h3>
							<dl class="space-y-2 text-sm">
								<div>
									<dt class="text-muted-foreground">Titre</dt>
									<dd class="font-medium">{formData.title}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Niveau</dt>
									<dd class="font-medium">{formData.grade}</dd>
								</div>
								{#if formData.description}
									<div>
										<dt class="text-muted-foreground">Description</dt>
										<dd class="font-medium">{formData.description}</dd>
									</div>
								{/if}
							</dl>
						</div>

						<div>
							<h3 class="font-semibold mb-2">Paramètres</h3>
							<dl class="space-y-2 text-sm">
								<div>
									<dt class="text-muted-foreground">Tentatives max</dt>
									<dd class="font-medium">
										{formData.settings?.max_attempts || 'Illimité'}
									</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Temps limite</dt>
									<dd class="font-medium">
										{formData.settings?.time_limit
											? `${formData.settings.time_limit / 60} min`
											: 'Aucune'}
									</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Deadline</dt>
									<dd class="font-medium">
										{formData.settings?.deadline
											? new Date(formData.settings.deadline).toLocaleString('fr-FR')
											: 'Aucune'}
									</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Ordre aléatoire</dt>
									<dd class="font-medium">
										{formData.settings?.shuffle_questions ? 'Oui' : 'Non'}
									</dd>
								</div>
							</dl>
						</div>
					</div>

					<!-- Questions Summary -->
					<div>
						<h3 class="font-semibold mb-2">Questions</h3>
						<p class="text-sm text-muted-foreground">
							{cartItems.length} catégorie{cartItems.length > 1 ? 's' : ''} ({questionCart.totalInstances}
							questions au total)
						</p>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Actions -->
			<div class="flex justify-between">
				<Button variant="outline" onclick={handlePreviousStep} disabled={isSubmitting}>
					Retour
				</Button>
				<div class="flex gap-3">
					<Button
						variant="outline"
						onclick={() => handlePublish('draft')}
						disabled={isSubmitting}
					>
						Sauver comme brouillon
					</Button>
					<Button onclick={() => handlePublish('published')} disabled={isSubmitting}>
						Publier
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
