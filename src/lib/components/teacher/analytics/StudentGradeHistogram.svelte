<!--
	Widget D — Histogramme des grades {1,2,3,4} sur 7 derniers jours pour un élève.

	Bar chart SVG inline. Couleur par grade (1=rouge, 4=vert).
-->
<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';

	interface Bucket {
		grade: 1 | 2 | 3 | 4;
		count: number;
		avg_stability_after: number;
	}

	interface Props {
		classId: string;
		studentId: string;
		studentName: string;
		days?: number;
		refreshNonce?: number;
	}

	let { classId, studentId, studentName, days = 7, refreshNonce = 0 }: Props = $props();

	let buckets = $state<Bucket[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			const url = `/api/teacher/classes/${classId}/analytics/knowledge-grades/${studentId}?days=${days}`;
			const res = await fetch(url);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body.error ?? `Erreur ${res.status}`;
				return;
			}
			const data = (await res.json()) as { buckets: Bucket[] };
			buckets = data.buckets;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Erreur réseau';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void classId;
		void studentId;
		void days;
		void refreshNonce;
		void load();
	});

	const totalReviews = $derived(buckets.reduce((acc, b) => acc + b.count, 0));
	const maxCount = $derived(Math.max(1, ...buckets.map((b) => b.count)));

	const colors: Record<1 | 2 | 3 | 4, string> = {
		1: 'fill-red-500',
		2: 'fill-amber-500',
		3: 'fill-blue-500',
		4: 'fill-emerald-500'
	};
	const labels: Record<1 | 2 | 3 | 4, string> = {
		1: 'Again',
		2: 'Hard',
		3: 'Good',
		4: 'Easy'
	};

	const W = 280;
	const H = 140;
	const PADDING = { top: 10, right: 10, bottom: 32, left: 28 };
	const innerW = W - PADDING.left - PADDING.right;
	const innerH = H - PADDING.top - PADDING.bottom;
	const barWidth = $derived(buckets.length > 0 ? innerW / buckets.length / 1.5 : 16);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Grades de {studentName}</Card.Title>
		<Card.Description>
			Distribution des grades sur {days} derniers jours.
		</Card.Description>
	</Card.Header>

	<Card.Content>
		{#if loading}
			<Skeleton class="h-[140px] w-full" />
		{:else if error}
			<p class="text-sm text-destructive">⚠ {error}</p>
		{:else if totalReviews === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">Aucune review sur la période.</p>
		{:else}
			<svg viewBox="0 0 {W} {H}" class="w-full" role="img" aria-label="Histogramme des grades">
				<!-- Y axis labels -->
				<text x="0" y={PADDING.top + 4} font-size="10" fill="currentColor" opacity="0.6"
					>{maxCount}</text
				>
				<text x="0" y={PADDING.top + innerH + 4} font-size="10" fill="currentColor" opacity="0.6"
					>0</text
				>

				<!-- Baseline -->
				<line
					x1={PADDING.left}
					y1={PADDING.top + innerH}
					x2={PADDING.left + innerW}
					y2={PADDING.top + innerH}
					stroke="currentColor"
					stroke-opacity="0.3"
				/>

				<!-- Bars + labels -->
				{#each buckets as b, i (b.grade)}
					{@const cx = PADDING.left + (i + 0.5) * (innerW / buckets.length)}
					{@const barH = (b.count / maxCount) * innerH}
					<rect
						x={cx - barWidth / 2}
						y={PADDING.top + innerH - barH}
						width={barWidth}
						height={barH}
						class={colors[b.grade]}
						rx="2"
					>
						<title>
							Grade {b.grade} ({labels[b.grade]}) — {b.count} review{b.count > 1
								? 's'
								: ''}{b.avg_stability_after > 0 ? `, S̄ ≈ ${b.avg_stability_after.toFixed(1)}j` : ''}
						</title>
					</rect>
					<text
						x={cx}
						y={PADDING.top + innerH + 12}
						font-size="10"
						text-anchor="middle"
						fill="currentColor"
					>
						{b.grade}
					</text>
					<text
						x={cx}
						y={PADDING.top + innerH + 24}
						font-size="9"
						text-anchor="middle"
						fill="currentColor"
						opacity="0.6"
					>
						{labels[b.grade]}
					</text>
				{/each}
			</svg>
			<p class="mt-2 text-xs text-muted-foreground">
				{totalReviews} review{totalReviews > 1 ? 's' : ''} comptabilisée{totalReviews > 1
					? 's'
					: ''}.
			</p>
		{/if}
	</Card.Content>
</Card.Root>
