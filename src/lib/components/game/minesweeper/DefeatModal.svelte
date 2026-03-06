<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { RotateCcw } from 'lucide-svelte';

	interface Props {
		onPlayAgain: () => void;
	}

	let { onPlayAgain }: Props = $props();
</script>

<Card.Root class="animate-in zoom-in-95 mx-4 w-full max-w-sm overflow-hidden duration-200">
	<img src="/images/games/minesweeper-defeat.webp" alt="Défaite" class="w-full" />

	<Card.Content class="p-4 sm:p-6">
		<div class="flex justify-center">
			<Button onclick={onPlayAgain} class="gap-2">
				<RotateCcw class="h-4 w-4" />
				Réessayer
			</Button>
		</div>
	</Card.Content>
</Card.Root>
