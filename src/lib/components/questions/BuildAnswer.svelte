<!--
	BuildAnswer — case à construire dans le résultat attendu
	========================================================

	Verso de la carte flash, copie corrigée et bonne réponse affichée : le plan
	d'un bloc ```collection ou ```monnaie à construire (chantier
	`docs/wip/construire-progress.md`, Q8). Avec la réponse de l'élève : sa
	construction, verrouillée, sans réserve (juste : cadre vert ; faux : sa valeur
	et une construction juste à côté) ; sans réponse (R9), la construction juste
	seule. Lecture seule : jamais de réserve active. Droite à placer (```line,
	`placer:`) : la droite verrouillée avec le point de l'élève, ou le point juste.

	@module components/questions/BuildAnswer
-->
<script lang="ts">
	import Collection from '$lib/components/markdown/nodes/Collection.svelte';
	import CollectionConstruire from '$lib/components/markdown/nodes/CollectionConstruire.svelte';
	import Monnaie from '$lib/components/markdown/nodes/Monnaie.svelte';
	import MonnaieConstruire from '$lib/components/markdown/nodes/MonnaieConstruire.svelte';
	import NumberLine from '$lib/components/markdown/nodes/NumberLine.svelte';
	import NumberLinePlacer from '$lib/components/markdown/nodes/NumberLinePlacer.svelte';
	import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
	import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
	import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
	import { solutionBuild as collectionSolution } from '$lib/ubumark/utils/collection-construire';
	import {
		EMPTY_BUILD as EMPTY_MONNAIE,
		solutionBuild as monnaieSolution
	} from '$lib/ubumark/utils/monnaie-construire';
	import type { ExpectedStatus } from '$lib/questions/expected-result';
	import type { BuildKind } from '$lib/questions/types';

	interface Props {
		kind: BuildKind;
		/** Texte du bloc (variables résolues), entre les clôtures, sans `case:` */
		source: string;
		/** Valeur posée par l'élève ; null : la construction juste seule */
		answer: string | null;
		status: ExpectedStatus;
	}

	let { kind, source, answer, status }: Props = $props();

	let isCorrect = $derived(status === 'correct' || status === 'unoptimal');
	let locked = $derived(
		answer === null ? undefined : { value: answer, isCorrect, disabled: true, onChange: () => {} }
	);
	let collection = $derived(kind === 'collection' ? parseCollectionContent(source) : null);
	let monnaie = $derived(kind === 'monnaie' ? parseMonnaieContent(source) : null);
	let line = $derived(kind === 'line' ? parseNumberLineContent(source).node : null);
</script>

{#if collection?.spec?.build !== undefined}
	{@const spec = collection.spec}
	{#if locked}
		<CollectionConstruire {spec} build={spec.build!} answer={locked} showReserve={false} />
	{:else}
		<Collection
			node={{
				...collection,
				spec: { ...spec, build: undefined, sets: [collectionSolution(spec.build!)] }
			}}
		/>
	{/if}
{:else if line?.placer !== undefined}
	{#if locked}
		<NumberLinePlacer node={line} answer={locked} showControls={false} />
	{:else}
		<!-- La droite avec le point juste, sans `placer:` : dessinée seule -->
		<NumberLine
			node={{ ...line, placer: undefined, points: [{ label: '', value: line.placer }] }}
		/>
	{/if}
{:else if monnaie?.spec?.build !== undefined && monnaie.spec.reserve !== undefined}
	{@const spec = monnaie.spec}
	{#if locked}
		<MonnaieConstruire
			{spec}
			build={spec.build!}
			reserve={spec.reserve!}
			answer={locked}
			showReserve={false}
		/>
	{:else}
		<Monnaie
			node={{
				...monnaie,
				spec: {
					...spec,
					build: undefined,
					reserve: undefined,
					sets: [monnaieSolution(spec.build!, spec.reserve!) ?? EMPTY_MONNAIE]
				}
			}}
		/>
	{/if}
{/if}
