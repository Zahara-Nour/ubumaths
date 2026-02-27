<script lang="ts">
	import type { Component } from 'svelte';
	import type { StudentVipCards, VipCardInstance } from '$lib/types/vip-card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';

	let {
		open = $bindable(false),
		cardId,
		title,
		icon: Icon,
		iconColorClass,
		classId
	}: {
		open: boolean;
		cardId: string;
		title: string;
		icon: Component<{ class?: string }>;
		iconColorClass: string;
		classId: string | null;
	} = $props();

	let students = $state<
		Array<{
			id: string;
			firstname: string;
			lastname?: string;
			avatar_url?: string;
			cardCount: number;
		}>
	>([]);
	let isLoading = $state(false);
	let isUsing = $state(false);

	$effect(() => {
		if (open && classId) {
			fetchStudents(classId);
		}
	});

	async function fetchStudents(forClassId: string) {
		try {
			isLoading = true;

			const rewards = await teacherCache.getStudentRewards(forClassId);
			const basicStudents = await teacherCache.getStudentBasic(forClassId);

			const found: typeof students = [];

			for (const [studentId, studentRewards] of rewards) {
				const vipCards = studentRewards.vip_cards as StudentVipCards | undefined;
				if (!vipCards) continue;

				const count = Object.values(vipCards).filter((instance) => {
					const cardInstance = instance as VipCardInstance;
					return cardInstance.cardId === cardId && !cardInstance.usedAt;
				}).length;

				if (count > 0) {
					const student = basicStudents.find((s) => s.id === studentId);
					if (student) {
						found.push({
							id: studentId,
							firstname: student.firstname,
							lastname: student.lastname ?? undefined,
							avatar_url: student.avatar_url ?? undefined,
							cardCount: count
						});
					}
				}
			}

			students = found;
		} catch (err) {
			console.error(`Failed to fetch ${title} students:`, err);
			toaster.error('Erreur lors du chargement');
			open = false;
		} finally {
			isLoading = false;
		}
	}

	async function handleUseCard(studentId: string) {
		try {
			isUsing = true;

			const response = await fetch('/api/teacher/rewards/use-vip-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ studentId, cardId })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Erreur lors de l'utilisation de la carte");
			}

			students = students
				.map((s) => (s.id === studentId ? { ...s, cardCount: s.cardCount - 1 } : s))
				.filter((s) => s.cardCount > 0);

			if (classId) {
				teacherCache.invalidateRewards(classId);
			}

			toaster.success(`Carte ${title} utilisée !`);

			if (students.length === 0) {
				open = false;
			}
		} catch (err) {
			console.error(`Failed to use ${title} card:`, err);
			toaster.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			isUsing = false;
		}
	}

	function handleClose() {
		open = false;
		students = [];
	}
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && handleClose()}>
	<Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Icon class="h-5 w-5 {iconColorClass}" />
				{title}
			</Dialog.Title>
			<Dialog.Description>
				Sélectionnez un élève pour utiliser sa carte VIP "{title}"
			</Dialog.Description>
		</Dialog.Header>

		<div class="mt-4">
			{#if isLoading}
				<div class="flex flex-col items-center justify-center py-8">
					<div class="mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary"></div>
					<p class="text-sm text-muted-foreground">Recherche des élèves...</p>
				</div>
			{:else if students.length === 0}
				<div class="py-8 text-center">
					<Icon class="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
					<p class="text-muted-foreground">Aucun élève n'a de carte "{title}" disponible.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each students as student (student.id)}
						<button
							onclick={() => handleUseCard(student.id)}
							disabled={isUsing}
							class="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
						>
							{#if student.avatar_url}
								<img src={student.avatar_url} alt="" class="h-10 w-10 rounded-full object-cover" />
							{:else}
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
								>
									{student.firstname.charAt(0)}
								</div>
							{/if}

							<div class="flex-1">
								<p class="font-medium text-foreground">
									{student.firstname}
									{student.lastname || ''}
								</p>
								<p class="text-xs text-muted-foreground">Carte VIP disponible</p>
							</div>

							{#if student.cardCount >= 2}
								<Badge variant="secondary" class="text-xs font-semibold">
									x{student.cardCount}
								</Badge>
							{/if}

							<Icon class="h-4 w-4 {iconColorClass}" />
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
