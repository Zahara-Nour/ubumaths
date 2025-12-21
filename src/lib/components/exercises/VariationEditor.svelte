<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import MySelect from '$lib/components/MySelect.svelte';
	import ExerciseRichTextEditor from './ExerciseRichTextEditor.svelte';
	import HintEditor from './HintEditor.svelte';
	import type { ExerciseVariation, GuidanceLabel, ExerciseHint } from '$lib/exercises/types';
	import type { Variable } from '$lib/ubumark';
	import type { SupabaseClient } from '@supabase/supabase-js';

	interface Props {
		variation: ExerciseVariation;
		supabase?: SupabaseClient;
		userId?: string;
		genericFunctions?: string[];
		/** Exercise slug for image naming */
		imageSlug?: string;
		/** Function to get the next image number for this exercise */
		getNextImageNumber?: () => number;
		/** Function to ensure slug exists (generates via API if needed) */
		ensureSlugExists?: () => Promise<string | undefined>;
		onchange?: () => void;
	}

	let {
		variation = $bindable(),
		supabase,
		userId,
		genericFunctions,
		imageSlug,
		getNextImageNumber,
		ensureSlugExists,
		onchange
	}: Props = $props();

	// Ensure hints is always an array (required for bind: to work with HintEditor)
	if (variation.hints === undefined) {
		variation.hints = [];
	}

	// Label options
	const guidanceLabelItems: { value: GuidanceLabel | 'custom'; label: string }[] = [
		{ value: 'guided', label: 'Guidée' },
		{ value: 'intermediate', label: 'Intermédiaire' },
		{ value: 'autonomous', label: 'Autonome' },
		{ value: 'custom', label: 'Personnalisée' }
	];

	// Determine if label is custom
	const standardLabels: GuidanceLabel[] = ['guided', 'intermediate', 'autonomous'];
	let labelType = $state<GuidanceLabel | 'custom'>(
		standardLabels.includes(variation.label as GuidanceLabel)
			? (variation.label as GuidanceLabel)
			: 'custom'
	);
	let customLabel = $state(
		standardLabels.includes(variation.label as GuidanceLabel) ? '' : variation.label
	);

	// Collapsible section states
	let statementOpen = $state(true);
	let solutionOpen = $state(true);
	let variablesOpen = $state(false);
	let hintsOpen = $state(false);

	// Variables form state
	let newVarName = $state('');
	let newVarExpression = $state('');

	/**
	 * Update variation label when type or custom label changes
	 */
	function handleLabelTypeChange(newType: GuidanceLabel | 'custom') {
		labelType = newType;
		if (newType === 'custom') {
			variation.label = customLabel || 'custom';
		} else {
			variation.label = newType;
		}
		onchange?.();
	}

	/**
	 * Update variation label when custom input changes
	 */
	function handleCustomLabelChange() {
		if (labelType === 'custom') {
			variation.label = customLabel || 'custom';
			onchange?.();
		}
	}

	/**
	 * Add variable to variation
	 */
	function addVariable() {
		if (!newVarName.trim() || !newVarExpression.trim()) return;

		const newVar: Variable = {
			name: newVarName.trim(),
			expression: newVarExpression.trim()
		};

		variation.variables = [...(variation.variables ?? []), newVar];
		onchange?.();

		// Reset form
		newVarName = '';
		newVarExpression = '';
	}

	/**
	 * Remove variable from variation
	 */
	function removeVariable(index: number) {
		if (!variation.variables) return;
		variation.variables = variation.variables.filter((_, i) => i !== index);
		onchange?.();
	}

	/**
	 * Handle hints change
	 */
	function handleHintsChange() {
		onchange?.();
	}
</script>

