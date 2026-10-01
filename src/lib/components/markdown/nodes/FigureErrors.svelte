<!--
	FigureErrors — bloc ```figure non dessiné (Q48)
	===============================================

	Prof (`errorsVisible`) : messages situés (ligne du bloc) et pistes de
	correction. Élève : cadre neutre « Figure indisponible ».

	Composant LÉGER (aucun import de geometry-core) : il est aussi affiché par
	`FigureBlock` avant tout chargement à la demande.

	@module components/markdown/nodes/FigureErrors
-->
<script lang="ts">
	import type { FigureIssue } from '$lib/ubumark/types/figure';

	interface Props {
		errors: FigureIssue[];
		errorsVisible: boolean;
		class?: string;
	}

	let { errors, errorsVisible, class: className = '' }: Props = $props();
</script>

{#if errorsVisible}
	<div
		class="figure-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
	>
		<p class="font-medium text-destructive">Bloc figure : figure non dessinée</p>
		<ul class="mt-1 list-disc pl-5">
			{#each errors as e, i (i)}
				<li>
					{e.message}
					{#if e.hint}<span class="block text-muted-foreground">{e.hint}</span>{/if}
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<div
		class="figure-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
	>
		Figure indisponible
	</div>
{/if}
