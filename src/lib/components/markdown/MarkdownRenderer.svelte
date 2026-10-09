<!--
	MarkdownRenderer Component
	==========================

	Main orchestrator component for rendering markdown content.
	Takes markdown content, parses it to AST, and renders using
	specialized node components.

	Features:
	- Parses markdown to AST using parseMarkdown()
	- Supports multiple display modes: rendered, raw, both
	- Renders block nodes with appropriate components
	- Graceful error handling for parse failures
	- Callback support for blank detection
	- Configurable list numbering schemes (auto-detection or explicit)

	Note: This component does NOT perform variable instantiation.
	Content should already be resolved before rendering.

	@see markdown-parser.ts for AST generation
	@see nodes/ for individual node renderers
	@module components/markdown/MarkdownRenderer
-->
<script lang="ts">
	import { parseMarkdown } from '$lib/ubumark';
	import type { DocumentNode, ParseOptions, InputState } from '$lib/ubumark';
	import type { MarkdownDisplayMode } from './types';
	import { getCachedAST, setCachedAST } from '$lib/utils/markdown-cache';
	import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';
	import type { ExerciseHint } from '$lib/exercises/types';

	// List numbering
	import { listNumberingStore } from '$lib/stores/listNumbering.svelte';
	import { getMaxEnumerateDepth } from '$lib/ubumark/utils/list-depth';
	import type { SchemeId, ListNumberingConfig } from '$lib/types/list-numbering';

	// Import node components
	import ParagraphNode from './nodes/ParagraphNode.svelte';
	import HeadingNode from './nodes/HeadingNode.svelte';
	import MathBlock from './nodes/MathBlock.svelte';
	import HorizontalRule from './nodes/HorizontalRule.svelte';
	import ListNode from './nodes/ListNode.svelte';
	import TableNode from './nodes/TableNode.svelte';
	import ImageDisplay from './nodes/ImageDisplay.svelte';
	import VideoDisplay from './nodes/VideoDisplay.svelte';
	import CodeBlock from './nodes/CodeBlock.svelte';
	import Blockquote from './nodes/Blockquote.svelte';
	import VariationTable from './nodes/VariationTable.svelte';
	import ProbabilityTree from './nodes/ProbabilityTree.svelte';
	import TrigCircle from './nodes/TrigCircle.svelte';
	import NumberLine from './nodes/NumberLine.svelte';
	import Courbe from './nodes/Courbe.svelte';
	import StatChart from './nodes/StatChart.svelte';
	import FigureBlock from './nodes/FigureBlock.svelte';

	// Raw markdown viewer with syntax highlighting
	import MarkdownRaw from './MarkdownRaw.svelte';
	import { provideContentLocale } from './content-locale';
	import { provideAuthoringErrors } from './authoring-errors';
	import { createRenderBudget, provideRenderBudget } from './render-budget';
	import {
		provideRestrictedRendering,
		readRestrictedRendering,
		restrictDocument,
		stripFenceLanguages
	} from './restricted-rendering';
	import type { ContentLocale } from '$lib/types/locale';
	import type { GradeCode } from '$lib/types/grades';
	import { lexiconRuntime, loadLexiconRuntime } from '$lib/lexicon/runtime-store.svelte';
	import { provideLexicon, readLexicon } from './lexicon-context';

	interface Props {
		/** Markdown content to render (template or resolved instance) */
		content: string;
		/** Display mode: 'rendered' | 'raw' | 'both' */
		mode?: MarkdownDisplayMode;
		/** Options passed to the markdown parser */
		parseOptions?: ParseOptions;
		/** Additional CSS classes for the container */
		class?: string;
		/** Callback when a blank placeholder is found (for fill_in_blanks) */
		onBlankFound?: (index: number) => void;
		/** Unified input states for both text blanks and math prompts */
		inputs?: InputState[];
		/** Callback when any input value changes (text or math) */
		onInputChange?: (index: number, value: string) => void;
		/** Callback when user submits a text blank (Enter key) */
		onInputSubmit?: (index: number) => void;
		/** Whether inputs are disabled (e.g., after submission) */
		inputsDisabled?: boolean;
		/** Override list numbering config for this render (uses global store by default) */
		listNumberingOverride?: Partial<ListNumberingConfig>;
		/** Callback when a hashtag is clicked */
		onHashtagClick?: (tag: string) => void;
		/** Callback when a mention is clicked */
		onMentionClick?: (username: string) => void;
		/**
		 * Configuration for generic function names in math parsing.
		 * Controls which identifiers are recognized as function calls (e.g., f(x), P'(x))
		 * vs implicit multiplication.
		 *
		 * - undefined: Use parser defaults (f, g, h, u, v, w, F, G, H)
		 * - null: Disable generic function parsing
		 * - GenericFunctionConfig: Custom configuration
		 */
		genericFunctions?: GenericFunctionConfig | null;
		/** Available hints for {{hint:id}} references */
		hints?: ExerciseHint[];
		/** Callback when a hint is opened */
		onHintOpen?: (hintId: string) => void;
		/**
		 * Langue du contenu : `en` écrit les décimaux avec un point, `fr` avec une
		 * virgule. Absente : celle d'un rendu parent, sinon le français.
		 */
		locale?: ContentLocale;
		/**
		 * Contexte AUTEUR (éditeur, aperçu prof) : un bloc mal écrit affiche son
		 * message détaillé. Absent : celui d'un rendu parent, sinon contexte élève
		 * (cadre neutre « Figure indisponible »). Décision Q48 du 2026-10-01.
		 */
		showAuthoringErrors?: boolean;
		/**
		 * Rendu RESTREINT (chat élève, décision S1 du 2026-10-03) : ni bloc
		 * spécial (affiché en code), ni vidéo, images du seul stockage Supabase,
		 * formules sans commande de style/lien. Hérité par les rendus imbriqués ;
		 * un parent restreint l'impose. Absent : rendu complet.
		 */
		restricted?: boolean;
		/**
		 * Niveau de lecture des mots cliquables (lot 2 du lexique) : les mots du
		 * dictionnaire visibles à ce niveau ouvrent leur fiche. Absent : celui
		 * d'un rendu parent ou du cadre de la question ; `null` : aucun mot.
		 */
		lexiconGrade?: GradeCode | null;
	}

	let {
		content,
		mode = 'rendered',
		parseOptions = {},
		class: className = '',
		onBlankFound,
		inputs = [],
		onInputChange,
		onInputSubmit,
		inputsDisabled = false,
		listNumberingOverride,
		onHashtagClick,
		onMentionClick,
		genericFunctions,
		hints = [],
		onHintOpen,
		locale,
		showAuthoringErrors,
		restricted,
		lexiconGrade
	}: Props = $props();

	provideContentLocale(() => locale);
	provideAuthoringErrors(() => showAuthoringErrors);
	provideRestrictedRendering(() => restricted);
	const isRestricted = readRestrictedRendering();
	provideLexicon(() => lexiconGrade);
	const lexicon = readLexicon();

	// Le dictionnaire n'est chargé qu'au premier énoncé à mots cliquables
	$effect(() => {
		if (lexicon()) loadLexiconRuntime();
	});

	/**
	 * Source effectivement analysée : en mode restreint, les blocs de code
	 * perdent leur langue (```trig → bloc de code texte). Le contenu stocké
	 * n'est pas modifié.
	 */
	let source = $derived(isRestricted() && content ? stripFenceLanguages(content) : content);

	/**
	 * Parse the markdown content into an AST.
	 * Uses LRU cache to avoid re-parsing identical content.
	 * Returns null if parsing fails.
	 */
	let ast = $derived.by<DocumentNode | null>(() => {
		if (!source) {
			return { type: 'document', children: [] };
		}

		// Mode restreint : filet sur l'AST ; mots cliquables : repérés au niveau du
		// lecteur (copies, le cache n'est pas modifié)
		const finish = (doc: DocumentNode) => {
			const safe = isRestricted() ? restrictDocument(doc) : doc;
			const grade = lexicon();
			const runtime = lexiconRuntime();
			return grade && runtime ? runtime.linkDocument(safe, grade) : safe;
		};

		// Check cache first
		const cached = getCachedAST(source, parseOptions);
		if (cached) {
			return finish(cached);
		}

		// Parse and cache
		try {
			const parsed = parseMarkdown(source, parseOptions);
			setCachedAST(source, parsed, parseOptions);
			return finish(parsed);
		} catch (error) {
			console.error('Markdown parse error:', error);
			return null;
		}
	});

	/**
	 * Un rappel `> [!rappel]` au premier niveau : sur grand écran, il se place en
	 * marge, sur la ligne du bloc qui le précède (grille à deux colonnes, cf.
	 * styles). Seuls ces documents passent en grille : aucun effet ailleurs.
	 */
	let hasMarginNotes = $derived(
		ast?.children.some((node) => node.type === 'blockquote' && node.callout === 'reminder') ?? false
	);

	/**
	 * Budget des blocs ```figure / ```courbe, partagé par tout le document (rendus
	 * imbriqués compris) : un nouveau budget à chaque nouveau contenu.
	 */
	let renderBudget = $derived.by(() => {
		void ast;
		return createRenderBudget();
	});
	provideRenderBudget(() => renderBudget);

	// Track blanks found during render (for future use with onBlankFound)
	// This will be enhanced when blank handling is implemented
	$effect(() => {
		if (onBlankFound && ast) {
			// TODO: Implement blank detection during AST traversal
			// This will be part of the fill_in_blanks feature
		}
	});

	/**
	 * Compute the effective numbering scheme for lists.
	 * Uses auto-detection when scheme is 'auto', otherwise uses the specified scheme.
	 */
	const effectiveListScheme = $derived.by<SchemeId | null>(() => {
		// Get config (override takes precedence over store)
		const config = {
			...listNumberingStore.config,
			...listNumberingOverride
		};

		// If scheme is explicitly set (not auto), use it
		if (config.scheme !== 'auto') {
			return config.scheme as SchemeId;
		}

		// Auto-detect based on AST structure
		if (!ast) return null;

		const maxDepth = getMaxEnumerateDepth(ast);
		// If nested lists exist, use nesting scheme; otherwise use flat scheme
		return maxDepth > 1 ? config.schemeWithNesting : config.schemeWithoutNesting;
	});
