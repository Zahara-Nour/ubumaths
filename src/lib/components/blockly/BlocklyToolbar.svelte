<!--
  BlocklyToolbar.svelte

  Toolbar component for Blockly playground with controls for running code,
  clearing output/workspace, and switching between JavaScript and Python.
-->
<script lang="ts">
	import { Play, Trash2, RefreshCw, Loader2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { ExecutionLanguage } from '$lib/shared/blockly';

	// =============================================================================
	// Types
	// =============================================================================

	interface Props {
		/** Current execution language */
		language: ExecutionLanguage;
		/** Whether code is currently executing */
		isExecuting: boolean;
		/** Callback to run code */
		onrun: () => void;
		/** Callback to clear output */
		onclear: () => void;
		/** Callback to clear workspace */
		onclearworkspace: () => void;
		/** Callback when language changes */
		onlanguagechange: (lang: ExecutionLanguage) => void;
	}

	// =============================================================================
	// Props
	// =============================================================================

	let { language, isExecuting, onrun, onclear, onclearworkspace, onlanguagechange }: Props =
		$props();

	// =============================================================================
	// Event Handlers
	// =============================================================================

	function handleLanguageChange(newLanguage: ExecutionLanguage): void {
		if (language !== newLanguage) {
			onlanguagechange(newLanguage);
		}
	}
</script>

<div class="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-2">
	<!-- Left side: Run and Clear buttons -->
	<div class="flex items-center gap-2">
		<Button onclick={onrun} disabled={isExecuting} variant="default" size="sm" class="gap-2">
			{#if isExecuting}
				<Loader2 class="h-4 w-4 animate-spin" />
				Exécution...
			{:else}
				<Play class="h-4 w-4" />
				Exécuter
			{/if}
		</Button>

		<Button onclick={onclear} variant="outline" size="sm" class="gap-2">
			<Trash2 class="h-4 w-4" />
			Effacer sortie
		</Button>

		<Button onclick={onclearworkspace} variant="outline" size="sm" class="gap-2">
			<RefreshCw class="h-4 w-4" />
			Réinitialiser
		</Button>
	</div>

	<!-- Right side: Language selector -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium text-muted-foreground">Langage :</span>
		<div class="flex rounded-md border border-border">
			<button
				type="button"
				onclick={() => handleLanguageChange('javascript')}
				class="px-3 py-1 text-sm font-medium transition-colors {language === 'javascript'
					? 'bg-primary text-primary-foreground'
					: 'bg-background text-foreground hover:bg-muted'} rounded-l-md"
				disabled={isExecuting}
			>
				JavaScript
			</button>
			<button
				type="button"
				onclick={() => handleLanguageChange('python')}
				class="px-3 py-1 text-sm font-medium transition-colors {language === 'python'
					? 'bg-primary text-primary-foreground'
					: 'bg-background text-foreground hover:bg-muted'} rounded-r-md border-l border-border"
				disabled={isExecuting}
			>
				Python
			</button>
		</div>
	</div>
</div>
