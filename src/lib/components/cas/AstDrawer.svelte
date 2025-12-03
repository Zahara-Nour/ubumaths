<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { X } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { replStore } from '$lib/stores/repl.svelte';
	import AstTreeViewer from './AstTreeViewer.svelte';
	import type { MathNode } from '$lib/mathAST/types';

	interface Props {
		ast?: MathNode;
		expression?: string;
	}

	let { ast, expression }: Props = $props();

	// Bind to store's showAstDrawer
	let open = $derived(replStore.showAstDrawer);

	function handleOpenChange(value: boolean) {
		if (!value) {
			replStore.showAstDrawer = false;
			replStore.setHighlightedNode(null);
		}
	}
</script>

<DialogPrimitive.Root {open} onOpenChange={handleOpenChange}>
	<DialogPrimitive.Portal>
		<!-- Overlay -->
		<DialogPrimitive.Overlay
			class={cn(
				'fixed inset-0 z-50 bg-black/50',
				'data-[state=open]:animate-in data-[state=closed]:animate-out',
				'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
			)}
		/>

		<!-- Drawer Content (from right) -->
		<DialogPrimitive.Content
			class={cn(
				'fixed inset-y-0 right-0 z-50 h-full w-full sm:w-[400px] md:w-[500px]',
				'border-l border-border bg-background shadow-lg',
				'data-[state=open]:animate-in data-[state=closed]:animate-out',
				'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
				'duration-300'
			)}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border px-4 py-3">
				<div>
					<h2 class="text-lg font-semibold text-foreground">Arbre syntaxique (AST)</h2>
					{#if expression}
						<p class="mt-1 font-mono text-sm text-muted-foreground">{expression}</p>
					{/if}
				</div>
				<DialogPrimitive.Close asChild>
					<Button variant="ghost" size="icon" class="size-8" aria-label="Fermer">
						<X class="size-4" />
					</Button>
				</DialogPrimitive.Close>
			</div>

			<!-- Tree Content -->
			<div class="h-[calc(100%-60px)] overflow-y-auto p-4">
				{#if ast}
					<AstTreeViewer node={ast} depth={0} />
				{:else}
					<div class="flex h-full items-center justify-center">
						<p class="text-muted-foreground">Aucun AST disponible</p>
					</div>
				{/if}
			</div>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