</script>

{#if mode === 'rendered' || mode === 'both'}
	<div class="markdown-content {className}" class:has-margin-notes={hasMarginNotes}>
		{#if ast}
			<!-- Key includes genericFunctions to force re-render when it changes -->
			{#each ast.children as node, i (`${i}-${genericFunctions?.names?.length ?? 0}`)}
				{#if node.type === 'paragraph'}
					<ParagraphNode
						children={node.children}
						{inputs}
						{onInputChange}
						{onInputSubmit}
						{inputsDisabled}
						{onHashtagClick}
						{onMentionClick}
						{genericFunctions}
						{hints}
						{onHintOpen}
					/>
				{:else if node.type === 'heading'}
					<HeadingNode
						level={node.level}
						children={node.children}
						{onHashtagClick}
						{onMentionClick}
						{hints}
						{onHintOpen}
					/>
				{:else if node.type === 'math-block'}
					{#key node.expression}
						<MathBlock expression={node.expression} syntax={node.syntax} {genericFunctions} />
					{/key}
				{:else if node.type === 'horizontal-rule'}
					<HorizontalRule />
				{:else if node.type === 'list'}
					<ListNode
						ordered={node.ordered}
						start={node.start}
						items={node.items}
						columns={node.columns}
						effectiveScheme={effectiveListScheme}
						{onHashtagClick}
						{onMentionClick}
						{genericFunctions}
						{hints}
						{onHintOpen}
					/>
				{:else if node.type === 'table'}
					<TableNode
						header={node.header}
						rows={node.rows}
						alignments={node.alignments}
						transpose={node.transpose}
						cross={node.cross}
						{genericFunctions}
					/>
				{:else if node.type === 'image'}
					<ImageDisplay
						src={node.src}
						alt={node.alt}
						title={node.title}
						sizeClass={node.sizeClass}
						widthPercent={node.widthPercent}
						alignment={node.alignment}
						caption={node.caption}
						originalWidth={node.originalWidth}
						originalHeight={node.originalHeight}
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
					<Blockquote children={node.children} callout={node.callout} />
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
			{/each}
		{:else}
			<p class="text-muted-foreground">Erreur de parsing du markdown</p>
		{/if}
	</div>
{/if}

{#if mode === 'raw' || mode === 'both'}
	<MarkdownRaw {content} />
{/if}

<style>
	/* Prose-like styling for markdown content */
	.markdown-content {
		line-height: 1.6;
	}

	/* Spacing between block elements */
	.markdown-content > :global(*) {
		margin-bottom: 1rem;
	}

	.markdown-content > :global(*:last-child) {
		margin-bottom: 0;
	}

	/*
	 * Rappels en marge (ADR 0017, D8). Placement automatique de la grille : un
	 * rappel (colonne 2) reste sur la ligne du bloc qui le précède (colonne 1),
	 * le bloc suivant repart à la ligne.
	 *
	 * Seuil sur la largeur de la CORRECTION (container query : le conteneur pose
	 * `container-type: inline-size`, cf. CorrectionView), pas de l'écran : une
	 * flash-card reste étroite sur un grand écran. 40rem = rappel (14rem + 1rem)
	 * + au moins 25rem de texte. Sans conteneur, ou plus étroit : rappel dessous.
	 */
	@container (min-width: 40rem) {
		.markdown-content.has-margin-notes {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.markdown-content.has-margin-notes > :global(*) {
			grid-column: 1;
		}

		.markdown-content.has-margin-notes > :global(.callout-reminder) {
			grid-column: 2;
			align-self: start;
			width: 14rem;
			margin-top: 0;
			margin-left: 1rem;
		}
	}
</style>
