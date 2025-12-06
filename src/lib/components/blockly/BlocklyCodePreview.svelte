<!--
  BlocklyCodePreview.svelte

  Code preview component showing generated JavaScript and Python code
  with syntax highlighting and tab navigation.
-->
<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import type { ExecutionLanguage } from '$lib/shared/blockly';

	// =============================================================================
	// Types
	// =============================================================================

	interface Props {
		/** Generated JavaScript code */
		jsCode: string;
		/** Generated Python code */
		pythonCode: string;
		/** Currently active language */
		activeLanguage: ExecutionLanguage;
	}

	// =============================================================================
	// Props
	// =============================================================================

	let { jsCode, pythonCode, activeLanguage }: Props = $props();

	// =============================================================================
	// Derived State
	// =============================================================================

	/** Tab value based on active language */
	let tabValue = $derived(activeLanguage);

	/** Display code based on active tab */
	let displayCode = $derived(tabValue === 'javascript' ? jsCode : pythonCode);

	/** Whether code is empty */
	let isEmpty = $derived(!displayCode || displayCode.trim().length === 0);
</script>

<div class="flex h-full flex-col border-l border-border bg-muted/20">
	<Tabs.Root value={tabValue} class="flex h-full flex-col">
		<!-- Tab navigation -->
		<Tabs.List class="w-full justify-start rounded-none border-b border-border bg-background px-2">
			<Tabs.Trigger value="javascript" class="gap-2">
				<span class="text-xs">JS</span>
				JavaScript
			</Tabs.Trigger>
			<Tabs.Trigger value="python" class="gap-2">
				<span class="text-xs">PY</span>
				Python
			</Tabs.Trigger>
		</Tabs.List>

		<!-- JavaScript code -->
		<Tabs.Content value="javascript" class="flex-1 overflow-auto p-0">
			{#if isEmpty}
				<div class="flex h-full items-center justify-center text-muted-foreground">
					<p class="text-sm">Aucun code généré</p>
				</div>
			{:else}
				<pre class="h-full overflow-auto p-4 font-mono text-sm"><code>{jsCode}</code></pre>
			{/if}
		</Tabs.Content>

		<!-- Python code -->
		<Tabs.Content value="python" class="flex-1 overflow-auto p-0">
			{#if isEmpty}
				<div class="flex h-full items-center justify-center text-muted-foreground">
					<p class="text-sm">Aucun code généré</p>
				</div>
			{:else}
				<pre class="h-full overflow-auto p-4 font-mono text-sm"><code>{pythonCode}</code></pre>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
