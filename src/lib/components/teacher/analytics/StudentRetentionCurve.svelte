<!--
	Widget B — Courbe rétention (retrievability moyenne par semaine, 8 dernières semaines)
	pour un élève × un thème BO.

	SVG inline minimaliste.
-->
<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';

	interface RetentionPoint {
		week_start: string;
		retrievability_avg: number;
		review_count: number;
	}

	interface Props {
		classId: string;
		studentId: string;
		studentName: string;
		theme: string;
		refreshNonce?: number;
	}

	let { classId, studentId, studentName, theme, refreshNonce = 0 }: Props = $props();

	let points = $state<RetentionPoint[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			const url = `/api/teacher/classes/${classId}/analytics/knowledge-retention/${studentId}?theme=${encodeURIComponent(theme)}`;
			const res = await fetch(url);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body.error ?? `Erreur ${res.status}`;
				return;
			}
			const data = (await res.json()) as { points: RetentionPoint[] };
			points = data.points;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Erreur réseau';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void classId;
		void studentId;
		void theme;
		void refreshNonce;
		void load();
	});

	const totalReviews = $derived(points.reduce((acc, p) => acc + p.review_count, 0));
	const hasData = $derived(totalReviews >= 3);

	const W = 320;
	const H = 140;
	const PADDING = { top: 10, right: 10, bottom: 24, left: 28 };
	const innerW = W - PADDING.left - PADDING.right;
	const innerH = H - PADDING.top - PADDING.bottom;

	const polylinePoints = $derived.by(() => {
		if (points.length === 0) return '';
		return points
			.map((p, i) => {
				const x = PADDING.left + (i / Math.max(points.length - 1, 1)) * innerW;
				const y = PADDING.top + (1 - p.retrievability_avg) * innerH;
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	});

	function weekLabel(iso: string): string {
		const d = new Date(iso);
		return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Rétention de {studentName}</Card.Title>
		<Card.Description>
			Retrievability moyenne par semaine (8 dernières) sur le thème <strong>{theme}</strong>.
		</Card.Description>
	</Card.Header>

	<Card.Content>
		{#if loading}
			<Skeleton class="h-[140px] w-full" />
		{:else if error}
			<p class="text-sm text-destructive">⚠ {error}</p>
		{:else if !hasData}
			<p class="py-8 text-center text-sm text-muted-foreground">
				Pas assez de reviews sur ce thème ({totalReviews} review{totalReviews > 1 ? 's' : ''} récente{totalReviews >
				1
					? 's'
					: ''}).
			</p>
		{:else}
			<svg viewBox="0 0 {W} {H}" class="w-full" role="img" aria-label="Courbe rétention">
				<!-- Y axis labels -->
				<text x="0" y={PADDING.top + 4} font-size="10" fill="currentColor" opacity="0.6">1.0</text>
				<text x="0" y={PADDING.top + innerH / 2} font-size="10" fill="currentColor" opacity="0.6"
					>0.5</text
				>
				<text x="0" y={PADDING.top + innerH + 4} font-size="10" fill="currentColor" opacity="0.6"
					>0.0</text
				>

				<!-- Grid lines -->
				<line
					x1={PADDING.left}
					y1={PADDING.top}
					x2={PADDING.left + innerW}
					y2={PADDING.top}
					stroke="currentColor"
					stroke-opacity="0.1"
				/>
				<line
					x1={PADDING.left}
					y1={PADDING.top + innerH / 2}
					x2={PADDING.left + innerW}
					y2={PADDING.top + innerH / 2}
					stroke="currentColor"
					stroke-opacity="0.1"
				/>
				<line
					x1={PADDING.left}
					y1={PADDING.top + innerH}
					x2={PADDING.left + innerW}
					y2={PADDING.top + innerH}
					stroke="currentColor"
					stroke-opacity="0.3"
				/>

				<!-- Curve -->
				<polyline
					points={polylinePoints}
					fill="none"
					stroke="rgb(16 185 129)"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>

				<!-- Dots + week labels -->
				{#each points as p, i (p.week_start)}
					{@const x = PADDING.left + (i / Math.max(points.length - 1, 1)) * innerW}
					{@const y = PADDING.top + (1 - p.retrievability_avg) * innerH}
					<circle cx={x} cy={y} r="3" fill="rgb(16 185 129)">
						<title>
							Semaine {weekLabel(p.week_start)} — R̄ = {p.retrievability_avg.toFixed(2)} ({p.review_count}
							review{p.review_count > 1 ? 's' : ''})
						</title>
					</circle>
					{#if i % 2 === 0 || i === points.length - 1}
						<text
							{x}
							y={H - 6}
							font-size="9"
							text-anchor="middle"
							fill="currentColor"
							opacity="0.6"
						>
							{weekLabel(p.week_start)}
						</text>
					{/if}
				{/each}
			</svg>
			<p class="mt-2 text-xs text-muted-foreground">
				{totalReviews} review{totalReviews > 1 ? 's' : ''} sur la période.
			</p>
		{/if}
	</Card.Content>
</Card.Root>
