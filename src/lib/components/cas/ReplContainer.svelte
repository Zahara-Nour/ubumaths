<script lang="ts">
	import { replStore } from '$lib/stores/repl.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import ReplOutput from './ReplOutput.svelte';
	import ReplInput from './ReplInput.svelte';
	import type { TabStyle } from '$lib/mathAST/cli/web';

	// Map tab IDs to TabStyle
	const tabMap: Record<string, TabStyle> = {
		terminal: 'terminal',
		modern: 'modern',
		hybrid: 'hybrid'
	};
</script>

<div class="rounded-lg border border-border bg-card shadow-lg">
	<Tabs.Root bind:value={replStore.activeTab}>
		<div class="border-b border-border p-4">
			<Tabs.List>
				<Tabs.Trigger value="terminal">Terminal</Tabs.Trigger>
				<Tabs.Trigger value="modern">Moderne</Tabs.Trigger>
				<Tabs.Trigger value="hybrid">Hybride</Tabs.Trigger>
			</Tabs.List>
		</div>

		{#each Object.entries(tabMap) as [id, variant] (id)}
			<Tabs.Content value={id} class="p-0">
				<div class="flex min-h-[500px] flex-col">
					<!-- Output area (scrollable) -->
					<div class="flex-1 overflow-y-auto">
						<ReplOutput {variant} />
					</div>

					<!-- Input area (fixed at bottom) -->
					<div class="border-t border-border bg-muted/30">
						<ReplInput variant={variant === 'terminal' ? 'terminal' : 'mathfield'} />
					</div>
				</div>
			</Tabs.Content>
		{/each}
	</Tabs.Root>
</div>
