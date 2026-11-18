<!--
	TortueCorrige.svelte
	====================

	Corrigé d'une question « programme tortue » (bloc ```tortue), sans Blockly : le quadrillage
	et les programmes écrits en texte.

	- Avec la réponse de l'élève : son tracé (vert juste, rouge faux), l'attendu en pointillés,
	  son programme puis un programme juste.
	- Sans réponse : le tracé juste et le programme de référence.
	- `blocs:` dépassé : le message sous le programme de l'élève.
	- `niveau: 4e | 3e` : les programmes se lisent et s'exécutent au niveau (celui de la réponse
	  attendue, sinon celui du bloc).
	- Référence inconnue (énoncé masqué d'une évaluation notée, `attendu: ?`) : la figure du
	  bloc seule s'il la montre, jamais d'attendu inventé.

	@module components/markdown/nodes/TortueCorrige
-->
<script lang="ts">
	import TortueCanvas from '#lib/components/blockly/TortueCanvas.svelte';
	import { depassementDeBlocs, lireProgrammeTortue } from '#lib/shared/blockly/tortue/jugement.ts';
	import { readExpectedTortueAnswer } from '#lib/ubumark/utils/tortue-answer.ts';
	import { TORTUE_UNAVAILABLE, type TortueNode } from '#lib/ubumark/types/tortue.ts';

	interface Props {
		node: TortueNode;
		/** Programme de l'élève (notation texte) ; null : le corrigé seul */
		answer: string | null;
		/** Verdict de la réponse (sans réponse : ignoré) */
		correct?: boolean;
		/** Réponse attendue de la case (`position | <programme>`), prime sur `attendu:` du bloc */
		expected?: string;
	}

	let { node, answer, correct = false, expected }: Props = $props();

	let spec = $derived(node.spec);

	let attendue = $derived(expected !== undefined ? readExpectedTortueAnswer(expected) : null);
	let reference = $derived(attendue?.attendu ?? spec?.attendu ?? null);
	/** La limite de la réponse attendue, sinon celle du bloc (gardée dans un énoncé masqué) */
	let blocsMax = $derived(attendue ? attendue.blocsMax : (spec?.blocsMax ?? null));
	/** Le niveau de la réponse attendue, sinon celui du bloc (gardé dans un énoncé masqué) */
	let niveau = $derived(attendue?.niveau ?? spec?.niveau ?? 'base');
	let traceReference = $derived.by(() => {
		if (reference === null) return null;
		const lu = lireProgrammeTortue(reference, niveau);
		return lu.ok ? lu.segments : null;
	});
	let eleve = $derived(answer === null ? null : lireProgrammeTortue(answer, niveau));
	let tropDeBlocs = $derived(
		answer !== null && eleve?.ok ? depassementDeBlocs(answer, blocsMax, niveau) : null
	);
</script>

{#if spec === null}
	<div
		class="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground"
	>
		{TORTUE_UNAVAILABLE}
	</div>
{:else}
	<div class="tortue-corrige mx-auto flex max-w-80 flex-col gap-2">
		{#if eleve !== null}
			<TortueCanvas
				segments={eleve.ok ? eleve.segments : []}
				attendu={traceReference}
				modele={spec.montrer ? spec.modele : null}
				verdict={correct}
				label="Ton tracé{traceReference ? ', et le tracé attendu en pointillés' : ''}"
			/>
			{#if !eleve.ok}
				<p class="text-sm text-destructive">{eleve.message}</p>
			{/if}
			<p class="text-sm">
				<span class="text-muted-foreground">Ton programme :</span>
				<code class="tortue-code">{answer}</code>
			</p>
			{#if tropDeBlocs}
				<p class="text-sm text-destructive">{tropDeBlocs}</p>
			{/if}
		{:else}
			<TortueCanvas segments={traceReference ?? spec.modele ?? []} label="Le tracé attendu" />
		{/if}
		{#if reference !== null}
			<p class="text-sm">
				<span class="text-muted-foreground">Un programme juste :</span>
				<code class="tortue-code">{reference}</code>
			</p>
		{/if}
	</div>
{/if}

<style>
	.tortue-code {
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}
</style>
