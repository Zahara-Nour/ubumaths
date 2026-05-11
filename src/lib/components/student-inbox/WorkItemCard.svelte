<!--
	WorkItemCard
	============
	One row in the unified student work inbox. Renders a single `WorkItem`
	from any of the four assignment sources (assessment, exercise, worksheet,
	python) in a consistent, source-aware card.

	The whole card is a link (`href={item.href}`) so the click target is large
	on mobile. The CTA button is a *decorative* `<span>` styled with
	`buttonVariants` — nested `<a>` would be invalid HTML, so we keep a single
	interactive element (the wrapping anchor).

	Visual semantics:
	- Badge color encodes the source (Test/Exercice/Fiche/Python).
	- A discreet dot is rendered when the student has opened the item but not
	  finished it (`viewed && status === 'todo'`).
	- "Done" items (rendered inside the "Fait cette semaine" section) show
	  `Fait <relative>` instead of the due date.
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { ClipboardList, BookOpen, FileText, Code, GraduationCap, Clock } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import { formatDeadline } from '$lib/utils/dates';
	import { cn } from '$lib/utils';
	import type { WorkItem, WorkSource } from '$lib/types/student-inbox';

	interface Props {
		item: WorkItem;
	}

	let { item }: Props = $props();

	type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success';

	interface SourceMeta {
		label: string;
		badgeVariant: BadgeVariant;
		cta: string;
		icon: typeof FileText;
	}

	// Source-specific visual + textual mapping. Kept as a static map so the
	// values are obvious at a glance and easy to tweak in code review.
	const SOURCE_META: Record<WorkSource, SourceMeta> = {
		assessment: {
			label: 'Test',
			badgeVariant: 'destructive',
			cta: 'Commencer',
			icon: ClipboardList
		},
		exercise: {
			label: 'Exercice',
			badgeVariant: 'default',
			cta: 'Travailler',
			icon: BookOpen
		},
		worksheet: {
			label: 'Fiche',
			badgeVariant: 'secondary',
			cta: 'Consulter',
			icon: FileText
		},
		python: {
			label: 'Python',
			badgeVariant: 'outline',
			cta: 'Coder',
			icon: Code
		}
	};

	const meta = $derived(SOURCE_META[item.source]);
	const SourceIcon = $derived(meta.icon);

	// Assessment-specific CTA: "Reprendre" once the student has at least
	// opened (created a session) but not completed. `item.viewed` is always
	// false today for assessments (the aggregator doesn't expose a viewed
	// signal there yet), so this is wired but inert for now — kept for
	// forward compatibility with a later last_viewed_at field.
	const ctaLabel = $derived(
		item.source === 'assessment' && item.viewed && item.status === 'todo' ? 'Reprendre' : meta.cta
	);

	// Shown only when the item is in the "todo" state AND the student has
	// already opened it (currently exercise + worksheet only).
	const showViewedDot = $derived(item.viewed && item.status === 'todo');

	// Due-date / done-date line. When status === 'done' the item lives in
	// "Fait cette semaine" and we show "Fait <relative>" instead.
	const dateLabel = $derived.by(() => {
		if (item.status === 'done' && item.doneAt) {
			return `Fait ${formatDeadline(item.doneAt, 'detailed')}`;
		}
		if (item.dueAt) {
			return formatDeadline(item.dueAt, 'detailed');
		}
		return null;
	});

	const ctaVariant = $derived(item.status === 'done' ? 'outline' : 'default');
</script>

<a
	href={resolve(item.href as '/')}
	class="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
	aria-label="{meta.label} : {item.title}"
>
	<Card.Root
		class="flex flex-col gap-3 p-4 transition-shadow group-hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
	>
		<!-- Left: badge + title block -->
		<div class="min-w-0 flex-1">
			<div class="mb-1.5 flex flex-wrap items-center gap-2">
				<Badge variant={meta.badgeVariant}>
					<SourceIcon class="mr-1 h-3 w-3" />
					{meta.label}
				</Badge>
				{#if showViewedDot}
					<span
						class="text-base leading-none text-primary/50"
						aria-label="Déjà ouvert"
						title="Déjà ouvert"
					>
						•
					</span>
				{/if}
			</div>

			<h3 class="truncate text-base leading-tight font-semibold">
				{item.title}
			</h3>

			{#if item.className}
				<p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
					<GraduationCap class="h-3 w-3 flex-shrink-0" />
					<span class="truncate">{item.className}</span>
				</p>
			{/if}

			{#if dateLabel}
				<p
					class="mt-1 flex items-center gap-1 text-xs"
					class:text-muted-foreground={item.status === 'done'}
					class:text-foreground={item.status === 'todo'}
				>
					<Clock class="h-3 w-3 flex-shrink-0" />
					<span>{dateLabel}</span>
				</p>
			{/if}
		</div>

		<!-- Right: CTA. Decorative <span> styled like a button — the actual
		     click target is the wrapping <a> to keep the HTML semantics clean. -->
		<div class="flex-shrink-0">
			<span
				class={cn(buttonVariants({ variant: ctaVariant, size: 'sm' }), 'w-full sm:w-auto')}
				aria-hidden="true"
			>
				{ctaLabel}
			</span>
		</div>
	</Card.Root>
</a>
