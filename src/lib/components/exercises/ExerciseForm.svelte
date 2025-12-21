<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import ExerciseResourceEditor from './ExerciseResourceEditor.svelte';
	import VariationEditor from './VariationEditor.svelte';
	import LaTeXImportDialog from './LaTeXImportDialog.svelte';
	import GenericFunctionInput from './GenericFunctionInput.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { Database } from '$lib/types/database';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { TranspileWarning } from '$lib/ubumark/importers/latex';
	import type { GradeCode } from '$lib/types/grades';
	import type {
		ExerciseResource,
		ExerciseVariation,
		SharedExerciseDefaults
	} from '$lib/exercises/types';
	import type { Variable } from '$lib/ubumark';

	type Exercise = Database['public']['Tables']['exercises']['Row'];
	type ExerciseInsert = Database['public']['Tables']['exercises']['Insert'];

	interface Props {
		exercise?: Exercise;
		onsubmit: (data: Partial<ExerciseInsert>) => void | Promise<void>;
		submitting?: boolean;
		supabase?: SupabaseClient;
		userId?: string;
		/** Initial variation label to select (from URL) */
		initialVariation?: string;
		/** Callback when variation tab changes */
		onvariationchange?: (label: string) => void;
	}

	let {
		exercise = undefined,
		onsubmit,
		submitting = false,
		supabase,
		userId,
		initialVariation,
		onvariationchange
	}: Props = $props();

	// Form state
	let title = $state(exercise?.title || '');
	let slug = $state(exercise?.slug || '');
	let source = $state(exercise?.source || '');
	let difficulty = $state<1 | 2 | 3>((exercise?.difficulty as 1 | 2 | 3) || 2);
	let tags = $state<string[]>(exercise?.tags || []);
	let topic = $state(exercise?.topic || '');
	let gradeLevels = $state<GradeCode[]>((exercise?.grade_levels as GradeCode[]) || []);
	let resources = $state<ExerciseResource[]>(
		(exercise?.resources as unknown as ExerciseResource[]) || []
	);

	// generic_functions may exist after migration but not in generated types yet
	let genericFunctions = $state<string[]>(
		((exercise as Record<string, unknown>)?.generic_functions as string[]) || []
	);

	// Variations (always used - legacy exercises are auto-converted)
	let variations = $state<ExerciseVariation[]>(
		((exercise as Record<string, unknown>)?.variations as ExerciseVariation[] | undefined) ?? [
			{
				label: 'guided',
				statement_md: exercise?.statement_md || '',
				solution_md: exercise?.solution_md || '',
				hints: []
			}
		]
	);

	// Shared defaults for variations
	let shared = $state<SharedExerciseDefaults | undefined>(
		(exercise as Record<string, unknown>)?.shared as SharedExerciseDefaults | undefined
	);

	// Active variation tab - find index from initialVariation label or default to first
	function getInitialTabIndex(): string {
		if (initialVariation) {
			const index = variations.findIndex((v) => v.label === initialVariation);
			if (index !== -1) return String(index);
		}
		return '0';
	}
	let activeVariationTab = $state(getInitialTabIndex());

	// Notify parent when variation tab changes
	$effect(() => {
		const index = parseInt(activeVariationTab);
		if (index >= 0 && index < variations.length) {
			onvariationchange?.(variations[index].label);
		}
	});

	// Collapsible section states
	let sharedVariablesOpen = $state(false);
	let resourcesOpen = $state(false);
	let genericFunctionsOpen = $state(false);
	let newSharedVarName = $state('');
	let newSharedVarExpression = $state('');

	// Image counter for slug-based naming
	// Count existing images in all variations to initialize counter
	function countExistingImages(): number {
		let count = 0;
		const imageRegex = /!\[.*?\]\(.*?\)/g;
		for (const v of variations) {
			count += (v.statement_md.match(imageRegex) || []).length;
			count += (v.solution_md.match(imageRegex) || []).length;
		}
		return count;
	}
	let imageCounter = $state(countExistingImages() + 1);

	/**
	 * Get the next image number for this exercise and increment the counter
	 */
	function getNextImageNumber(): number {
		return imageCounter++;
	}

	// Slug generation state
	let isGeneratingSlug = $state(false);

	/**
	 * Ensure slug exists - generates one via API if needed
	 * Called before image upload to ensure proper naming
	 */
	async function ensureSlugExists(): Promise<string | undefined> {
		// Already have a slug
		if (slug) return slug;

		// Already generating
		if (isGeneratingSlug) return undefined;

		isGeneratingSlug = true;
		try {
			const response = await fetch('/api/exercises/generate-slug', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ topic: topic || undefined })
			});

			if (!response.ok) {
				console.error('Failed to generate slug:', await response.text());
				return undefined;
			}

			const data = await response.json();
			slug = data.slug;
			return slug;
		} catch (err) {
			console.error('Error generating slug:', err);
			return undefined;
		} finally {
			isGeneratingSlug = false;
		}
	}

	// Debug: track genericFunctions changes
	$effect(() => {
		console.log('[ExerciseForm] genericFunctions changed:', $state.snapshot(genericFunctions));
	});

	// LaTeX import state
	let latexImportOpen = $state(false);

	// Validation
	let errors = $state<Record<string, string>>({});

	/**
	 * Get display label for a variation
	 */
	function getVariationDisplayLabel(variation: ExerciseVariation): string {
		switch (variation.label) {
			case 'guided':
				return 'Guidée';
			case 'intermediate':
				return 'Intermédiaire';
			case 'autonomous':
				return 'Autonome';
			case 'custom':
				return 'Personnalisée';
			default:
				return variation.label;
		}
	}

	/**
	 * Add a new variation
	 */
	function addVariation() {
		if (variations.length >= 10) {
			toaster.warning('Maximum 10 variations autorisees');
			return;
		}

		const newVariation: ExerciseVariation = {
			label: 'intermediate',
			statement_md: '',
			solution_md: '',
			hints: []
		};

		variations = [...variations, newVariation];
		activeVariationTab = String(variations.length - 1);
		toaster.success('Variation ajoutee');
	}

	/**
	 * Remove a variation
	 */
	function removeVariation(index: number) {
		if (variations.length <= 1) {
			toaster.warning('Au moins une variation est requise');
			return;
		}

		variations = variations.filter((_, i) => i !== index);

		// Adjust active tab if needed
		const currentIndex = parseInt(activeVariationTab);
		if (currentIndex >= variations.length) {
			activeVariationTab = String(variations.length - 1);
		} else if (currentIndex > index) {
			activeVariationTab = String(currentIndex - 1);
		}
	}

	/**
	 * Duplicate a variation
	 */
	function duplicateVariation(index: number) {
		if (variations.length >= 10) {
			toaster.warning('Maximum 10 variations autorisees');
			return;
		}

		const source = variations[index];
		const duplicate: ExerciseVariation = {
			label: source.label,
			statement_md: source.statement_md,
			solution_md: source.solution_md,
			variables: source.variables ? [...source.variables.map((v) => ({ ...v }))] : undefined,
			hints: source.hints ? [...source.hints.map((h) => ({ ...h }))] : undefined
		};

		// Insert the duplicate after the source
		const newVariations = [...variations];
		newVariations.splice(index + 1, 0, duplicate);
		variations = newVariations;

		// Switch to the new duplicate
		activeVariationTab = String(index + 1);
		toaster.success('Variation dupliquee');
	}

	/**
	 * Add shared variable
	 */
	function addSharedVariable() {
		if (!newSharedVarName.trim() || !newSharedVarExpression.trim()) return;

		const newVar: Variable = {
			name: newSharedVarName.trim(),
			expression: newSharedVarExpression.trim()
		};

		if (!shared) {
			shared = { variables: [newVar] };
		} else {
			shared.variables = [...(shared.variables ?? []), newVar];
		}

		// Reset form
		newSharedVarName = '';
		newSharedVarExpression = '';
	}

	/**
	 * Remove shared variable
	 */
	function removeSharedVariable(index: number) {
		if (!shared?.variables) return;
		shared.variables = shared.variables.filter((_, i) => i !== index);
		if (shared.variables.length === 0) {
			shared.variables = undefined;
		}
	}

	/**
	 * Validate form
	 */
	function validate(): boolean {
		errors = {};

		// Validate each variation
		for (let i = 0; i < variations.length; i++) {
			const v = variations[i];
			if (!v.statement_md.trim()) {
				errors[`variation_${i}_statement`] = `L'enonce de la variation ${i + 1} est requis`;
			}
			if (!v.solution_md.trim()) {
				errors[`variation_${i}_solution`] = `La solution de la variation ${i + 1} est requise`;
			}
		}

		if (![1, 2, 3].includes(difficulty)) {
			errors.difficulty = 'La difficulte doit etre 1, 2 ou 3';
		}

		// Validate slug format if provided
		if (slug.trim()) {
			const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
			if (slug.length < 3) {
				errors.slug = 'Le slug doit contenir au moins 3 caracteres';
			} else if (slug.length > 100) {
				errors.slug = 'Le slug ne peut pas depasser 100 caracteres';
			} else if (!slugRegex.test(slug)) {
				errors.slug = 'Format invalide (minuscules, chiffres et tirets uniquement)';
			}
		}

		return Object.keys(errors).length === 0;
	}

	/**
	 * Handle form submission
	 */
	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();

		if (!validate()) {
			// If there are variation errors, show toast and switch to first problematic tab
			const variationErrorKeys = Object.keys(errors).filter((k) => k.startsWith('variation_'));
			if (variationErrorKeys.length > 0) {
				const firstErrorKey = variationErrorKeys[0];
				const match = firstErrorKey.match(/variation_(\d+)/);
				if (match) {
					activeVariationTab = match[1];
				}
				toaster.error('Veuillez corriger les erreurs dans les variations');
			}
			return;
		}

		// Prepare data based on mode
		const data: Partial<ExerciseInsert> & {
			generic_functions?: string[] | null;
			variations?: ExerciseVariation[] | null;
			shared?: SharedExerciseDefaults | null;
		} = {
			title: title.trim() || null,
			slug: slug.trim() || null,
			source: source.trim() || null,
			difficulty,
			tags,
			topic: topic.trim() || null,
			grade_levels: gradeLevels,
			resources: (resources.length > 0 ? resources : null) as ExerciseInsert['resources'],
			generic_functions: genericFunctions.length > 0 ? genericFunctions : null
		};

		// Always use variations
		data.variations = variations;
		data.shared =
			shared && (shared.variables?.length || shared.statement_md || shared.solution_md)
				? shared
				: undefined;
		// Use first variation's content for backwards compatibility
		data.statement_md = variations[0]?.statement_md || '';
		data.solution_md = variations[0]?.solution_md || '';

		await onsubmit(data);
	}

	/**
	 * Handle LaTeX import
	 */
	function handleLatexImport(result: {
		statement: string;
		solution: string | null;
		warnings: TranspileWarning[];
	}) {
		const currentIndex = parseInt(activeVariationTab);
		const currentVariation = variations[currentIndex];

		const hasExistingStatement = currentVariation?.statement_md.trim().length > 0;
		const hasExistingSolution = currentVariation?.solution_md.trim().length > 0;

		if (hasExistingStatement || hasExistingSolution) {
			const confirmMsg = 'Le contenu existant de cette variation sera remplace. Continuer ?';
			if (!confirm(confirmMsg)) {
				return;
			}
		}

		// Update current variation
		variations[currentIndex] = {
			...currentVariation,
			statement_md: result.statement,
			solution_md: result.solution ?? currentVariation.solution_md
		};

		// Close dialog
		latexImportOpen = false;

		// Show success toast with warning count if any
		if (result.warnings.length > 0) {
			const errorCount = result.warnings.filter((w) => w.severity === 'error').length;
			const warningCount = result.warnings.filter((w) => w.severity === 'warning').length;

			if (errorCount > 0) {
				toaster.warning(
					`Contenu importe avec ${errorCount} erreur${errorCount > 1 ? 's' : ''} et ${warningCount} avertissement${warningCount > 1 ? 's' : ''}. Verifiez le contenu.`
				);
			} else if (warningCount > 0) {
				toaster.info(
					`Contenu importe avec ${warningCount} avertissement${warningCount > 1 ? 's' : ''}. Verifiez le contenu.`
				);
			}
		} else {
			toaster.success('Contenu LaTeX importe avec succes');
		}
	}
