<script lang="ts">
	import { cn } from '$lib/utils.js';
	import {
		getAvatarUrl,
		getAvatarFallback,
		getAvatarInitials,
		type UserRole
	} from '$lib/utils/avatar';

	interface Props {
		avatar_url?: string | null;
		role?: string | null;
		firstname?: string | null;
		lastname?: string | null;
		class?: string;
		user?: { user_metadata?: { picture?: string; avatar_url?: string } };
	}

	let {
		avatar_url = null,
		role = 'student',
		firstname = null,
		lastname = null,
		class: className = 'h-10 w-10',
		user = undefined
	}: Props = $props();

	const primarySrc = $derived(getAvatarUrl({ avatar_url, role }, user));
	const fallbackSrc = $derived(getAvatarFallback((role as UserRole) || 'student'));
	const initials = $derived(getAvatarInitials(firstname, lastname));

	function handleImgError(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		if (primarySrc !== fallbackSrc && img.dataset.fallback !== 'true') {
			img.dataset.fallback = 'true';
			img.src = fallbackSrc;
		} else {
			// Hide img to reveal initials behind it
			img.style.display = 'none';
		}
	}
</script>

<div class={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}>
	<!-- Initials: always rendered as background layer -->
	<span class="absolute inset-0 flex items-center justify-center bg-muted text-xs">
		{initials}
	</span>
	<!-- Image: covers initials when loaded successfully -->
	{#key primarySrc}
		<img
			src={primarySrc}
			alt={firstname ? `${firstname} ${lastname ?? ''}`.trim() : 'User'}
			class="relative z-10 aspect-square size-full object-cover"
			loading="lazy"
			onerror={handleImgError}
		/>
	{/key}
</div>
