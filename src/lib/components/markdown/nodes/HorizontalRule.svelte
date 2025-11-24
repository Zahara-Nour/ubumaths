<!--
	HorizontalRule Component
	========================

	Renders a styled horizontal rule (thematic break).
	Uses Tailwind CSS for consistent styling.

	@see ExerciseDisplay.svelte for usage context
-->
<script lang="ts">
	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
</script>

<hr class="my-6 border-t border-border {className}" />
