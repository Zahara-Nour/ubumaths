<!--
	Teacher Buddies Dashboard
	==========================
	Overview of Palotin buddies across all classes.
	Aggregated stats + per-student details.
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { Badge } from '$lib/components/ui/badge';
	import { Star, Flame, ChevronDown, ChevronUp } from '@lucide/svelte';
	import { xpProgress, MAX_LEVEL } from '$lib/utils/buddy-xp';

	let { data }: { data: PageData } = $props();

	let expandedClass = $state<string | null>(null);

	function toggleClass(classId: string) {
		expandedClass = expandedClass === classId ? null : classId;
	}

	const palotinColors: Record<string, string> = {
		giron: 'bg-red-100 text-red-700',
		pile: 'bg-blue-100 text-blue-700',
		cotice: 'bg-green-100 text-green-700'
	};

	const palotinNames: Record<string, string> = {
		giron: 'Giron',
		pile: 'Pile',
		cotice: 'Cotice'
	};

	function formatDate(date: string | null): string {
		if (!date) return 'Jamais';
		return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
	}
</script>

<div class="space-y-6">
	{#if data.classesData.length === 0}
		<Card.Root>
			<Card.Content class="py-8 text-center text-muted-foreground">
				Aucun {lore.entities.class} actif.
			</Card.Content>
		</Card.Root>
	{:else}
		{#each data.classesData as cls (cls.classId)}
			<Card.Root>
				<!-- Class header (clickable) -->
				<button type="button" class="w-full text-left" onclick={() => toggleClass(cls.classId)}>
					<Card.Header class="pb-3">
						<div class="flex items-center justify-between">
							<div>
								<Card.Title class="text-base">{cls.className}</Card.Title>
								<Card.Description>
									{cls.stats.withBuddy}/{cls.stats.total} eleves avec un Palotin
								</Card.Description>
							</div>
							{#if expandedClass === cls.classId}
								<ChevronUp class="h-5 w-5 text-muted-foreground" />
							{:else}
								<ChevronDown class="h-5 w-5 text-muted-foreground" />
							{/if}
						</div>

						<!-- Stats row -->
						{#if cls.stats.withBuddy > 0}
							<div class="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
								<span class="flex items-center gap-1">
									<Star class="h-3 w-3" />
									Niv. moy. {cls.stats.avgLevel}
								</span>
								<span class="flex items-center gap-1">
									<Flame class="h-3 w-3" />
									Streak moy. {cls.stats.avgStreak}j
								</span>
								{#each Object.entries(cls.stats.palotinDistribution) as [palotin, count] (palotin)}
									{#if count > 0}
										<Badge variant="secondary" class="text-xs {palotinColors[palotin]}">
											{palotinNames[palotin]} : {count}
										</Badge>
									{/if}
								{/each}
							</div>
						{/if}
					</Card.Header>
				</button>

				<!-- Student list (expanded) -->
				{#if expandedClass === cls.classId}
					<Card.Content class="pt-0">
						<div class="divide-y">
							{#each cls.students as student (student.studentId)}
								<div class="flex items-center gap-3 py-2.5">
									<!-- Name -->
									<div class="min-w-0 flex-1">
										<div class="truncate text-sm font-medium">{student.fullName}</div>
									</div>

									{#if student.palotinType}
										<!-- Palotin badge -->
										<Badge variant="secondary" class="text-xs {palotinColors[student.palotinType]}">
											{palotinNames[student.palotinType]}
										</Badge>

										<!-- Level -->
										<div class="flex items-center gap-1 text-xs text-muted-foreground">
											<Star class="h-3 w-3" />
											{student.level}
										</div>

										<!-- XP progress -->
										{@const prog = xpProgress(student.xp, student.level)}
										<div class="hidden w-20 sm:block">
											<Progress
												value={student.level >= MAX_LEVEL
													? 100
													: prog.needed > 0
														? (prog.current / prog.needed) * 100
														: 0}
												class="h-1.5"
											/>
										</div>

										<!-- Streak -->
										<div class="flex items-center gap-1 text-xs text-muted-foreground">
											<Flame class="h-3 w-3 {student.currentStreak > 0 ? 'text-orange-500' : ''}" />
											{student.currentStreak}j
										</div>

										<!-- Last activity -->
										<div class="hidden text-xs text-muted-foreground md:block">
											{formatDate(student.lastActivityDate)}
										</div>
									{:else}
										<span class="text-xs text-muted-foreground">Pas de Palotin</span>
									{/if}
								</div>
							{/each}
						</div>
					</Card.Content>
				{/if}
			</Card.Root>
		{/each}
	{/if}
</div>
