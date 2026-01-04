<!--
	InternalLink Component
	======================

	Renders internal links ([[type:uuid|label]]) as clickable navigation links.

	Features:
	- Type-specific icons for visual distinction
	- Dynamic route generation based on reference type
	- Support for student and teacher contexts
	- Callback support for click handling (e.g., for SPAs)

	Route mapping:
	- chapter: /dashboard/{role}/cours/{uuid}
	- document: /dashboard/{role}/documents/{uuid}
	- exercise: /dashboard/{role}/exercices/{uuid}
	- assessment: /dashboard/{role}/evaluations/{uuid}

	@see InternalLinkNode in ast.ts for node structure
	@see ParagraphNode.svelte for rendering context
	@module components/markdown/nodes/InternalLink
-->
<script lang="ts">
	import type { InternalLinkReferenceType } from '$lib/ubumark';
	import { cn } from '$lib/utils';
	import { BookOpen, FileText, PencilRuler, ClipboardCheck } from 'lucide-svelte';

	interface Props {
		/** Type of the internal resource */
		referenceType: InternalLinkReferenceType;
		/** UUID of the referenced resource */
		uuid: string;
		/** Display label for the link */
		label: string;
		/** User role for route generation (default: student) */
		role?: 'student' | 'teacher';
		/** Callback when link is clicked (for SPA navigation) */
		onClick?: (referenceType: InternalLinkReferenceType, uuid: string) => void;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		referenceType,
		uuid,
		label,
		role = 'student',
		onClick,
		class: className = ''
	}: Props = $props();

	/**
	 * Get the route path for the given reference type and UUID
	 */
	function getRoute(): string {
		const basePath = `/dashboard/${role}`;
		switch (referenceType) {
			case 'chapter':
				return `${basePath}/cours/${uuid}`;
			case 'document':
				return `${basePath}/documents/${uuid}`;
			case 'exercise':
				return `${basePath}/exercices/${uuid}`;
			case 'assessment':
				return `${basePath}/evaluations/${uuid}`;
			default:
				return '#';
		}
	}

	/**
	 * Handle click - either use callback or navigate via href
	 */
	function handleClick(event: MouseEvent) {
		if (onClick) {
			event.preventDefault();
			onClick(referenceType, uuid);
		}
		// If no onClick, let the default <a> behavior handle navigation
	}

	/**
	 * Get French label for reference type (for accessibility)
	 */
	function getTypeLabel(): string {
		switch (referenceType) {
			case 'chapter':
				return 'Chapitre';
			case 'document':
				return 'Document';
			case 'exercise':
				return 'Exercice';
			case 'assessment':
				return 'Evaluation';
			default:
				return 'Ressource';
		}
	}
</script>

<a
	href={getRoute()}
	onclick={handleClick}
	class={cn(
		'internal-link inline-flex items-center gap-1 rounded-sm px-1 py-0.5',
		'text-primary underline decoration-primary/30 underline-offset-2',
		'hover:bg-primary/10 hover:decoration-primary/50',
		'transition-colors',
		className
	)}
	aria-label="{getTypeLabel()}: {label}"
>
	{#if referenceType === 'chapter'}
		<BookOpen class="h-3.5 w-3.5 flex-shrink-0" />
	{:else if referenceType === 'document'}
		<FileText class="h-3.5 w-3.5 flex-shrink-0" />
	{:else if referenceType === 'exercise'}
		<PencilRuler class="h-3.5 w-3.5 flex-shrink-0" />
	{:else if referenceType === 'assessment'}
		<ClipboardCheck class="h-3.5 w-3.5 flex-shrink-0" />
	{:else}
		<FileText class="h-3.5 w-3.5 flex-shrink-0" />
	{/if}
	<span>{label}</span>
</a>
