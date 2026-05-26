<!--
	UserAvatar
	==========

	Displays a user avatar with a 3-level fallback cascade:
	1. Real avatar (`avatar_url`) — usually a Google OAuth photo
	   (`https://lh3.googleusercontent.com/...`), occasionally a Supabase
	   Storage URL for users who uploaded a custom image.
	2. Static role-based image via `getAvatarFallback(role)` (bundled asset,
	   always available offline).
	3. Two-letter initials in a muted disc, sitting BEHIND the <img> so they
	   show through during loading and remain the ultimate fallback.

	┌─────────────────────────────────────────────────────────────────────────┐
	│ KNOWN TRAP — do not remove these attrs without reading docs/ref/        │
	│ google-avatar-cdn.md                                                    │
	│                                                                         │
	│ The avatar <img> below carries two attributes that look optional but    │
	│ are load-bearing:                                                       │
	│                                                                         │
	│ - `referrerpolicy="no-referrer"` — Google's avatar CDN returns 429 /    │
	│   403 on cross-origin loads that send a Referer pointing at our         │
	│   origin. Strip the header and Google serves the image normally.        │
	│                                                                         │
	│ - `loading="lazy"` (the default of the `loading` prop) — a page that    │
	│   mounts many UserAvatars at once (class roster, kanban assignee        │
	│   picker, friends list) would otherwise fire N parallel requests to     │
	│   Google's CDN and trip rate-limiting, marking the URLs as failed in    │
	│   the module-level SvelteSet for the rest of the session.               │
	│                                                                         │
	│ Symptom if you remove either: "most avatars show the role default,      │
	│ only one or two real photos load". Especially visible in dev where      │
	│ HMR can pile up requests across reloads.                                │
	└─────────────────────────────────────────────────────────────────────────┘
-->
<script lang="ts" module>
	import { SvelteSet } from 'svelte/reactivity';

	/**
	 * Module-level cache of URLs that returned an error on a previous load.
	 *
	 * - Shared across every UserAvatar instance, so a 429 / 403 from Google
	 *   on one instance instantly skips the same URL on the others.
	 * - `SvelteSet` (not a plain `Set`) so that `$derived(... !failedUrls.has(url))`
	 *   reactively re-runs when the set changes; a plain Set wouldn't trigger
	 *   a re-render.
	 * - Lives until the module is re-evaluated, i.e. until a full page reload.
	 *   A short network hiccup permanently downgrades the avatar to the
	 *   fallback for the current session — accepted trade-off vs. infinite
	 *   retry storms.
	 */
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
		 * `<img loading>` attribute. Defaults to `'lazy'`.
		 *
		 * Why lazy by default: a page that mounts many UserAvatars at once
		 * (class roster, kanban assignee picker, friends list) would otherwise
		 * fire N parallel requests to Google's avatar CDN. Google's rate
		 * limiter returns 429 / 403 for the batch, the URLs get cached in
		 * the module-level `failedUrls` set, and from then on the user sees
		 * the role-based default for everyone except the lucky few whose
		 * requests made it through.
		 *
		 * With `lazy`, browsers only fetch avatars near the viewport, which
		 * spreads the requests over time as the user scrolls and keeps each
		 * batch under Google's per-second threshold.
		 *
		 * Set to `'eager'` for above-the-fold avatars that must be visible
		 * instantly (e.g. the user's own avatar in the header) — the eager
		 * path is fine for a single avatar that the browser would prioritise
		 * anyway.
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
		DO NOT remove `referrerpolicy="no-referrer"` or `{loading}`. See the
		top-of-file "KNOWN TRAP" block and docs/ref/google-avatar-cdn.md.
		Without either, most Google OAuth avatars 429 / 403 silently and the
		page degrades to the role-based default for nearly every user.
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
