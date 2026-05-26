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
		/**
		 * Mark the avatar as purely decorative. Set to true when the surrounding
		 * element (e.g. a link or button) already provides an accessible name —
		 * this hides the image from screen readers to avoid double-announcement.
		 */
		decorative?: boolean;
		/**
		 * `<img loading>` attribute. Defaults to `'lazy'` so a page that mounts
		 * many UserAvatars at once (e.g. a class roster, a kanban assignee
		 * picker) doesn't trigger N parallel requests to Google's avatar CDN —
		 * Google rate-limits the URL with 429, which then permanently flags it
		 * as failed via `handleImgError`. With `lazy`, only avatars near the
		 * viewport fetch, spreading the request load.
		 *
		 * Set to `'eager'` for above-the-fold avatars that must be visible
		 * instantly (e.g. the user's own avatar in the header).
		 */
		loading?: 'lazy' | 'eager';
	}

	let {
		avatar_url = null,
		role = 'student',
		firstname = null,
		lastname = null,
		class: className = 'h-10 w-10',
		decorative = false,
		loading = 'lazy'
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
<div
	class={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
	aria-hidden={decorative ? 'true' : undefined}
>
	<span class="absolute inset-0 flex items-center justify-center bg-muted text-xs">
		{initials}
	</span>
	<!--
		`referrerpolicy="no-referrer"` is critical for Google's avatar CDN
		(lh3.googleusercontent.com): with a Referer header, Google often
		returns 429 or even 403 on cross-origin loads, especially in batches
		(class roster, kanban picker). Stripping the referrer makes the
		request look anonymous and Google serves the image normally.
	-->
	<img
		{src}
		{loading}
		referrerpolicy="no-referrer"
		alt={decorative ? '' : firstname ? `${firstname} ${lastname ?? ''}`.trim() : 'User'}
		class="relative z-10 aspect-square size-full object-cover"
		onerror={handleImgError}
	/>
</div>
