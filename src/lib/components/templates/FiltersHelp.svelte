<script lang="ts">
	import { getAvailableFilters } from '$lib/templates/advancedEngine';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { HelpCircle, Zap } from 'lucide-svelte';

	// Props
	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	let availableFilters = getAvailableFilters();

	// Group filters by category
	const categories = {
		text: ['uppercase', 'lowercase', 'capitalize', 'truncate', 'escape', 'striptags'],
		numbers: ['number', 'currency', 'percent'],
		dates: ['date', 'time'],
		arrays: ['join', 'first', 'last'],
		utility: ['default', 'pluralize']
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="sm">
				<HelpCircle class="mr-2 h-4 w-4" />
				Aide sur les filtres
			</Button>
		{/snippet}
	</Dialog.Trigger>

	<Dialog.Content class="max-h-[80vh] max-w-3xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Filtres de Variables Disponibles</Dialog.Title>
			<Dialog.Description>
				Les filtres permettent de modifier l'affichage des variables dans vos templates
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6">
			<!-- Syntax explanation -->
			<div class="rounded-lg border border-border bg-muted/50 p-4">
				<h4 class="mb-2 font-semibold">Syntaxe</h4>
				<code class="block rounded bg-card p-2 font-mono text-sm">
					{'{'}{'{'}}variable | filter:argument{'}'}{'}'}
				</code>
				<p class="mt-2 text-sm text-muted-foreground">
					Vous pouvez chaîner plusieurs filtres :
					<code class="font-mono">{'{'}{'{'}}name | uppercase | truncate:20{'}'}{'}'} </code>
				</p>
			</div>

			<!-- Text filters -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 font-semibold">
					<Zap class="h-4 w-4 text-blue-500" />
					Filtres de Texte
				</h4>
				<div class="space-y-3">
					{#each categories.text as filterName}
						{@const filter = availableFilters.find((f) => f.name === filterName)}
						{#if filter}
							<div class="rounded-lg border border-border p-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<Badge variant="outline" class="mb-1 font-mono">{filter.name}</Badge>
										<p class="text-sm">{filter.description}</p>
										<code class="mt-2 block rounded bg-muted p-2 font-mono text-xs">
											{filter.example}
										</code>
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Number filters -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 font-semibold">
					<Zap class="h-4 w-4 text-green-500" />
					Filtres de Nombres
				</h4>
				<div class="space-y-3">
					{#each categories.numbers as filterName}
						{@const filter = availableFilters.find((f) => f.name === filterName)}
						{#if filter}
							<div class="rounded-lg border border-border p-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<Badge variant="outline" class="mb-1 font-mono">{filter.name}</Badge>
										<p class="text-sm">{filter.description}</p>
										<code class="mt-2 block rounded bg-muted p-2 font-mono text-xs">
											{filter.example}
										</code>
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Date filters -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 font-semibold">
					<Zap class="h-4 w-4 text-purple-500" />
					Filtres de Dates
				</h4>
				<div class="space-y-3">
					{#each categories.dates as filterName}
						{@const filter = availableFilters.find((f) => f.name === filterName)}
						{#if filter}
							<div class="rounded-lg border border-border p-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<Badge variant="outline" class="mb-1 font-mono">{filter.name}</Badge>
										<p class="text-sm">{filter.description}</p>
										<code class="mt-2 block rounded bg-muted p-2 font-mono text-xs">
											{filter.example}
										</code>
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Array filters -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 font-semibold">
					<Zap class="h-4 w-4 text-orange-500" />
					Filtres de Tableaux
				</h4>
				<div class="space-y-3">
					{#each categories.arrays as filterName}
						{@const filter = availableFilters.find((f) => f.name === filterName)}
						{#if filter}
							<div class="rounded-lg border border-border p-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<Badge variant="outline" class="mb-1 font-mono">{filter.name}</Badge>
										<p class="text-sm">{filter.description}</p>
										<code class="mt-2 block rounded bg-muted p-2 font-mono text-xs">
											{filter.example}
										</code>
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Utility filters -->
			<div>
				<h4 class="mb-3 flex items-center gap-2 font-semibold">
					<Zap class="h-4 w-4 text-gray-500" />
					Filtres Utilitaires
				</h4>
				<div class="space-y-3">
					{#each categories.utility as filterName}
						{@const filter = availableFilters.find((f) => f.name === filterName)}
						{#if filter}
							<div class="rounded-lg border border-border p-3">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<Badge variant="outline" class="mb-1 font-mono">{filter.name}</Badge>
										<p class="text-sm">{filter.description}</p>
										<code class="mt-2 block rounded bg-muted p-2 font-mono text-xs">
											{filter.example}
										</code>
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Conditionals info -->
			<div
				class="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20"
			>
				<h4 class="mb-2 font-semibold text-blue-900 dark:text-blue-100">💡 Blocs Conditionnels</h4>
				<p class="mb-2 text-sm text-blue-800 dark:text-blue-200">
					Affichez du contenu conditionnellement avec <code class="font-mono"
						>{'{'}{'{'}}#if{'}'}{'}'}...{'{'}{'{'}} /if{'}'}{'}'}
					</code>
				</p>
				<code class="block rounded bg-white p-3 font-mono text-xs dark:bg-gray-900">
					{'{'}{'{'}}#if due_date{'}'}{'}'}<br />
					&nbsp;&nbsp;Date limite: {'{'}{'{'}}due_date{'}'}{'}'} <br />
					{'{'}{'{'}}else{'}'}{'}'} <br />
					&nbsp;&nbsp;Pas de date limite<br />
					{'{'}{'{'}} /if{'}'}{'}'}
				</code>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
