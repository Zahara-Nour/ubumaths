<!--
	Filtres pour l'onglet Surveillance (V2.0 : seulement toggle "Inclure résolus").
-->
<script lang="ts">
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';

	interface Props {
		showResolved: boolean;
	}

	let { showResolved = $bindable() }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-3 rounded border border-border bg-muted/30 p-3">
	<MyCheckbox bind:checked={showResolved} label="Inclure les flags résolus" />
	<p class="text-xs text-muted-foreground">
		Décoché par défaut. Les flags résolus restent consultables pour historique.
	</p>
</div>