<div class="space-y-6">
	<!-- Guidance Label -->
	<div class="space-y-3">
		<Label>Niveau de guidage</Label>
		<div class="flex gap-3">
			<div class="w-48">
				<MySelect
					type="single"
					value={labelType}
					onValueChange={handleLabelTypeChange}
					items={guidanceLabelItems}
					placeholder="Type"
				/>
			</div>
			{#if labelType === 'custom'}
				<Input
					type="text"
					placeholder="Nom personnalise"
					bind:value={customLabel}
					oninput={handleCustomLabelChange}
					class="flex-1"
				/>
			{/if}
		</div>
	</div>

	<!-- Statement (collapsible) -->
	<Collapsible.Root bind:open={statementOpen}>
		<Card.Root>
			<Collapsible.Trigger asChild>
				{#snippet child({ props })}
					<Card.Header class="cursor-pointer py-3" {...props}>
						<div class="flex items-center justify-between">
							<Card.Title class="text-base">
								Enonce <span class="text-destructive">*</span>
							</Card.Title>
							<span
								class="text-muted-foreground transition-transform"
								class:rotate-180={statementOpen}
							>
								▼
							</span>
						</div>
					</Card.Header>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Card.Content class="pt-0">
					<ExerciseRichTextEditor
						bind:value={variation.statement_md}
						{supabase}
						{userId}
						{genericFunctions}
						{imageSlug}
						{getNextImageNumber}
						{ensureSlugExists}
						{onchange}
					/>
				</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>

	<!-- Solution (collapsible) -->
	<Collapsible.Root bind:open={solutionOpen}>
		<Card.Root>
			<Collapsible.Trigger asChild>
				{#snippet child({ props })}
					<Card.Header class="cursor-pointer py-3" {...props}>
						<div class="flex items-center justify-between">
							<Card.Title class="text-base">
								Solution <span class="text-destructive">*</span>
							</Card.Title>
							<span
								class="text-muted-foreground transition-transform"
								class:rotate-180={solutionOpen}
							>
								▼
							</span>
						</div>
					</Card.Header>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Card.Content class="pt-0">
					<ExerciseRichTextEditor
						bind:value={variation.solution_md}
						{supabase}
						{userId}
						{genericFunctions}
						{imageSlug}
						{getNextImageNumber}
						{ensureSlugExists}
						{onchange}
					/>
				</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>

	<!-- Variables (collapsible) -->
	<Collapsible.Root bind:open={variablesOpen}>
		<Card.Root>
			<Collapsible.Trigger asChild>
				{#snippet child({ props })}
					<Card.Header class="cursor-pointer" {...props}>
						<div class="flex items-center justify-between">
							<div>
								<Card.Title class="text-base">
									Variables specifiques
									{#if variation.variables && variation.variables.length > 0}
										<span class="ml-2 text-sm font-normal text-muted-foreground">
											({variation.variables.length})
										</span>
									{/if}
								</Card.Title>
								<Card.Description>
									Variables propres a cette variation (remplacent les variables partagees)
								</Card.Description>
							</div>
							<span
								class="text-muted-foreground transition-transform"
								class:rotate-180={variablesOpen}
							>
								▼
							</span>
						</div>
					</Card.Header>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Card.Content class="space-y-4">
					<!-- Existing variables -->
					{#if variation.variables && variation.variables.length > 0}
						<div class="space-y-2">
							{#each variation.variables as variable, index (index)}
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
										onclick={() => removeVariable(index)}
										class="h-8 w-8 p-0 text-destructive hover:text-destructive"
									>
										×
									</Button>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Add variable form -->
					<div class="flex gap-2">
						<Input
							type="text"
							placeholder="nom"
							bind:value={newVarName}
							class="h-9 w-24 font-mono text-xs"
						/>
						<span class="flex items-center text-muted-foreground">=</span>
						<Input
							type="text"
							placeholder={'expression (ex: {{1..10}})'}
							bind:value={newVarExpression}
							class="h-9 flex-1 font-mono text-xs"
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={addVariable}
							disabled={!newVarName.trim() || !newVarExpression.trim()}
						>
							+
						</Button>
					</div>

					<p class="text-xs text-muted-foreground">
						Syntaxe: <code class="rounded bg-muted px-1">{'{{1..10}}'}</code> (aleatoire),
						<code class="rounded bg-muted px-1">{'{{eval:a+b}}'}</code> (calcul),
						<code class="rounded bg-muted px-1">{'{{var}}'}</code> (reference)
					</p>
				</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>

	<!-- Hints (collapsible) -->
	<Collapsible.Root bind:open={hintsOpen}>
		<Card.Root>
			<Collapsible.Trigger asChild>
				{#snippet child({ props })}
					<Card.Header class="cursor-pointer" {...props}>
						<div class="flex items-center justify-between">
							<div>
								<Card.Title class="text-base">
									Aides (hints)
									{#if variation.hints && variation.hints.length > 0}
										<span class="ml-2 text-sm font-normal text-muted-foreground">
											({variation.hints.length})
										</span>
									{/if}
								</Card.Title>
								<Card.Description>
									Ressources accessibles via <code class="rounded bg-muted px-1 text-xs"
										>{'{{hint:id}}'}</code
									>
								</Card.Description>
							</div>
							<span class="text-muted-foreground transition-transform" class:rotate-180={hintsOpen}>
								▼
							</span>
						</div>
					</Card.Header>
				{/snippet}
			</Collapsible.Trigger>
			<Collapsible.Content>
				<Card.Content>
					<HintEditor
						bind:hints={variation.hints as ExerciseHint[]}
						statementMd={variation.statement_md}
						solutionMd={variation.solution_md}
						onchange={handleHintsChange}
					/>
				</Card.Content>
			</Collapsible.Content>
		</Card.Root>
	</Collapsible.Root>
</div>
