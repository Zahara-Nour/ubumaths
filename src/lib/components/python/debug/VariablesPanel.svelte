<script lang="ts">
	/**
	 * Variables Panel Component
	 *
	 * Displays local and global variables with type badges and change indicators.
	 * Uses accordion for collapsible sections.
	 */

	// Imports
	import type { DebugVariable } from '$lib/shared/python/debug/types';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';

	// Types
	interface Props {
		/** Local variables from the current stack frame */
		locals: DebugVariable[];
		/** Global variables */
		globals: DebugVariable[];
		/** CSS class for the container */
		class?: string;
	}

	// Props
	let { locals, globals, class: className }: Props = $props();

	// State for accordion
	let openSections = $state<string[]>(['locals']);

	// Derived state - filter out builtins from globals for cleaner display
	let filteredGlobals = $derived(globals.filter((v) => !v.isBuiltin));

	/**
	 * Get background class for variable based on change status
	 */
	function getVariableClass(variable: DebugVariable): string {
		if (variable.isNew) {
			return 'bg-green-100 dark:bg-green-900/30';
		}
		if (variable.isChanged) {
			return 'bg-yellow-100 dark:bg-yellow-900/30';
		}
		return '';
	}

	/**
	 * Get badge variant based on Python type
	 */
	function getTypeBadgeClass(type: string): string {
		switch (type.toLowerCase()) {
			case 'int':
			case 'float':
			case 'complex':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
			case 'str':
				return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
			case 'bool':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
			case 'list':
			case 'tuple':
			case 'set':
			case 'frozenset':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
			case 'dict':
				return 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200';
			case 'none':
			case 'nonetype':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
			default:
				return 'bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-200';
		}
	}

	/**
	 * Format value for display (truncate if too long)
	 */
	function formatValue(value: string): string {
		const maxLength = 50;
		if (value.length > maxLength) {
			return value.slice(0, maxLength) + '...';
		}
		return value;
	}
</script>

<div class={cn('flex flex-col gap-2', className)}>
	<Accordion.Root type="multiple" bind:value={openSections}>
		<!-- Local Variables Section -->
		<Accordion.Item value="locals">
			<Accordion.Trigger class="text-sm font-medium">
				Variables locales
				{#if locals.length > 0}
					<Badge variant="secondary" class="ml-2">{locals.length}</Badge>
				{/if}
			</Accordion.Trigger>
			<Accordion.Content aria-label="Liste des variables locales">
				{#if locals.length === 0}
					<p class="py-2 text-sm text-muted-foreground italic">Aucune variable</p>
				{:else}
					<div class="flex flex-col gap-1">
						{#each locals as variable (variable.name)}
							<div
								class={cn(
									'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
									getVariableClass(variable)
								)}
							>
								<span class="min-w-[80px] font-mono font-medium text-foreground">
									{variable.name}
								</span>
								<span class={cn('rounded px-1.5 py-0.5 text-xs font-medium', getTypeBadgeClass(variable.type))}>
									{variable.type}
								</span>
								<span class="flex-1 truncate font-mono text-muted-foreground" title={variable.value}>
									{formatValue(variable.value)}
								</span>
								{#if variable.isNew}
									<span class="text-xs text-green-600 dark:text-green-400" aria-label="Nouvelle variable">
										nouveau
									</span>
								{:else if variable.isChanged}
									<span class="text-xs text-yellow-600 dark:text-yellow-400" aria-label="Variable modifiée">
										modifié
									</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</Accordion.Content>
		</Accordion.Item>

		<!-- Global Variables Section -->
		<Accordion.Item value="globals">
			<Accordion.Trigger class="text-sm font-medium">
				Variables globales
				{#if filteredGlobals.length > 0}
					<Badge variant="secondary" class="ml-2">{filteredGlobals.length}</Badge>
				{/if}
			</Accordion.Trigger>
			<Accordion.Content aria-label="Liste des variables globales">
				{#if filteredGlobals.length === 0}
					<p class="py-2 text-sm text-muted-foreground italic">Aucune variable</p>
				{:else}
					<div class="flex flex-col gap-1">
						{#each filteredGlobals as variable (variable.name)}
							<div
								class={cn(
									'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
									getVariableClass(variable)
								)}
							>
								<span class="min-w-[80px] font-mono font-medium text-foreground">
									{variable.name}
								</span>
								<span class={cn('rounded px-1.5 py-0.5 text-xs font-medium', getTypeBadgeClass(variable.type))}>
									{variable.type}
								</span>
								<span class="flex-1 truncate font-mono text-muted-foreground" title={variable.value}>
									{formatValue(variable.value)}
								</span>
								{#if variable.isNew}
									<span class="text-xs text-green-600 dark:text-green-400" aria-label="Nouvelle variable">
										nouveau
									</span>
								{:else if variable.isChanged}
									<span class="text-xs text-yellow-600 dark:text-yellow-400" aria-label="Variable modifiée">
										modifié
									</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
</div>
