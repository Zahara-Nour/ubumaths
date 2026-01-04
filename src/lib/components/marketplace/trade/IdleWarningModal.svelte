<!--
	Idle Warning Modal
	==================
	Displayed when user has been inactive for too long during a trade.
	Gives options to continue or quit the session.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Clock, LogOut } from 'lucide-svelte';

	interface Props {
		onContinue: () => void;
		onQuit: () => void;
	}

	let { onContinue, onQuit }: Props = $props();
</script>

<!-- Backdrop -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
	<!-- Modal -->
	<div
		class="w-full max-w-md rounded-lg border bg-card p-6 shadow-xl"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="idle-title"
		aria-describedby="idle-description"
	>
		<!-- Icon -->
		<div class="mb-4 flex justify-center">
			<div class="bg-warning/20 rounded-full p-3">
				<Clock class="text-warning h-8 w-8" />
			</div>
		</div>

		<!-- Title -->
		<h2 id="idle-title" class="mb-2 text-center text-xl font-semibold">Etes-vous toujours la ?</h2>

		<!-- Description -->
		<p id="idle-description" class="mb-6 text-center text-muted-foreground">
			Vous etes inactif depuis un moment. Voulez-vous continuer l'echange ?
		</p>

		<!-- Actions -->
		<div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
			<Button onclick={onContinue} class="flex-1 sm:flex-initial">Continuer l'echange</Button>
			<Button variant="outline" onclick={onQuit} class="flex-1 sm:flex-initial">
				<LogOut class="mr-2 h-4 w-4" />
				Quitter
			</Button>
		</div>
	</div>
</div>
