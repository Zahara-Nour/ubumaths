<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js';
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

	let imgSrc = $state('');
	let fallbackAttempted = $state(false);

	// Reset when props change
	$effect(() => {
		imgSrc = primarySrc;
		fallbackAttempted = false;
	});

	function handleLoadingStatusChange(status: 'loading' | 'loaded' | 'error') {
		if (status === 'error' && !fallbackAttempted) {
			fallbackAttempted = true;
			imgSrc = getAvatarFallback((role as UserRole) || 'student');
		}
	}

	const initials = $derived(getAvatarInitials(firstname, lastname));
</script>

<Avatar.Root class={className}>
	<Avatar.Image
		src={imgSrc}
		alt={firstname ? `${firstname} ${lastname ?? ''}`.trim() : 'User'}
		onLoadingStatusChange={handleLoadingStatusChange}
	/>
	<Avatar.Fallback class="text-xs">
		{initials}
	</Avatar.Fallback>
</Avatar.Root>
