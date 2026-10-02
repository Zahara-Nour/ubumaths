<!--
	Case « Question de cours » de l'éditeur de modèle (Q110 b)
	===========================================================

	Marqueur d'intention `options.courseQuestion`. Une carte de cours est toujours
	une question de cours : la case est alors cochée et désactivée.
-->
<script lang="ts">
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';

	interface Props {
		/** Valeur saisie (`options.courseQuestion`) */
		checked: boolean;
		/** Modèle de type carte de cours : question de cours forcée */
		isCourseCard: boolean;
	}

	let { checked = $bindable(false), isCourseCard }: Props = $props();

	// Carte de cours : affichée cochée sans toucher à la valeur saisie
	const displayed = $derived(isCourseCard || checked);

	function handleChange(value: boolean) {
		if (!isCourseCard) checked = value;
	}
</script>

<div class="space-y-1">
	<MyCheckbox
		checked={displayed}
		disabled={isCourseCard}
		onchange={handleChange}
		label="Question de cours"
	/>
	<p class="text-xs text-muted-foreground">
		{#if isCourseCard}
			Une carte de cours est toujours une question de cours.
		{:else}
			Vérifie une connaissance ou la compréhension : définition, propriété, méthode.
		{/if}
	</p>
</div>
