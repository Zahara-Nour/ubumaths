<!--
	TutorFAB Component
	==================

	Floating Action Button for accessing the Tutor panel on mobile.
	Shows a "?" icon with tooltip "Demander de l'aide au Pere Ubu".

	Props:
		- onclick: Callback when button is clicked

	@component
-->
<script lang="ts">
	import { HelpCircle } from 'lucide-svelte';

	interface Props {
		onclick: () => void;
	}

	let { onclick }: Props = $props();
</script>

<button
	type="button"
	{onclick}
	class="fixed right-4 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-colors hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none"
	title="Demander de l'aide au Pere Ubu"
	aria-label="Ouvrir le tuteur Pere Ubu"
>
	<HelpCircle class="h-6 w-6 text-primary-foreground" />
</button>
