<!--
	BareGreekWarning
	================
	Avertissement NON bloquant de l'éditeur d'exercices : un nom grec écrit sans
	antislash dans une formule `~…~` (`~2pi~` se lit 2 × p × i). Propose l'écriture
	avec antislash (`\pi`), champ par champ. Rien n'est affiché si tout va bien.

	Props:
	- variation: la variation éditée (énoncé, solution, aides, traductions)
-->

<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { TriangleAlert } from '@lucide/svelte';
	import { bareGreekWarnings } from '$lib/exercises/bare-greek-warnings';
	import type { ExerciseVariation } from '$lib/exercises/types';

	interface Props {
		variation: ExerciseVariation;
	}

	let { variation }: Props = $props();

	let warnings = $derived(bareGreekWarnings(variation));
</script>

{#if warnings.length > 0}
	<Alert.Root
		class="mb-4 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
	>
		<TriangleAlert />
		<Alert.Title>Lettre grecque sans antislash</Alert.Title>
		<Alert.Description class="text-amber-900 dark:text-amber-100">
			<p>
				Dans une formule <code>~…~</code>, chaque lettre est une variable : <code>pi</code> se lit p
				× i. Pour une lettre grecque, écrivez-la avec un antislash.
			</p>
			<ul class="mt-1 list-disc pl-5">
				{#each warnings as { field, names } (field)}
					<li>
						<span class="font-medium">{field}</span> :
						{#each names as name, index (name)}
							{index > 0 ? ', ' : ''}<code>{name}</code> → <code>\{name}</code>
						{/each}
					</li>
				{/each}
			</ul>
		</Alert.Description>
	</Alert.Root>
{/if}
