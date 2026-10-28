<!--
	BuildAnswer — case à construire dans le résultat attendu
	========================================================

	Verso de la carte flash, copie corrigée et bonne réponse affichée : le plan
	d'un bloc ```collection ou ```monnaie à construire (chantier
	`docs/wip/construire-progress.md`, Q8). Avec la réponse de l'élève : sa
	construction, verrouillée, sans réserve (juste : cadre vert ; faux : sa valeur
	et une construction juste à côté) ; sans réponse (R9), la construction juste
	seule. Lecture seule : jamais de réserve active. Droite à placer (```line,
	`placer:`) : la droite verrouillée avec les points de l'élève (`answers`, un par
	point, quand il y en a plusieurs), ou les points justes. Horloge à placer
	(```horloge, `placer:`) : le cadran verrouillé avec les aiguilles de l'élève,
	ou le cadran à l'heure juste. Diagramme en barres à construire (```barres,
	`placer:`) : le diagramme verrouillé avec les barres de l'élève (`answers`, une
	par barre), ou le diagramme juste.

	@module components/questions/BuildAnswer
-->
<script lang="ts">
	import Collection from '$lib/components/markdown/nodes/Collection.svelte';
	import CollectionConstruire from '$lib/components/markdown/nodes/CollectionConstruire.svelte';
	import Monnaie from '$lib/components/markdown/nodes/Monnaie.svelte';
	import MonnaieConstruire from '$lib/components/markdown/nodes/MonnaieConstruire.svelte';
	import NumberLine from '$lib/components/markdown/nodes/NumberLine.svelte';
	import NumberLinePlacer from '$lib/components/markdown/nodes/NumberLinePlacer.svelte';
	import Horloge from '$lib/components/markdown/nodes/Horloge.svelte';
	import HorlogePlacer from '$lib/components/markdown/nodes/HorlogePlacer.svelte';
	import { parseHorlogeContent } from '$lib/ubumark/parser/horloge-parser';
	import BarresPlacer from '$lib/components/markdown/nodes/BarresPlacer.svelte';
	import StatChart from '$lib/components/markdown/nodes/StatChart.svelte';
	import { parseStatChartContent } from '$lib/ubumark/parser/stat-chart-parser';
	import { HORLOGE_SIZE_CM } from '$lib/ubumark/types/horloge';
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
		/**
		 * Droite à plusieurs points, diagramme à plusieurs barres : la réponse et le
		 * statut de chaque point (barre), prime sur `answer`
		 */
		answers?: { answer: string; status: ExpectedStatus }[];
	}

	let { kind, source, answer, status, answers }: Props = $props();

	const accepted = (s: ExpectedStatus) => s === 'correct' || s === 'unoptimal';
	const lockedCase = (value: string, s: ExpectedStatus) => ({
		value,
		isCorrect: accepted(s),
		disabled: true,
		onChange: () => {}
	});

	let locked = $derived(answer === null ? undefined : lockedCase(answer, status));
	/** Cases de la droite (du diagramme), une par point (barre) ; undefined : la figure juste seule */
	let lineCases = $derived(
		answers ? answers.map((a) => lockedCase(a.answer, a.status)) : locked ? [locked] : undefined
	);
	let collection = $derived(kind === 'collection' ? parseCollectionContent(source) : null);
	let monnaie = $derived(kind === 'monnaie' ? parseMonnaieContent(source) : null);
	let line = $derived(kind === 'line' ? parseNumberLineContent(source).node : null);
	let horloge = $derived(kind === 'horloge' ? parseHorlogeContent(source) : null);
	let barres = $derived(kind === 'barres' ? parseStatChartContent('barres', source) : null);
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
	{#if lineCases}
		<NumberLinePlacer node={line} answers={lineCases} showControls={false} />
	{:else}
		<!-- La droite avec les points justes, sans `placer:` : dessinée seule -->
		<NumberLine
			node={{
				...line,
				placer: undefined,
				points: line.placer.map((t) => ({ label: t.name, value: t.value, color: 'vert' }))
			}}
			pointsOnLine
		/>
	{/if}
{:else if barres?.spec?.toPlace}
	{#if lineCases}
		<BarresPlacer node={barres} answers={lineCases} showControls={false} />
	{:else}
		<!-- Le diagramme juste, sans `placer:` : toutes les barres dessinées -->
		<StatChart node={{ ...barres, spec: { ...barres.spec, toPlace: null } }} />
	{/if}
{:else if horloge?.spec?.placer !== undefined}
	{@const spec = horloge.spec}
	{#if locked}
		<HorlogePlacer node={horloge} answer={locked} showControls={false} />
	{:else}
		<!-- Le cadran à l'heure juste, sans `placer:` : dessiné seul -->
		<Horloge
			node={{
				...horloge,
				spec: {
					...spec,
					placer: undefined,
					times: [spec.placer!],
					sizeCm: spec.sizeCm ?? HORLOGE_SIZE_CM.placer
				}
			}}
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
