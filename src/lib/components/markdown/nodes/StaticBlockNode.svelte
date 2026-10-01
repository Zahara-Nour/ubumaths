<!--
	StaticBlockNode — bloc SANS trou, rendu tel quel
	================================================

	Les blocs qui ne portent jamais de saisie : liste, tableau, code, citation,
	séparateur, vidéo et figures (courbe, tableau de variations, arbre, cercle
	trigonométrique, droite graduée, figure, diagramme statistique).

	Utilisé par l'énoncé des questions à trous (`FillBlanksInput`), qui traite
	lui-même paragraphes, formules, images et titres (trous, mode flash,
	correction) : sans ce composant, ces blocs disparaissaient en silence de
	l'énoncé. Même rendu que `MarkdownRenderer`.

	@module components/markdown/nodes/StaticBlockNode
-->
<script lang="ts">
	import type { BlockNode } from '$lib/ubumark';
	import HorizontalRule from './HorizontalRule.svelte';
	import ListNode from './ListNode.svelte';
	import TableNode from './TableNode.svelte';
	import VideoDisplay from './VideoDisplay.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import Blockquote from './Blockquote.svelte';
	import VariationTable from './VariationTable.svelte';
	import ProbabilityTree from './ProbabilityTree.svelte';
	import TrigCircle from './TrigCircle.svelte';
	import NumberLine from './NumberLine.svelte';
	import Courbe from './Courbe.svelte';
	import StatChart from './StatChart.svelte';
	import FigureBlock from './FigureBlock.svelte';

	interface Props {
		node: BlockNode;
	}

	let { node }: Props = $props();
</script>

{#if node.type === 'horizontal-rule'}
	<HorizontalRule />
{:else if node.type === 'list'}
	<ListNode ordered={node.ordered} start={node.start} items={node.items} columns={node.columns} />
{:else if node.type === 'table'}
	<TableNode
		header={node.header}
		rows={node.rows}
		alignments={node.alignments}
		transpose={node.transpose}
		cross={node.cross}
	/>
{:else if node.type === 'video'}
	<VideoDisplay
		src={node.src}
		alt={node.alt}
		provider={node.provider}
		videoId={node.videoId}
		sizeClass={node.sizeClass}
		widthPercent={node.widthPercent}
		alignment={node.alignment}
		controls={node.controls}
		autoplay={node.autoplay}
		loop={node.loop}
		muted={node.muted}
	/>
{:else if node.type === 'code-block'}
	<CodeBlock code={node.code} language={node.language} />
{:else if node.type === 'blockquote'}
	<Blockquote children={node.children} />
{:else if node.type === 'variation-table'}
	<VariationTable {node} />
{:else if node.type === 'probability-tree'}
	<ProbabilityTree {node} />
{:else if node.type === 'trig-circle'}
	<TrigCircle {node} />
{:else if node.type === 'number-line'}
	<NumberLine {node} />
{:else if node.type === 'courbe'}
	<Courbe {node} />
{:else if node.type === 'figure'}
	<FigureBlock {node} />
{:else if node.type === 'stat-chart'}
	<StatChart {node} />
{/if}
