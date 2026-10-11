<script lang="ts">
	// La vue de présentation, contenu dans $lib/kingdom-tour/views
	import { MONTH_PALETTES } from '$lib/almanach/palettes';
	import AudienceView from '$lib/components/kingdom-tour/AudienceView.svelte';
	import { TEACHER_VIEW } from '$lib/kingdom-tour/views';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<AudienceView view={TEACHER_VIEW} ambiance={MONTH_PALETTES[data.ambianceMonth]} />
