<script lang="ts">
	import type { TemplateVariable, TriggerType } from '$lib/types/messageTemplates';
	import { getVariablesForTrigger } from '$lib/templates/templateVariables';
	import { getAvailableFilters } from '$lib/templates/advancedEngine';
	import { createEventDispatcher } from 'svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Hash, Zap } from 'lucide-svelte';

	// Props
	interface Props {
		triggerType: TriggerType;
		open?: boolean;
	}

	let { triggerType, open = $bindable(false) }: Props = $props();

	// State
	let searchQuery = $state('');
	let activeTab = $state<'variables' | 'filters'>('variables');

	const dispatch = createEventDispatcher<{
		insert: { text: string; type: 'variable' | 'filter' };
	}>();

	// Get available variables and filters
	let availableVariables = $derived(getVariablesForTrigger(triggerType));
	let availableFilters = $derived(getAvailableFilters());

	// Filter items based on search
	let filteredVariables = $derived(() => {
		if (!searchQuery) return availableVariables;
		const query = searchQuery.toLowerCase();
		return availableVariables.filter(
			(v) =>
				v.name.toLowerCase().includes(query) ||
				v.label.toLowerCase().includes(query) ||
				v.description?.toLowerCase().includes(query)
		);
	});

	let filteredFilters = $derived(() => {
		if (!searchQuery) return availableFilters;
		const query = searchQuery.toLowerCase();
		return availableFilters.filter(
			(f) =>
				f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query)
		);
	});

	function insertVariable(variable: TemplateVariable) {
		dispatch('insert', {
			text: `{{${variable.name}}}`,
			type: 'variable'
		});
		open = false;
		searchQuery = '';
	}

	function insertFilter(filterName: string) {
		dispatch('insert', {
			text: ` | ${filterName}`,
			type: 'filter'
		});
		open = false;
		searchQuery = '';
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger asChild let:builder>
		<Button builders={[builder]} variant="outline" size="sm">
			<Hash class="mr-2 h-4 w-4" />
			Insérer variable/filtre
		</Button>
	</Popover.Trigger>

	<Popover.Content class="w-96 p-0" align="start">
		<!-- Search bar -->
		<div class="border-b border-border p-3">
			<Input
				type="text"
				placeholder="Rechercher..."
				bind:value={searchQuery}
				class="h-9"
			/>
		</div>

		<!-- Tabs -->
		<div class="flex border-b border-border">
			<button
				type="button"
				class="flex-1 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
				class:bg-muted={activeTab === 'variables'}
				class:text-primary={activeTab === 'variables'}
				onclick={() => (activeTab = 'variables')}
			>
				Variables
			</button>
			<button
				type="button"
				class="flex-1 px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
				class:bg-muted={activeTab === 'filters'}
				class:text-primary={activeTab === 'filters'}
				onclick={() => (activeTab = 'filters')}
			>
				Filtres
			</button>
		</div>

		<!-- Content -->
		<div class="max-h-80 overflow-y-auto p-2">
			{#if activeTab === 'variables'}
				<!-- Variables list -->
				{#if filteredVariables().length === 0}
					<div class="p-8 text-center text-sm text-muted-foreground">
						Aucune variable trouvée
					</div>
				{:else}
					<div class="space-y-1">
						{#each filteredVariables() as variable}
							<button
								type="button"
								class="w-full rounded-md p-3 text-left transition-colors hover:bg-muted"
								onclick={() => insertVariable(variable)}
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-2">
											<code class="text-sm font-mono text-primary">
												{{`{{${variable.name}}}`}}
											</code>
											{#if variable.required}
												<Badge variant="destructive" class="text-xs">Requis</Badge>
											{/if}
											{#if variable.userInput}
												<Badge variant="outline" class="text-xs">User Input</Badge>
											{/if}
										</div>
										<div class="mt-1 text-sm font-medium">{variable.label}</div>
										{#if variable.description}
											<div class="mt-0.5 text-xs text-muted-foreground">
												{variable.description}
											</div>
										{/if}
										<div class="mt-1 text-xs text-muted-foreground">
											Ex: {variable.example}
										</div>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			{:else}
				<!-- Filters list -->
				{#if filteredFilters().length === 0}
					<div class="p-8 text-center text-sm text-muted-foreground">
						Aucun filtre trouvé
					</div>
				{:else}
					<div class="space-y-1">
						{#each filteredFilters() as filter}
							<button
								type="button"
								class="w-full rounded-md p-3 text-left transition-colors hover:bg-muted"
								onclick={() => insertFilter(filter.name)}
							>
								<div class="flex items-start gap-2">
									<Zap class="mt-0.5 h-4 w-4 text-orange-500" />
									<div class="flex-1">
										<code class="text-sm font-mono text-primary">{filter.name}</code>
										<div class="mt-1 text-sm">{filter.description}</div>
										<div class="mt-1 text-xs text-muted-foreground font-mono">
											{filter.example}
										</div>
									</div>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		<!-- Footer tip -->
		<div class="border-t border-border bg-muted/50 p-3">
			<div class="text-xs text-muted-foreground">
				{#if activeTab === 'variables'}
					💡 Cliquez pour insérer une variable dans votre template
				{:else}
					💡 Les filtres modifient l'affichage des variables (ex: {{`{{name | uppercase}}`}})
				{/if}
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
