<!--
	InternalLink Component
	======================

	Renders internal links ([[type:uuid|label]]) as navigation links.

	Addressing is delegated to `$lib/resources` — this component holds no route
	knowledge of its own. It used to build URLs with its own `switch`, which is
	how it ended up pointing at four routes that did not exist: nothing tied its
	copy of the paths to the real ones.

	A reference the current viewer has nowhere to go to (a document, which has no
	detail page; a chapter referenced outside its class) renders as inert text
	rather than a link to a 404.

	@see $lib/resources/registry for the route table
	@see InternalLinkNode in ast.ts for node structure
	@module components/markdown/nodes/InternalLink
-->
<script lang="ts">
	import { resolveResource, type ResourceKind, type ViewerRole } from '$lib/resources';
	import type { InternalLinkReferenceType } from '$lib/ubumark';
	import { cn } from '$lib/utils';

	interface Props {
		/** Type of the internal resource */
		referenceType: InternalLinkReferenceType;
		/** UUID of the referenced resource */
		uuid: string;
		/** Display label for the link */
		label: string;
		/** Viewer role, used to pick the right route (default: student) */
		role?: ViewerRole;
		/** Class the reference is read from — required to link a chapter as a teacher */
		classId?: string;
		/** Callback when the link is clicked (for SPA navigation) */
		onClick?: (referenceType: InternalLinkReferenceType, uuid: string) => void;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		referenceType,
		uuid,
		label,
		role = 'student',
		classId,
		onClick,
		class: className = ''
	}: Props = $props();

	const resolved = $derived(
		resolveResource(referenceType as ResourceKind, uuid, {
			role,
			label,
			context: { classId }
		})
	);
	const Icon = $derived(resolved.icon);

	/**
	 * Handle click - either use callback or let the anchor navigate
	 */
	function handleClick(event: MouseEvent) {
		if (onClick) {
			event.preventDefault();
			onClick(referenceType, uuid);
		}
	}
</script>

<!-- `resolved.url` already comes out of SvelteKit's `resolve()` (see the registry);
     wrapping it again would prefix `base` twice. -->
{#if resolved.url}
	<a
		href={resolved.url}
		onclick={handleClick}
		class={cn(
			'internal-link inline-flex items-center gap-1 rounded-sm px-1 py-0.5',
			'text-primary underline decoration-primary/30 underline-offset-2',
			'hover:bg-primary/10 hover:decoration-primary/50',
			'transition-colors',
			className
		)}
		aria-label="{resolved.kindLabel}: {resolved.label}"
	>
		<Icon class="h-3.5 w-3.5 flex-shrink-0" />
		<span>{resolved.label}</span>
	</a>
{:else}
	<span
		class={cn(
			'internal-link inline-flex items-center gap-1 rounded-sm px-1 py-0.5',
			'text-muted-foreground',
			className
		)}
		aria-label="{resolved.kindLabel}: {resolved.label}"
		title="{resolved.kindLabel} non consultable ici"
	>
		<Icon class="h-3.5 w-3.5 flex-shrink-0" />
		<span>{resolved.label}</span>
	</span>
{/if}
