<!--
	Hypothèses de l'énoncé (ADR 0012) dans un aperçu : « Hypothèses : x > 0 ; n ∈ ℕ ».
	Une hypothèse fausse élargit ce qui est compté juste : elle doit rester visible.
	Rien n'est affiché sans hypothèse.
-->

<script lang="ts">
	import type { AnswerAssumptions } from '$lib/math';
	import { formatAnswerAssumptions } from '$lib/questions/answer-assumptions';

	interface Props {
		assumptions: AnswerAssumptions | undefined;
	}

	let { assumptions }: Props = $props();

	let text = $derived(formatAnswerAssumptions(assumptions));
</script>

{#if text}
	<p class="text-sm" data-answer-assumptions>
		<span class="font-medium">Hypothèses :</span>
		{text}
	</p>
{/if}
