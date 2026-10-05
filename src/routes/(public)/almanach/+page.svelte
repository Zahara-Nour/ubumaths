<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import {
		FEASTS,
		MONTH_NAMES,
		formatGregorian,
		formatLong,
		formatShort,
		extraDayGregorian,
		monthGregorianRange,
		type Feast,
		type MonthIndex
	} from '$lib/almanach/calendar';
	import {
		HERO_HALO_OPACITY,
		HERO_VEIL_OPACITY,
		MONTH_PALETTES,
		ambianceMonthIndex,
		paletteCssVars
	} from '$lib/almanach/palettes';
	import AlmanachConverter from './AlmanachConverter.svelte';
	import type { PageProps } from './$types';

	// Constantes
	/** Étymologie de chaque mois (Compendium, section VIII) */
	const ETYMOLOGIES: readonly string[] = [
		'ambre + suffixe latin -aire',
		'givre + suffixe -aire',
		'onomatopée « glagla » + suffixe -ose',
		'dégel + suffixe -ose',
		'aurore + suffixe -al',
		'latin lumen (lumière) + suffixe -al',
		'latin augustus (vénérable)'
	];

	const MONTH_INDEXES = MONTH_NAMES.map((_, i) => i as MonthIndex);

	/** Périodes de plusieurs jours (Compendium, section VIII) : du texte, pas des fêtes */
	const MONTH_PERIODS: Partial<Record<MonthIndex, string>> = {
		5: 'La Mobilisation Royale : du 1 Lumenal à la veille du Décervelage Suprême.'
	};

	// Props
	let { data }: PageProps = $props();

	// Variables
	const today = $derived(data.almanach);
	const todayMonth = $derived(today.kind === 'month' ? today.monthIndex : null);
	const ambiance = $derived(paletteCssVars(ambianceMonthIndex(today)));
	const ambianceText = $derived(MONTH_PALETTES[ambianceMonthIndex(today)].ambiance);
	const todayFeastId = $derived(today.kind === 'month' ? (today.feast?.id ?? null) : null);
	const nextFeast = $derived(findNextFeast());
	const nextSurnumeraire = $derived(findNextSurnumeraire());

	// Functions
	/** Prochaine fête strictement après aujourd'hui (ou la première de l'An suivant) */
	function findNextFeast(): Feast {
		if (today.kind === 'extra-day' && today.extraDay === 'cloche') return FEASTS[0];
		// Rang comparable « mois × 100 + jour » ; le Surnuméraire suit le 52 Déglaçose
		const rank = today.kind === 'month' ? today.monthIndex * 100 + today.day : 3 * 100 + 52.5;
		return FEASTS.find((f) => f.monthIndex * 100 + f.day > rank) ?? FEASTS[0];
	}

	/** Surnuméraire du jour, sinon le prochain 18 mars bissextile */
	function findNextSurnumeraire(): { year: number; label: string; isToday: boolean } {
		const isToday = today.kind === 'extra-day' && today.extraDay === 'surnumeraire';
		for (let year = today.year; ; year++) {
			const date = extraDayGregorian('surnumeraire', year);
			const alreadyPast =
				year === today.year &&
				(today.kind === 'month' ? today.monthIndex >= 4 : today.extraDay === 'cloche');
			if (date && !alreadyPast) return { year, label: formatGregorian(date), isToday };
		}
	}

	function monthRangeLabel(monthIndex: MonthIndex): string {
		const { start, end } = monthGregorianRange(monthIndex, today.year);
		return `${formatGregorian(start, false)} → ${formatGregorian(end, false)}`;
	}

	function feastsOf(monthIndex: MonthIndex): Feast[] {
		return FEASTS.filter((f) => f.monthIndex === monthIndex);
	}
</script>

<SeoHead
	title="L’Almanach des Chiphres — Chiphre"
	description="L’Almanach des Chiphres : sept mois de cinquante-deux jours, la Cloche du Grand Reset, Le Surnuméraire et les fêtes du Royaume. Convertissez n’importe quelle date grégorienne en date pataphysique."
/>

