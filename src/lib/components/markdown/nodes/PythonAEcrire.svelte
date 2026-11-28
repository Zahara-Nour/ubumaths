<!--
	PythonAEcrire.svelte
	====================
	Bloc ```python-a-ecrire hors d'une question (cours, aperçu, item de liste) : le programme
	de départ en bloc de code, sans éditeur, ou la fonction à écrire. Jamais la solution.
	Bloc mal écrit : les erreurs d'auteur (prof), un cadre neutre (élève).

	@module components/markdown/nodes/PythonAEcrire
-->
<script lang="ts">
	import type { PythonAEcrireNode } from '#lib/ubumark/types/python-a-ecrire.ts';
	import { readAuthoringErrors } from '../authoring-errors';
	import CodeBlock from './CodeBlock.svelte';

	interface Props {
		node: PythonAEcrireNode;
		class?: string;
	}

	let { node, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let spec = $derived(node.spec);
</script>

{#if spec === null || node.errors.length > 0}
	{#if authoring()}
		<div class="rounded-md border border-destructive p-3 text-sm text-foreground {className}">
			<p class="font-medium text-destructive">Bloc python-a-ecrire : question non affichée</p>
			<ul class="mt-1 list-disc pl-5">
				{#each node.errors as issue, i (i)}
					<li>{issue.message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			Programme Python indisponible
		</div>
	{/if}
{:else if spec.depart.trim() !== ''}
	<CodeBlock code={spec.depart} language="python" class={className} />
{:else}
	<p class="my-3 text-sm text-muted-foreground {className}">
		Écris en Python la fonction <code>{spec.fonction}</code>.
	</p>
{/if}
