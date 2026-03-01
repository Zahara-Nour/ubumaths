<!--
	UserAvatar: displays a user avatar with a 3-level fallback cascade:
	1. Google OAuth avatar (avatar_url) — may be the user's photo or Google's default initial
	2. Static role-based image (student/teacher/admin) via getAvatarFallback()
	3. Two-letter initials (always visible behind the <img> as a last resort)

	The module-level SvelteSet persists failed URLs across component destroy/recreate cycles.
	This prevents infinite retry loops when the parent re-renders and recreates this component
	(e.g. Google returning 429 in dev — the URL is remembered as failed even after remount).
-->
<script lang="ts" module>
	import { SvelteSet } from 'svelte/reactivity';

	// Module-level: shared across all instances, survives component destruction.
	// SvelteSet (not plain Set) so that $derived reactively tracks .has() calls.
	const failedUrls = new SvelteSet<string>();
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { getAvatarFallback, getAvatarInitials, type UserRole } from '$lib/utils/avatar';

	interface Props {
		avatar_url?: string | null;
		role?: string | null;
		firstname?: string | null;
		lastname?: string | null;
		class?: string;
	}

	let {
		avatar_url = null,
		role = 'student',
		firstname = null,
		lastname = null,
		class: className = 'h-10 w-10'
	}: Props = $props();

	const fallbackSrc = $derived(getAvatarFallback((role as UserRole) || 'student'));
	const initials = $derived(getAvatarInitials(firstname, lastname));

	// If avatar_url failed before (in any instance), skip it and use fallback directly
	const src = $derived(avatar_url && !failedUrls.has(avatar_url) ? avatar_url : fallbackSrc);

	function handleImgError() {
		if (avatar_url) {
			failedUrls.add(avatar_url);
		}
	}
</script>

<!-- Initials sit behind the image as ultimate fallback (z-0 < z-10) -->
<div class={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}>
	<span class="absolute inset-0 flex items-center justify-center bg-muted text-xs">
		{initials}
	</span>
	<img
		{src}
		alt={firstname ? `${firstname} ${lastname ?? ''}`.trim() : 'User'}
		class="relative z-10 aspect-square size-full object-cover"
		onerror={handleImgError}
	/>
</div>
