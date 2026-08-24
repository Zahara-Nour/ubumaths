<!--
	Modal "élèves concernés" — utilisée par Widgets E et G.
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import * as Dialog from '$lib/components/ui/dialog';

	interface StudentEntry {
		student_id: string;
		display_name: string;
		caption?: string;
	}

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		students: StudentEntry[];
		onclose?: () => void;
	}

	let { open = $bindable(), title, description, students, onclose }: Props = $props();

	function handleOpenChange(v: boolean) {
		open = v;
		if (!v) onclose?.();
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>{title}</Dialog.Title>
				{#if description}
					<Dialog.Description>{description}</Dialog.Description>
				{/if}
			</Dialog.Header>

			{#if students.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">
					Aucun {lore.entities.student} à afficher.
				</p>
			{:else}
				<ul class="divide-y divide-border">
					{#each students as student (student.student_id)}
						<li class="flex items-center justify-between py-2 text-sm">
							<span class="font-medium">{student.display_name}</span>
							{#if student.caption}
								<span class="text-xs text-muted-foreground">{student.caption}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
