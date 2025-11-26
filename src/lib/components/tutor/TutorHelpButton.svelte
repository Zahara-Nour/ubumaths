<!--
	TutorHelpButton Component
	=========================

	Button that opens a dialog/modal with the TutorChat component.
	Used to embed tutor help directly in exercises.

	FEATURES:
	- Opens dialog with tutor chat
	- Passes exercise context to tutor
	- Customizable button variant
	- Responsive modal sizing
	- Accessible keyboard navigation

	PROPS:
	- exerciseContext: Exercise details for context-aware help
	- variant?: Button style variant (default: 'outline')

	USAGE:
	```svelte
	<TutorHelpButton
	  exerciseContext={{
	    exerciseId: '123',
	    statement: 'Calculer 2 + 3',
	    topic: 'addition'
	  }}
	/>
	```

	@component
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { HelpCircle } from 'lucide-svelte';
	import TutorChat from './TutorChat.svelte';

	interface ExerciseContext {
		exerciseId?: string;
		statement: string;
		topic?: string;
		domain?: string;
		level?: number;
		studentGrade?: string;
		attempts?: Array<{ isCorrect: boolean; answer?: string }>;
	}

	interface Props {
		exerciseContext: ExerciseContext;
		variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
	}

	let { exerciseContext, variant = 'outline' }: Props = $props();

	// Dialog state
	let open = $state(false);
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger asChild let:builder>
		<Button builders={[builder]} {variant} class="gap-2">
			<HelpCircle class="h-4 w-4" />
			Demander au Père Ubu
		</Button>
	</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-h-[85vh] max-w-3xl overflow-hidden p-0">
			<div class="flex h-[calc(85vh-2rem)] flex-col">
				<TutorChat {exerciseContext} />
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
