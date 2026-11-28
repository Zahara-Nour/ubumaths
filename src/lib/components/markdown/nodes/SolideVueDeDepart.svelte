<!--
	SolideVueDeDepart — la ligne sous une figure que l'on peut tourner
	==================================================================

	Hauteur réservée : « Figure à tourner » au repos, le bouton « Vue de départ »
	dès que la figure a tourné — le bouton qui apparaît ne déplace pas la suite de
	la page (chantier `solides-3d`). Sous `Solide.svelte` et sous chaque figure de
	`SolideGeste.svelte`.

	@module components/markdown/nodes/SolideVueDeDepart
-->
<script lang="ts">
	import { Rotate3d, RotateCcw } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';

	interface Props {
		/** La figure a quitté la vue de départ */
		moved: boolean;
		onreset: () => void;
	}

	let { moved, onreset }: Props = $props();
</script>

<div class="solide-commandes flex min-h-9 items-center justify-center">
	{#if moved}
		<Button variant="outline" size="sm" onclick={onreset}>
			<RotateCcw class="size-4" aria-hidden="true" />
			Vue de départ
		</Button>
	{:else}
		<span class="solide-consigne flex items-center gap-1 text-xs text-muted-foreground">
			<Rotate3d class="size-4 shrink-0" aria-hidden="true" />
			Figure à tourner
		</span>
	{/if}
</div>