</script>

<!-- Header with LaTeX import button (only for new exercises) -->
<div class="mb-6 flex items-center justify-between">
	{#if !exercise}
		<Button variant="outline" onclick={() => (latexImportOpen = true)}>
			<svg
				class="mr-2 h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			Import LaTeX
		</Button>
	{/if}
</div>

<form onsubmit={handleSubmit} class="space-y-6">
	<!-- Metadata -->
	<Card.Root>
		<Card.Content class="space-y-4">
			<!-- Title & Source -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="title">Titre</Label>
					<Input
						id="title"
						type="text"
						placeholder="Ex: Equations du premier degre"
						bind:value={title}
					/>
				</div>
				<div class="space-y-2">
					<Label for="source">Source</Label>
					<Input
						id="source"
						type="text"
						placeholder="Ex: Livre de 3eme, p. 42"
						bind:value={source}
					/>
				</div>
			</div>

			<!-- Difficulty, Slug & Topic -->
			<div class="grid gap-4 md:grid-cols-3">
				<div class="space-y-2">
					<Label for="difficulty">
						Difficulte <span class="text-destructive">*</span>
					</Label>
					<MySelect
						type="single"
						bind:value={difficulty}
						items={[
							{ value: 1, label: '1 - Facile' },
							{ value: 2, label: '2 - Moyen' },
							{ value: 3, label: '3 - Difficile' }
						]}
						placeholder="Selectionnez..."
					/>
					{#if errors.difficulty}
						<p class="text-sm text-destructive">{errors.difficulty}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="slug">Slug</Label>
					<Input
						id="slug"
						type="text"
						placeholder="Ex: algebre-equations-k8m2n4"
						bind:value={slug}
						disabled={!!slug}
						class="font-mono text-sm {slug ? 'bg-muted' : ''}"
					/>
					{#if errors.slug}
						<p class="text-sm text-destructive">{errors.slug}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="topic">Theme</Label>
					<Input id="topic" type="text" placeholder="Ex: Algebre" bind:value={topic} />
				</div>
			</div>

			<!-- Tags & Grade Levels -->
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label>Tags</Label>
					<TagBadgeSelector bind:value={tags} placeholder="Ajouter des tags" maxSelections={20} />
				</div>

				<div class="space-y-2">
					<Label>Niveaux</Label>
					<GradeBadgeSelector bind:value={gradeLevels} placeholder="Ajouter des niveaux" />
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Variations Editor -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Variations</Card.Title>
		</Card.Header>
		<Card.Content>
			<Tabs.Root bind:value={activeVariationTab}>
				<div class="mb-4 flex items-center gap-2">
					<Tabs.List class="flex-wrap">
						{#each variations as variation, index (index)}
							<Tabs.Trigger value={String(index)} class="relative pr-8">
								{getVariationDisplayLabel(variation)}
								{#if variations.length > 1}
									<span
										role="button"
										tabindex="0"
										onclick={(e) => {
											e.stopPropagation();
											removeVariation(index);
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												e.stopPropagation();
												removeVariation(index);
											}
										}}
										class="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
										title="Supprimer cette variation"
									>
										<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</span>
								{/if}
							</Tabs.Trigger>
						{/each}
					</Tabs.List>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => duplicateVariation(parseInt(activeVariationTab))}
						disabled={variations.length >= 10}
						title="Dupliquer la variation active"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={addVariation}
						disabled={variations.length >= 10}
						title="Ajouter une variation vide"
					>
						+
					</Button>
				</div>

				{#each variations as _, index (index)}
					<Tabs.Content value={String(index)}>
						{#if errors[`variation_${index}_statement`] || errors[`variation_${index}_solution`]}
							<div class="mb-4 rounded-md border border-destructive bg-destructive/10 p-3">
								{#if errors[`variation_${index}_statement`]}
									<p class="text-sm text-destructive">{errors[`variation_${index}_statement`]}</p>
								{/if}
								{#if errors[`variation_${index}_solution`]}
									<p class="text-sm text-destructive">{errors[`variation_${index}_solution`]}</p>
								{/if}
							</div>
						{/if}
						<VariationEditor
							bind:variation={variations[index]}
							{supabase}
							{userId}
							{genericFunctions}
							imageSlug={slug || undefined}
							{getNextImageNumber}
							{ensureSlugExists}
						/>
					</Tabs.Content>
				{/each}
			</Tabs.Root>
		</Card.Content>
	</Card.Root>

	<!-- Shared Variables (collapsible) -->
	<Collapsible.Root bind:open={sharedVariablesOpen}>
		<Card.Root>
			<Collapsible.Trigger asChild>
				{#snippet child({ props })}
					<Card.Header class="cursor-pointer" {...props}>
						<div class="flex items-center justify-between">
							<div>
								<Card.Title>
									Variables partagees
									{#if shared?.variables && shared.variables.length > 0}
										<span class="ml-2 text-sm font-normal text-muted-foreground">
											({shared.variables.length})
										</span>
									{/if}
								</Card.Title>
								<Card.Description>Variables communes a toutes les variations</Card.Description>
							</div>
							<span
								class="text-muted-foreground transition-transform"
								class:rotate-180={sharedVariablesOpen}
							>
								&#9660;
							</span>
						</div>
					</Card.Header>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Card.Content class="space-y-4">
					<!-- Existing shared variables -->
					{#if shared?.variables && shared.variables.length > 0}
						<div class="space-y-2">
							{#each shared.variables as variable, index (index)}
								<div class="flex items-center gap-2 rounded-md border bg-muted/50 p-2 text-sm">
									<code class="rounded bg-background px-2 py-1 font-mono text-xs">
										{variable.name}
									</code>
									<span class="text-muted-foreground">=</span>
									<code class="flex-1 truncate font-mono text-xs">
										{variable.expression}
									</code>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={() => removeSharedVariable(index)}
										class="h-8 w-8 p-0 text-destructive hover:text-destructive"
									>
										x
									</Button>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Add shared variable form -->
					<div class="flex gap-2">
						<Input
							type="text"
							placeholder="nom"
							bind:value={newSharedVarName}
							class="h-9 w-24 font-mono text-xs"
						/>
						<span class="flex items-center text-muted-foreground">=</span>
						<Input
							type="text"
							placeholder={'expression (ex: {{1..10}})'}
							bind:value={newSharedVarExpression}
							class="h-9 flex-1 font-mono text-xs"
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={addSharedVariable}
							disabled={!newSharedVarName.trim() || !newSharedVarExpression.trim()}
						>
							+
						</Button>
					</div>

					<p class="text-xs text-muted-foreground">
						Ces variables sont resolues avant celles des variations. Les variations peuvent les
						surcharger.
					</p>
				</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>

	<!-- Resources (collapsible) -->
	<Collapsible.Root bind:open={resourcesOpen}>
		<Card.Root>
			<Collapsible.Trigger asChild>
				{#snippet child({ props })}
					<Card.Header class="cursor-pointer" {...props}>
						<div class="flex items-center justify-between">
							<div>
								<Card.Title>
									Ressources complementaires
									{#if resources.length > 0}
										<span class="ml-2 text-sm font-normal text-muted-foreground">
											({resources.length})
										</span>
									{/if}
								</Card.Title>
								<Card.Description>
									Ajoutez des liens vers des videos, documents PDF, fichiers GeoGebra ou autres
									ressources utiles.
								</Card.Description>
							</div>
							<span
								class="text-muted-foreground transition-transform"
								class:rotate-180={resourcesOpen}
							>
								&#9660;
							</span>
						</div>
					</Card.Header>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Card.Content>
					<ExerciseResourceEditor bind:resources />
				</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>

	<!-- Advanced: Generic Functions (collapsible) -->
	<Collapsible.Root bind:open={genericFunctionsOpen}>
		<Card.Root>
			<Collapsible.Trigger asChild>
				{#snippet child({ props })}
					<Card.Header class="cursor-pointer" {...props}>
						<div class="flex items-center justify-between">
							<div>
								<Card.Title>
									Fonctions generiques
									{#if genericFunctions.length > 0}
										<span class="ml-2 text-sm font-normal text-muted-foreground">
											({genericFunctions.length})
										</span>
									{/if}
								</Card.Title>
								<Card.Description>
									Definissez quels identifiants doivent etre reconnus comme des fonctions dans les
									expressions mathematiques. Utile pour les derivees (<code class="text-xs"
										>P'(x)</code
									>) et fonctions personnalisees.
								</Card.Description>
							</div>
							<span
								class="text-muted-foreground transition-transform"
								class:rotate-180={genericFunctionsOpen}
							>
								&#9660;
							</span>
						</div>
					</Card.Header>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Card.Content>
					<GenericFunctionInput bind:value={genericFunctions} />
				</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>

	<!-- Actions -->
	<div class="flex justify-end gap-4">
		<Button type="button" variant="outline" href="/dashboard/teacher/exercises">Annuler</Button>
		<Button type="submit" disabled={submitting}>
			{submitting ? 'Enregistrement...' : exercise ? 'Mettre a jour' : "Creer l'exercice"}
		</Button>
	</div>
</form>

<!-- LaTeX Import Dialog (only for new exercises) -->
{#if !exercise}
	<LaTeXImportDialog bind:open={latexImportOpen} onImport={handleLatexImport} />
{/if}
