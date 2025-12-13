<script lang="ts">
	/**
	 * KeyboardShortcutsHelp Component
	 *
	 * Displays available keyboard shortcuts for the notebook
	 * Features:
	 * - Tooltip with all available shortcuts
	 * - Organized by category (Navigation, Execution, Editing, etc.)
	 * - Respects readonly mode
	 */

	import * as Tooltip from '$lib/components/ui/tooltip';
	import { HelpCircle } from 'lucide-svelte';

	// Props
	let { isReadonly = false }: { isReadonly?: boolean } = $props();

	// Determine keyboard modifier key based on platform
	const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
	const modKey = isMac ? 'Cmd' : 'Ctrl';
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				class="inline-flex items-center justify-center rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				title="Afficher l'aide sur les raccourcis clavier"
			>
				<HelpCircle class="size-4" />
			</button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content side="bottom" align="end" class="max-w-sm">
		<div class="space-y-3 text-sm">
			<!-- Navigation Shortcuts -->
			<div>
				<p class="font-semibold text-foreground">Navigation</p>
				<div class="mt-1 space-y-1 text-xs text-muted-foreground">
					<div class="flex justify-between gap-4">
						<span>Cellule précédente</span>
						<kbd class="rounded bg-muted px-1.5 py-0.5 font-mono">↑</kbd>
					</div>
					<div class="flex justify-between gap-4">
						<span>Cellule suivante</span>
						<kbd class="rounded bg-muted px-1.5 py-0.5 font-mono">↓</kbd>
					</div>
					<div class="flex justify-between gap-4">
						<span>Entrer en mode édition</span>
						<kbd class="rounded bg-muted px-1.5 py-0.5 font-mono">Entrée</kbd>
					</div>
					<div class="flex justify-between gap-4">
						<span>Quitter mode édition</span>
						<kbd class="rounded bg-muted px-1.5 py-0.5 font-mono">Échap</kbd>
					</div>
				</div>
			</div>

			{#if !isReadonly}
				<!-- Execution Shortcuts -->
				<div>
					<p class="font-semibold text-foreground">Exécution</p>
					<div class="mt-1 space-y-1 text-xs text-muted-foreground">
						<div class="flex justify-between gap-4">
							<span>Exécuter cellule</span>
							<kbd class="rounded bg-muted px-1.5 py-0.5 font-mono">{modKey} + Entrée</kbd>
						</div>
						<div class="flex justify-between gap-4">
							<span>Exécuter, aller au suivant</span>
							<kbd class="rounded bg-muted px-1.5 py-0.5 font-mono">Maj + Entrée</kbd>
						</div>
						<div class="flex justify-between gap-4">
							<span>Exécuter, insérer cellule</span>
							<kbd class="rounded bg-muted px-1.5 py-0.5 font-mono">Alt + Entrée</kbd>
						</div>
					</div>
				</div>
			{/if}

			<!-- Save Shortcut -->
			<div>
				<p class="font-semibold text-foreground">Autre</p>
				<div class="mt-1 space-y-1 text-xs text-muted-foreground">
					<div class="flex justify-between gap-4">
						<span>Enregistrer notebook</span>
						<kbd class="rounded bg-muted px-1.5 py-0.5 font-mono">{modKey} + S</kbd>
					</div>
				</div>
			</div>

			<!-- Readonly Mode Notice -->
			{#if isReadonly}
				<div class="border-t border-border pt-2">
					<p class="text-xs text-muted-foreground">
						Mode lecture seule : les raccourcis d'exécution sont désactivés.
					</p>
				</div>
			{/if}
		</div>
	</Tooltip.Content>
</Tooltip.Root>
