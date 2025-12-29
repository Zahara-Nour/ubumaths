<script lang="ts">
	/**
	 * Admin Settings Page
	 *
	 * This page provides system settings and information for administrators.
	 * Currently displays:
	 * - Application version number
	 * - List numbering scheme configuration
	 *
	 * Future additions could include:
	 * - System configuration settings
	 * - Feature flags
	 * - Performance metrics
	 * - Database statistics
	 */

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import { getVersion, getRawVersion } from '$lib/utils/version';
	import { Settings, Info, ListOrdered, RotateCcw } from 'lucide-svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { listNumberingStore } from '$lib/stores/listNumbering.svelte';
	import { NUMBERING_SCHEMES, type SchemeId } from '$lib/types/list-numbering';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import BugReportsConfigCard from '$lib/components/bug-reports/BugReportsConfigCard.svelte';

	// Convert schemes to select items
	const schemeItems = Object.values(NUMBERING_SCHEMES).map((s) => ({
		value: s.id,
		label: s.name
	}));

	const modeItems = [{ value: 'auto', label: 'Auto (detection)' }, ...schemeItems];

	// Sample markdown for preview
	const nestedListPreview = `1. Question principale
   1. Sous-question a
      1. Niveau 3
      2. Niveau 3
   2. Sous-question b
2. Question suivante`;

	const flatListPreview = `1. Calculer
2. Simplifier
3. Factoriser`;

	// Handlers
	function handleSchemeChange(value: string | undefined) {
		if (value) {
			listNumberingStore.setScheme(value as 'auto' | SchemeId);
		}
	}

	function handleSchemeWithNestingChange(value: string | undefined) {
		if (value) {
			listNumberingStore.setSchemeWithNesting(value as SchemeId);
		}
	}

	function handleSchemeWithoutNestingChange(value: string | undefined) {
		if (value) {
			listNumberingStore.setSchemeWithoutNesting(value as SchemeId);
		}
	}

	function handleReset() {
		listNumberingStore.reset();
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
			<Settings class="h-8 w-8" />
			Settings
		</h1>
		<p class="mt-2 text-muted-foreground">System settings and application information</p>
	</div>

	<Separator />

	<!-- Application Information Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Info class="h-5 w-5" />
				Application Information
			</Card.Title>
			<Card.Description>Current version and system details</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<!-- Version Display -->
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-foreground">Version</p>
						<p class="text-xs text-muted-foreground">Current application version</p>
					</div>
					<Badge variant="outline" class="px-4 py-1 text-base">
						{getVersion()}
					</Badge>
				</div>

				<Separator />

				<!-- Raw Version (for debugging) -->
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-foreground">Raw Version</p>
						<p class="text-xs text-muted-foreground">Semantic version number</p>
					</div>
					<code class="rounded bg-muted px-2 py-1 text-xs">
						{getRawVersion()}
					</code>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- List Numbering Configuration Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<ListOrdered class="h-5 w-5" />
				Numerotation des listes
			</Card.Title>
			<Card.Description>
				Configurer le style de numerotation pour les listes ordonnees dans les exercices
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-6">
				<!-- Mode Selector -->
				<div class="space-y-2">
					<span class="text-sm font-medium text-foreground">Mode</span>
					<MySelect
						type="single"
						items={modeItems}
						value={listNumberingStore.config.scheme}
						onValueChange={handleSchemeChange}
					/>
					<p class="text-xs text-muted-foreground">
						En mode Auto, le schema est choisi selon la structure de l'exercice.
					</p>
				</div>

				<!-- Auto Mode Sub-options -->
				{#if listNumberingStore.config.scheme === 'auto'}
					<div class="space-y-4 rounded-lg border bg-muted/30 p-4">
						<h4 class="text-sm font-medium text-foreground">Options du mode Auto</h4>

						<div class="space-y-2">
							<span class="text-sm text-muted-foreground"
								>Avec imbrication (questions + sous-questions)</span
							>
							<MySelect
								type="single"
								items={schemeItems}
								value={listNumberingStore.config.schemeWithNesting}
								onValueChange={handleSchemeWithNestingChange}
							/>
						</div>

						<div class="space-y-2">
							<span class="text-sm text-muted-foreground">Sans imbrication (questions simples)</span
							>
							<MySelect
								type="single"
								items={schemeItems}
								value={listNumberingStore.config.schemeWithoutNesting}
								onValueChange={handleSchemeWithoutNestingChange}
							/>
						</div>
					</div>
				{/if}

				<!-- Preview Section -->
				<div class="space-y-2">
					<h4 class="text-sm font-medium text-foreground">Apercu (liste imbriquee)</h4>
					<div class="rounded-lg border bg-card p-4">
						<MarkdownRenderer content={nestedListPreview} />
					</div>
				</div>

				<div class="space-y-2">
					<h4 class="text-sm font-medium text-foreground">Apercu (liste simple)</h4>
					<div class="rounded-lg border bg-card p-4">
						<MarkdownRenderer content={flatListPreview} />
					</div>
				</div>

				<!-- Reset Button -->
				<div class="flex justify-end">
					<Button variant="outline" size="sm" onclick={handleReset}>
						<RotateCcw class="mr-2 h-4 w-4" />
						Reinitialiser
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Bug Reports Configuration Card -->
	<BugReportsConfigCard />

	<!-- Version Update Instructions Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Version Management</Card.Title>
			<Card.Description>How to update the application version</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				<p class="text-sm text-muted-foreground">
					Use the following commands to bump the version before deployment:
				</p>

				<div class="space-y-2 text-sm">
					<div class="flex items-start gap-2">
						<code class="flex-shrink-0 rounded bg-muted px-2 py-1 text-xs">pnpm version patch</code>
						<span class="text-muted-foreground">Bug fixes (0.0.1 → 0.0.2)</span>
					</div>

					<div class="flex items-start gap-2">
						<code class="flex-shrink-0 rounded bg-muted px-2 py-1 text-xs">pnpm version minor</code>
						<span class="text-muted-foreground">New features (0.0.1 → 0.1.0)</span>
					</div>

					<div class="flex items-start gap-2">
						<code class="flex-shrink-0 rounded bg-muted px-2 py-1 text-xs">pnpm version major</code>
						<span class="text-muted-foreground">Breaking changes (0.0.1 → 1.0.0)</span>
					</div>
				</div>

				<p class="mt-4 text-xs text-muted-foreground">
					These commands automatically update package.json and create a git tag.
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>
