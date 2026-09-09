<script lang="ts">
	import { lore } from '$lib/config/lore';
	/**
	 * Teacher Class Journal (Cahier de Texte) Main Page
	 * ==================================================
	 *
	 * Weekly view of journal entries for the teacher's classes.
	 * - Select class via dropdown
	 * - Navigate between weeks
	 * - View entries with status indicators (planned/done/published)
	 * - Click on day to create/edit entry
	 */

	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import MySelect from '$lib/components/MySelect.svelte';
	import JournalWeekGrid from '$lib/components/journal/JournalWeekGrid.svelte';
	import JournalDatePicker from '$lib/components/journal/JournalDatePicker.svelte';
	import { BookOpen, GraduationCap, Calendar, Link2, Copy, Check } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { GRADES, type GradeCode } from '$lib/types/grades';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Derived values
	let hasClasses = $derived(data.classes.length > 0);

	// Class items for the selector
	let classItems = $derived(
		data.classes.map((c) => ({
			value: c.id,
			label: c.name
		}))
	);

	/**
	 * Navigate to previous week
	 */
	function goToPreviousWeek() {
		const current = new Date(data.weekStart);
		current.setDate(current.getDate() - 7);
		const newWeekStart = current.toISOString().split('T')[0];
		updateUrl({ week: newWeekStart });
	}

	/**
	 * Navigate to next week
	 */
	function goToNextWeek() {
		const current = new Date(data.weekStart);
		current.setDate(current.getDate() + 7);
		const newWeekStart = current.toISOString().split('T')[0];
		updateUrl({ week: newWeekStart });
	}

	/**
	 * Navigate to current week
	 */
	function goToCurrentWeek() {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const day = now.getDay();
		const diff = day === 0 ? -6 : 1 - day;
		now.setDate(now.getDate() + diff);
		const newWeekStart = now.toISOString().split('T')[0];
		updateUrl({ week: newWeekStart });
	}

	/**
	 * Handle class selection change
	 */
	function handleClassChange(classId: string) {
		updateUrl({ class: classId });
	}

	/**
	 * Update URL with new params
	 */
	function updateUrl(params: Record<string, string>) {
		const url = new URL($page.url);
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
		goto(url.toString(), { replaceState: true });
	}

	/**
	 * Navigate to entry editor
	 */
	function goToEntry(date: Date) {
		if (!data.selectedClassId) return;
		const dateStr = date.toISOString().split('T')[0];
		goto(`/dashboard/teacher/cahier-texte/${data.selectedClassId}/${dateStr}`);
	}

	/**
	 * Check if current week includes today
	 */
	let isCurrentWeek = $derived(data.weekView?.days.some((d) => d.isToday) ?? false);

	/**
	 * Format week range for display
	 */
	function formatWeekRange(weekStart: string): string {
		const start = new Date(weekStart);
		const end = new Date(start);
		end.setDate(end.getDate() + 6);

		const startMonth = start.toLocaleDateString('fr-FR', { month: 'short' });
		const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' });

		if (startMonth === endMonth) {
			return `${start.getDate()} - ${end.getDate()} ${startMonth} ${start.getFullYear()}`;
		}
		return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${start.getFullYear()}`;
	}
	let copied = $state(false);

	/** L'URL complète du lien public, celle qu'on colle dans un carnet ou un mail. */
	const shareUrl = $derived(
		data.shareToken ? `${$page.url.origin}/cahier/${data.shareToken.token}` : null
	);

	async function copyShareUrl() {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			toaster.error('Impossible de copier le lien');
		}
	}
</script>

<svelte:head>
	<title>Cahier de Texte | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-start justify-between gap-4">
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<BookOpen class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Cahier de Texte</h1>
				<p class="text-muted-foreground">Gerez le contenu des seances et les Corvées Domestiques</p>
			</div>
		</div>
	</div>

	{#if !hasClasses}
		<!-- No classes state -->
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<GraduationCap class="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
				<h2 class="text-xl font-semibold">Aucun {lore.entities.class}</h2>
				<p class="mt-2 text-muted-foreground">
					Vous devez d'abord creer un {lore.entities.class} pour utiliser le cahier de texte.
				</p>
				<Button href="/dashboard/teacher/classes" class="mt-4"
					>Gerer les {lore.entities.class}s</Button
				>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Controls bar -->
		<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
			<!-- Class selector -->
			<div class="flex items-center gap-3">
				<span class="text-sm font-medium text-muted-foreground">{lore.entities.class} :</span>
				<MySelect
					type="single"
					value={data.selectedClassId || ''}
					items={classItems}
					onValueChange={handleClassChange}
					placeholder="Selectionner un {lore.entities.class}"
				/>
			</div>

			<!-- Week navigation -->
			<JournalDatePicker
				weekStart={new Date(data.weekStart)}
				onPrevious={goToPreviousWeek}
				onNext={goToNextWeek}
				onToday={goToCurrentWeek}
				{isCurrentWeek}
			/>
		</div>

		<!-- Week indicator -->
		<div class="mb-6">
			<h2 class="text-lg font-semibold">{formatWeekRange(data.weekStart)}</h2>
			{#if data.weekView}
				<p class="text-sm text-muted-foreground">
					{data.weekView.className}{#if data.weekView.classGrade}
						- {GRADES[data.weekView.classGrade as GradeCode]?.displayName ??
							data.weekView.classGrade}{/if}
				</p>
			{/if}
		</div>

		<!-- Lien de partage : les élèves sans compte n'ont pas d'autre accès -->
		{#if data.selectedClassId}
			<Card.Root class="mb-6">
				<Card.Content class="space-y-3 p-4">
					<div class="flex items-center gap-2 text-sm font-medium">
						<Link2 class="h-4 w-4" />
						Lien de consultation
					</div>

					{#if shareUrl}
						<p class="text-sm text-muted-foreground">
							À donner aux élèves sans compte et à leurs familles. Il permet de <strong>lire</strong
							> les séances publiées, rien d'autre — il n'inscrit personne dans la classe.
						</p>
						<!-- Le schéma ne contient aucune donnée d'élève, mais le CONTENU est du
						     texte libre. C'est le seul endroit du dispositif où une donnée
						     personnelle peut sortir, et ça ne se corrige pas en SQL. -->
						<p class="text-sm text-amber-700 dark:text-amber-500">
							⚠️ Toute personne recevant ce lien lit les séances publiées, sans compte et sans
							contrôle de qui la transmet. N'y nommez aucun élève.
						</p>
						<div class="flex flex-wrap items-center gap-2">
							<code class="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
								{shareUrl}
							</code>
							<Button size="sm" variant="outline" onclick={copyShareUrl}>
								{#if copied}
									<Check class="mr-2 h-4 w-4" />Copié
								{:else}
									<Copy class="mr-2 h-4 w-4" />Copier
								{/if}
							</Button>
						</div>
						{#if data.shareToken?.expires_at}
							<p class="text-xs text-muted-foreground">
								Expire le {new Date(data.shareToken.expires_at).toLocaleDateString('fr-FR')} · consulté
								{data.shareToken.access_count} fois
							</p>
						{/if}
						<div class="flex flex-wrap gap-2">
							<form method="POST" action="?/shareLink" use:enhance>
								<input type="hidden" name="classId" value={data.selectedClassId} />
								<Button type="submit" size="sm" variant="ghost">Renouveler</Button>
							</form>
							<form method="POST" action="?/revokeShareLink" use:enhance>
								<input type="hidden" name="classId" value={data.selectedClassId} />
								<Button type="submit" size="sm" variant="ghost">Révoquer</Button>
							</form>
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">
							Aucun lien actif. En créer un rendra les séances publiées de cette classe consultables
							par toute personne ayant le lien, sans compte.
						</p>
						<form method="POST" action="?/shareLink" use:enhance>
							<input type="hidden" name="classId" value={data.selectedClassId} />
							<Button type="submit" size="sm">Créer le lien</Button>
						</form>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Week grid -->
		{#if data.weekView}
			<JournalWeekGrid days={data.weekView.days} onDayClick={goToEntry} />
		{:else}
			<!-- No class selected or error loading -->
			<Card.Root>
				<Card.Content class="py-12 text-center">
					<Calendar class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
					<p class="text-muted-foreground">
						Selectionnez un {lore.entities.class} pour voir le cahier de texte
					</p>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</main>