<article class="almanach mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-10 sm:px-6">
	<!-- 1. La date du jour -->
	<section
		aria-labelledby="almanach-titre"
		class="hero relative overflow-hidden rounded-2xl border bg-card px-6 py-10 text-center text-card-foreground sm:px-10"
		style:--halo-1={ambiance.halo1}
		style:--halo-2={ambiance.halo2}
		style:--halo-3={ambiance.halo3}
		style:--ubu-stroke={ambiance.stroke}
	>
		<div class="hero-halo" aria-hidden="true" style:opacity={HERO_HALO_OPACITY}></div>
		<div
			class="hero-veil relative flex flex-col items-center gap-3"
			data-testid="almanach-hero-veil"
			style:--veil={`${HERO_VEIL_OPACITY * 100}%`}
		>
			<h1 id="almanach-titre" class="serif">L’Almanach des Chiphres</h1>
			<div class="eyebrow">Aujourd’hui</div>
			<div class="serif today text-5xl font-semibold sm:text-6xl" data-testid="almanach-today">
				{formatShort(today)}
			</div>
			<div class="serif text-xl">An {today.year} de l’Ère du Royaume</div>
			<div class="italic">{formatLong(today)}</div>
			<div>{ambianceText}</div>
			{#if today.kind === 'month' && today.feast}
				<div class="feast-pill mt-2 rounded-full border px-4 py-1 text-sm">
					Fête du jour : {today.feast.name}
				</div>
			{/if}
		</div>
	</section>

	<blockquote class="epigraph serif mx-auto max-w-2xl text-center text-lg italic">
		« Au commencement, le Père Ubu rota par dix-sept fois — et le Royaume sut désormais où il en
		était de l’année. »
	</blockquote>

	<!-- 2. Un Almanach, pas un Calendrier -->
	<section aria-labelledby="almanach-pas-calendrier" class="prose-almanach mx-auto max-w-2xl">
		<h2 id="almanach-pas-calendrier" class="serif">Un Almanach, pas un Calendrier</h2>
		<p>
			Un calendrier range le temps ; un almanach le raconte. Le premier se contente de cases, le
			second y ajoute des histoires, des conseils et quelques prophéties, dont on vérifie rarement
			l’exactitude. Alfred Jarry en publia deux, <cite>L’Almanach du Père Ubu illustré</cite> en
			1899, puis <cite>L’Almanach illustré du Père Ubu</cite> en 1901. C’est à ce modèle que le Royaume
			se tient.
		</p>
		<p>
			Les années se comptent dans l’<strong>Ère du Royaume</strong>, depuis la première
			représentation d’<cite>Ubu Roi</cite>, au Théâtre de l’Œuvre, à Paris, le
			<strong>10 décembre 1896</strong>. Ce soir-là, le Royaume entra dans la culture française par
			un seul mot, que la bienséance nous dispense de répéter.
		</p>
		<p>
			Par commodité, l’An 1 commence le 23 août 1896 : l’année du Royaume suit ainsi celle de
			l’école. Sept mois de cinquante-deux jours font trois cent soixante-quatre jours. Il en manque
			un, la Cloche du Grand Reset, qui ferme l’année ; tous les quatre ans, un second jour
			s’invite, Le Surnuméraire. Le compte est juste, ce qui n’est pas si fréquent dans le Royaume.
		</p>
	</section>

	<!-- 3. Les sept mois -->
	<section aria-labelledby="almanach-mois" class="flex flex-col gap-6">
		<div class="prose-almanach mx-auto max-w-2xl">
			<h2 id="almanach-mois" class="serif">Les sept mois</h2>
			<p>
				Chaque mois porte le nom d’un phénomène que l’on perçoit, à la manière de Fabre d’Églantine
				: l’ambre, le givre, le claquement de dents, le dégel, l’aurore, la lumière, puis l’été,
				auguste. Tous ont cinquante-deux jours, ni plus ni moins. Les dates ci-dessous sont celles
				de l’An {today.year}.
			</p>
		</div>

		<ol class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each MONTH_INDEXES as monthIndex (monthIndex)}
				{@const palette = paletteCssVars(monthIndex)}
				{@const current = monthIndex === todayMonth}
				<li
					class={[
						'month-card relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-card p-5 pt-6 text-card-foreground',
						current && 'is-current'
					]}
					aria-current={current ? 'date' : undefined}
					data-month={monthIndex}
					style:--m-1={palette.halo1}
					style:--m-2={palette.halo2}
					style:--m-3={palette.halo3}
				>
					<span class="month-band" aria-hidden="true"></span>
					<div class="flex items-baseline justify-between gap-2">
						<h3 class="serif">
							<span class="text-muted-foreground">{monthIndex + 1}.</span>
							{MONTH_NAMES[monthIndex]}
						</h3>
						{#if current}
							<span class="current-badge rounded-full px-2 py-0.5 text-xs font-semibold">
								Mois en cours
							</span>
						{/if}
					</div>
					<span class="text-sm text-muted-foreground tabular-nums"
						>{monthRangeLabel(monthIndex)}</span
					>
					<span class="italic">{MONTH_PALETTES[monthIndex].ambiance}</span>
					<span class="text-sm text-muted-foreground">{ETYMOLOGIES[monthIndex]}</span>
					{#if MONTH_PERIODS[monthIndex]}
						<span class="text-sm" data-testid="month-period">{MONTH_PERIODS[monthIndex]}</span>
					{/if}
					{#each feastsOf(monthIndex) as feast (feast.id)}
						<span class="text-sm" data-testid="month-feast">
							<span class="tabular-nums">{feast.day} {MONTH_NAMES[monthIndex]}</span> : {feast.name}
						</span>
					{/each}
				</li>
			{/each}
		</ol>
	</section>

	<!-- 4. Les deux jours hors-mois -->
	<section aria-labelledby="almanach-hors-mois" class="flex flex-col gap-6">
		<div class="prose-almanach mx-auto max-w-2xl">
			<h2 id="almanach-hors-mois" class="serif">Les deux jours hors-mois</h2>
			<p>
				Sept fois cinquante-deux font trois cent soixante-quatre. Le Royaume ajoute donc des jours
				qui n’appartiennent à aucun mois et ne portent aucun numéro : un chaque année, un second les
				années bissextiles.
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-2">
			<article
				aria-labelledby="almanach-cloche"
				class="hors-mois flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground"
				style:--m-1={paletteCssVars(6).halo1}
			>
				<div>
					<h3 id="almanach-cloche" class="serif">La Cloche du Grand Reset</h3>
					<span class="text-sm text-muted-foreground">22 août, chaque année</span>
				</div>
				<blockquote class="epigraph italic">
					« À minuit pile, la Cloche de Reset Centrale de Turingrad sonne sept fois — une fois pour
					chaque mois écoulé. À 00 h 01, l’An se renouvelle. »
				</blockquote>
				<p>
					Entre la fin d’Auguste et le début d’Ambraire, le Royaume reste suspendu hors du temps des
					mois. Les compteurs de l’année reviennent à zéro ; ce qui a été acquis reste acquis,
					grades, cartes et palmarès compris. C’est une renaissance, pas une amnésie. C’est aussi,
					sans que personne y voie une coïncidence, la veille de la rentrée.
				</p>
				<figure class="ubu-quote">
					<blockquote>
						« Cornegidouille ! L’An {today.year} s’achève. Notre Cloche sonne. Que les Polonais se préparent
						à l’An {today.year + 1} ! »
					</blockquote>
					<figcaption>— Père Ubu</figcaption>
				</figure>
			</article>

			<article
				aria-labelledby="almanach-surnumeraire"
				class="hors-mois flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground"
				style:--m-1={paletteCssVars(3).halo1}
			>
				<div>
					<h3 id="almanach-surnumeraire" class="serif">Le Surnuméraire</h3>
					<span class="text-sm text-muted-foreground">
						18 mars, les années bissextiles : jour de l’équivalence des contraires
					</span>
				</div>
				<blockquote class="epigraph italic">
					« Tous les quatre ans, au sortir du dégel et à la porte de l’aurore, le Royaume reçoit un
					jour qui n’appartient ni à l’hiver ni au printemps, ni à Déglaçose ni à Auroral. Ce
					jour-là, la nuit et le jour se valent presque. Le Père Ubu voulut l’inscrire au registre
					des phynances pour le taxer. Ne pouvant le ranger dans aucun mois, ni en venir à bout par
					décret, il le déclara Surnuméraire. »
				</blockquote>
				<p>
					Les années bissextiles, le 29 février se glisse au milieu de Déglaçose, dont il devient le
					trente-cinquième jour. Pour que chaque mois garde ses cinquante-deux jours, le jour en
					trop est rangé à la première frontière qui suit : entre le 52 Déglaçose et le 1 Auroral,
					le 18 mars. Ni dégel ni aurore, ni hiver ni printemps : les contraires s’y valent. On n’y
					programme ni examen ni défi officiel ; le défi facultatif propose deux méthodes opposées
					qui mènent au même résultat.
				</p>
				<p class="text-sm text-muted-foreground" data-testid="almanach-next-surnumeraire">
					{#if nextSurnumeraire.isToday}
						Le Surnuméraire, c’est aujourd’hui : {nextSurnumeraire.label} (An {nextSurnumeraire.year}
						E.R.).
					{:else}
						Prochain Surnuméraire : {nextSurnumeraire.label} (An {nextSurnumeraire.year} E.R.).
					{/if}
				</p>
				<figure class="ubu-quote">
					<blockquote>
						« Tudieu ! Ce jour n’est ni d’hiver ni de printemps, et Nous ne pouvons le taxer.
						Profitez-en, Polonais, mais ne croyez pas que cela Nous arrive souvent. »
					</blockquote>
					<figcaption>— Père Ubu</figcaption>
				</figure>
			</article>
		</div>
	</section>

	<!-- 5. Les fêtes de l'An -->
	<section aria-labelledby="almanach-fetes" class="flex flex-col gap-6">
		<div class="prose-almanach mx-auto max-w-2xl">
			<h2 id="almanach-fetes" class="serif">Les fêtes de l’An</h2>
			<p>
				Les fêtes suivent la date pataphysique, et la plupart retombent chaque année au même jour
				grégorien. La Restauration de Bougrelas fait exception : elle se tient le 35 Déglaçose, qui
				est le 29 février les années bissextiles. Un jour qui n’existe que tous les quatre ans, pour
				une fête de restauration : on ne saurait mieux choisir.
			</p>
		</div>

		<div class="overflow-x-auto rounded-xl border bg-card text-card-foreground">
			<table class="w-full text-left text-sm">
				<caption class="sr-only">Fêtes de l’Almanach des Chiphres</caption>
				<thead class="border-b text-muted-foreground">
					<tr>
						<th scope="col" class="px-4 py-3 font-medium">Date pataphysique</th>
						<th scope="col" class="px-4 py-3 font-medium">Date grégorienne</th>
						<th scope="col" class="px-4 py-3 font-medium">Fête</th>
						<th scope="col" class="px-4 py-3 font-medium">Province</th>
					</tr>
				</thead>
				<tbody>
					{#each FEASTS as feast (feast.id)}
						<tr class="border-b last:border-b-0">
							<td class="serif px-4 py-3 whitespace-nowrap tabular-nums">
								{feast.day}
								{MONTH_NAMES[feast.monthIndex]}
							</td>
							<td class="px-4 py-3">{feast.gregorian}</td>
							<th scope="row" class="px-4 py-3 font-medium">
								{feast.name}
								{#if feast.id === todayFeastId}
									<span class="next-badge ml-2 rounded-full px-2 py-0.5 text-xs font-semibold">
										aujourd’hui
									</span>
								{:else if feast.id === nextFeast.id}
									<span class="next-badge ml-2 rounded-full px-2 py-0.5 text-xs font-semibold">
										prochaine
									</span>
								{/if}
							</th>
							<td class="px-4 py-3 text-muted-foreground">{feast.province ?? 'tout le Royaume'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- 6. Convertisseur -->
	<section aria-labelledby="almanach-convertir" class="flex flex-col gap-6">
		<div class="prose-almanach mx-auto max-w-2xl">
			<h2 id="almanach-convertir" class="serif">Convertir une date</h2>
			<p>
				Choisissez un jour du calendrier ordinaire ; l’Almanach vous dira lequel c’est dans le
				Royaume. Votre anniversaire, par exemple, a sans doute un nom plus intéressant que vous ne
				le pensiez.
			</p>
		</div>
		<AlmanachConverter initial={data.todayIso} {today} />
	</section>
</article>

<style>
	.serif {
		font-family: 'Lora', Georgia, 'Times New Roman', serif;
	}
	.eyebrow {
		font-size: 0.8rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
	.today {
		line-height: 1.1;
	}

	/* Halo du mois derrière la date du jour : fixe, purement décoratif */
	.hero-halo {
		position: absolute;
		inset: -30% 10% auto;
		height: 140%;
		border-radius: 9999px;
		filter: blur(60px);
		background: radial-gradient(circle at 30% 40%, var(--halo-1), transparent 60%),
			radial-gradient(circle at 70% 50%, var(--halo-2), transparent 60%),
			radial-gradient(circle at 50% 70%, var(--halo-3), transparent 60%);
	}
	/* Voile couleur carte entre le halo et le texte : contraste ≥ 4,5:1 (testé) */
	.hero-veil {
		border-radius: 1rem;
		padding: 1.25rem 1.5rem;
		background: color-mix(in srgb, var(--color-card) var(--veil), transparent);
	}
	.feast-pill {
		border-color: var(--ubu-stroke);
		background: color-mix(in srgb, var(--color-card) 70%, transparent);
	}

	.epigraph {
		color: var(--color-muted-foreground);
	}
	.prose-almanach {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		line-height: 1.7;
	}

	/* Cartes des mois : bandeau aux trois teintes du halo */
	.month-band {
		position: absolute;
		inset: 0 0 auto;
		height: 6px;
		background: linear-gradient(90deg, var(--m-1), var(--m-2), var(--m-3));
	}
	.month-card.is-current {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px var(--color-primary);
	}
	.month-card.is-current .month-band {
		height: 10px;
	}
	.current-badge,
	.next-badge {
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	.hors-mois {
		border-top: 6px solid var(--m-1);
	}
	.ubu-quote {
		margin-top: auto;
		border-left: 3px solid var(--color-primary);
		padding-left: 1rem;
	}
	.ubu-quote blockquote {
		font-style: italic;
	}
	.ubu-quote figcaption {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}
</style>
