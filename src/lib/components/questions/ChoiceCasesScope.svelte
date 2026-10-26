<!--
	ChoiceCasesScope — pose les cases « choix » corrigées pour le markdown enfant
	=============================================================================

	Le bloc ```choix d'un énoncé rempli (`ChoiceBlock`) y lit les statuts de SA
	case : les choix restent à leur place dans l'énoncé.

	@module components/questions/ChoiceCasesScope
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ExpectedChoiceCase } from '$lib/questions/expected-result';
	import { provideChoiceCaseResults } from '$lib/components/markdown/choice-case-results';

	interface Props {
		choiceCases: readonly ExpectedChoiceCase[];
		children: Snippet;
	}

	let { choiceCases, children }: Props = $props();

	provideChoiceCaseResults(() => choiceCases);
</script>

{@render children()}
