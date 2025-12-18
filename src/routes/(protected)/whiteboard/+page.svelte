<script lang="ts">
	/**
	 * Whiteboard Page
	 *
	 * Interactive educational whiteboard for teachers and students.
	 * Features:
	 * - Pen, highlighter, and eraser tools
	 * - Geometric shapes (lines, rectangles, circles, arrows)
	 * - Educational instruments (ruler, protractor, set square)
	 * - Rich text blocks with LaTeX support
	 * - Multi-page documents with thumbnails
	 * - Import images and PDFs
	 * - Export to PNG, SVG, PDF
	 * - Save/load .ubw documents
	 *
	 * Access: Students, Teachers, Admins only
	 */

	import { Whiteboard } from '$lib/whiteboard';
</script>

<svelte:head>
	<title>Whiteboard - Tableau interactif | UbuMaths</title>
	<meta
		name="description"
		content="Tableau blanc interactif pour écrire des cours de mathématiques avec des instruments de géométrie"
	/>
</svelte:head>

<div class="h-full">
	<Whiteboard />
</div>
