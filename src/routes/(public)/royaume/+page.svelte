<script lang="ts">
	/**
	 * Le Tour du Royaume : la page de présentation de Chiphre (décisions de David,
	 * 2026-10-11 ; journal `docs/wip/tour-du-royaume-progress.md`).
	 *
	 * Une visite guidée par Père Ubu : le Royaume et ses six Provinces, les lieux qui
	 * s'ouvrent sans compte, la rigueur sous le décor, la dépêche du jour, un mot aux
	 * parents, et les portes pour entrer. Le contenu vit dans `$lib/kingdom-tour/tour` ;
	 * ce qu'on peut promettre, dans `docs/systeme/carte-des-fonctionnalites.md`.
	 *
	 * Tout est rendu côté serveur et lisible sans JavaScript ; les animations ne font que
	 * s'y ajouter, et s'effacent quand l'élève demande moins d'animations.
	 */
	import { resolve } from '$app/paths';
	import {
		ArrowDown,
		ArrowRight,
		BookOpen,
		Calculator,
		CalendarDays,
		Check,
		Crown,
		FlaskConical,
		Gamepad2,
		KeyRound,
		Laugh,
		ListChecks,
		ListOrdered,
		Lock,
		MousePointerClick,
		Newspaper,
		Printer,
		Repeat,
		ShieldCheck,
		Terminal
	} from '@lucide/svelte';
	import { MONTH_PALETTES } from '$lib/almanach/palettes';
	import PereUbuFigure from '$lib/components/kingdom-tour/PereUbuFigure.svelte';
	import ProvinceMap from '$lib/components/kingdom-tour/ProvinceMap.svelte';
	import FormDemo from '$lib/components/kingdom-tour/FormDemo.svelte';
	import CipherDemo from '$lib/components/kingdom-tour/CipherDemo.svelte';
	import { reveal } from '$lib/kingdom-tour/reveal';
	import { buildSpiral } from '$lib/kingdom-tour/spiral';
	import {
		FINAL_CALLS,
		HERO_CALLS,
		PARENT_FACTS,
		PARENT_LINKS,
		PLACES,
		STRENGTHS,
		type PlaceId,
		type StrengthId
	} from '$lib/kingdom-tour/tour';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import type { PageProps } from './$types';

	// Constantes

	const PLACE_ICONS: Record<PlaceId, typeof ListChecks> = {
		automaths: ListChecks,
		atelier: FlaskConical,
		'cabinet-noir': KeyRound,
		games: Gamepad2,
		upsilon: Calculator,
		python: Terminal,
		glossary: BookOpen,
		shtam: Newspaper,
		almanach: CalendarDays,
		zygomatics: Laugh
	};

	const STRENGTH_ICONS: Record<StrengthId, typeof ListChecks> = {
		steps: ListOrdered,
		'two-corrections': Check,
		'clickable-words': MousePointerClick,
		printable: Printer,
		'spaced-review': Repeat,
		tutor: Crown
	};

	/** La gidouille qui tourne derrière les portes de la fin (décor) */
	const GIDOUILLE = buildSpiral({
		size: 200,
		turns: 3.5,
		innerRadius: 3,
		outerRadius: 96,
		stops: 0
	});

	const FEATURED = PLACES.filter((place) => place.featured);
	const OTHERS = PLACES.filter((place) => !place.featured);

	// Variables

	let { data }: PageProps = $props();

	// Le serveur choisit le mois du jour (Paris), comme pour l'accueil
	const ambiance = $derived(MONTH_PALETTES[data.ambianceMonth]);

	// Functions

	/** « Commencer la visite » : défilement doux, sauf si l'élève demande moins d'animations */
	function startTour(event: MouseEvent) {
		const target = document.getElementById('provinces');
		if (!target) return;
		event.preventDefault();
		const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
	}
</script>

<SeoHead
	title="Le Tour du Royaume — Chiphre"
	description="Visite Chiphre, le Royaume du Père Ubu : six Provinces pour les grands domaines des maths, Automaths, l’Atelier, le Cabinet Noir, des jeux et Python. Presque tout s’ouvre sans compte."
/>

<div
	class="tour"
	style:--glow-1-light={ambiance.light.h1}
	style:--glow-2-light={ambiance.light.h2}
	style:--glow-3-light={ambiance.light.h3}
	style:--glow-1-dark={ambiance.dark.h1}
	style:--glow-2-dark={ambiance.dark.h2}
	style:--glow-3-dark={ambiance.dark.h3}
>
	<!-- Avancement de la lecture (navigateurs qui savent lier une animation au défilement) -->
	<div class="reading" aria-hidden="true"></div>

	<!-- Ouverture : la voix de Père Ubu -->
	<section class="hero" aria-labelledby="tour-title">
		<div class="aurora" aria-hidden="true"><span></span><span></span><span></span></div>
		<div class="wrap hero-grid">
			<div class="hero-text">
				<span class="kicker">Chiphre · le Tour du Royaume</span>
				<h1 id="tour-title" class="hero-title">
					Bienvenue au Royaume de Pologne, <em>c’est-à-dire nulle part.</em>
				</h1>
				<span class="lede">
					Chiphre est l’Académie Pataphysique des Chiphres, sise au Royaume de Pologne. On y fait
					des maths du collège au lycée, pour de vrai, dans un décor qui ne l’est pas du tout.
				</span>
				<div class="calls">
					<a href={HERO_CALLS[0].href} class="call primary" onclick={startTour}>
						{HERO_CALLS[0].label}
						<ArrowDown size={18} aria-hidden="true" />
					</a>
					<a href={HERO_CALLS[1].href} class="call">{HERO_CALLS[1].label}</a>
				</div>
				<span class="today">
					Au Royaume, nous sommes le
					<a href={resolve('/(public)/almanach')}>{data.almanachDate}</a>.
				</span>
			</div>
			<div class="hero-ubu">
				<span class="bubble">
					Cornegidouille, un visiteur&nbsp;! Suis-Nous, Galopin&nbsp;: Nous allons te faire visiter
					Notre Royaume.
				</span>
				<PereUbuFigure {ambiance} label="Père Ubu, Roi de Pologne" />
			</div>
		</div>
	</section>

	<!-- Le Royaume : les six Provinces -->
	<section id="provinces" class="section" aria-labelledby="provinces-title">
		<div class="wrap">
			<header class="section-head" use:reveal>
				<span class="kicker">Le Royaume</span>
				<h2 id="provinces-title">Six Provinces, un Royaume</h2>
				<span class="intro">
					Le Royaume compte six Provinces, une par grand domaine des maths, chacune avec son
					gouverneur, sa capitale et sa devise. Elles s’enroulent autour de Sandomir, la ville en
					spirale, et du Trône Royal en son centre.
				</span>
			</header>
			<ProvinceMap />
		</div>
	</section>

	<!-- Les lieux : tout ce qui s'ouvre sans compte -->
	<section id="lieux" class="section alt" aria-labelledby="lieux-title">
		<div class="wrap">
			<header class="section-head" use:reveal>
				<span class="kicker">Sans compte</span>
				<h2 id="lieux-title">Les lieux à visiter</h2>
				<span class="intro">Tout ce qui suit s’ouvre sans compte. Entre, essaie, recommence.</span>
			</header>

			<div class="featured">
				{#each FEATURED as place, i (place.id)}
					{@const Icon = PLACE_ICONS[place.id]}
					<article class="place big" use:reveal={i * 90}>
						<span class="icon"><Icon size={28} aria-hidden="true" /></span>
						<h3><a href={place.href} class="stretched">{place.title}</a></h3>
						<span class="tagline">{place.tagline}</span>
						<span class="description">{place.description}</span>
						<span class="enter" aria-hidden="true">Entrer <ArrowRight size={16} /></span>
					</article>
				{/each}
			</div>

			<div class="others">
				{#each OTHERS as place, i (place.id)}
					{@const Icon = PLACE_ICONS[place.id]}
					<article class="place" use:reveal={(i % 3) * 80}>
						<span class="icon small"><Icon size={22} aria-hidden="true" /></span>
						<div class="place-body">
							<h3><a href={place.href} class="stretched">{place.title}</a></h3>
							<span class="tagline">{place.tagline}</span>
							<span class="description">{place.description}</span>
						</div>
					</article>
				{/each}
			</div>
		</div>
	</section>

	<!-- Sous le décor, la rigueur -->
	<section id="rigueur" class="section" aria-labelledby="rigueur-title">
		<div class="wrap">
			<header class="section-head" use:reveal>
				<span class="kicker">Sous le décor</span>
				<h2 id="rigueur-title">Un décor savoureux, une pédagogie rigoureuse</h2>
				<span class="intro"> Les maths, elles, ne sont jamais pataphysiques. Essaie plutôt. </span>
			</header>

			<div class="demos">
				<div class="panel" use:reveal>
					<h3>La forme compte</h3>
					<span class="panel-intro">
						Une réponse juste mais mal écrite n’est pas une réponse finie. Choisis une réponse : le
						correcteur de Chiphre te dit ce qu’il en pense.
					</span>
					<FormDemo />
				</div>
				<div class="panel" use:reveal={120}>
					<h3>Le Cabinet Noir, en direct</h3>
					<span class="panel-intro">
						Écris un message : le chiffre de César le rend illisible, lettre par lettre.
					</span>
					<CipherDemo />
				</div>
			</div>

			<ul class="strengths">
				{#each STRENGTHS as strength, i (strength.id)}
					{@const Icon = STRENGTH_ICONS[strength.id]}
					<li class="strength" use:reveal={(i % 3) * 80}>
						<span class="icon small"><Icon size={22} aria-hidden="true" /></span>
						<div>
							<h3>{strength.title}</h3>
							<span class="description">{strength.text}</span>
							{#if strength.access === 'account'}
								<span class="badge-account"
									><Lock size={12} aria-hidden="true" /> Avec ton compte</span
								>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<!-- La dépêche du jour : la voix de la Rédaction du Shtam -->
	{#if data.shtam}
		<section id="shtam" class="section alt" aria-labelledby="shtam-title">
			<div class="wrap narrow">
				<header class="section-head" use:reveal>
					<span class="kicker">La dépêche du jour</span>
					<h2 id="shtam-title">Le Shtam</h2>
					<span class="intro">
						La gazette du Royaume. Ses nouvelles sont toutes fausses ; le vrai du faux, à la fin de
						chaque article, ne l’est jamais.
					</span>
				</header>
				<article class="dispatch" data-testid="tour-shtam" use:reveal>
					<span class="masthead">Le Shtam</span>
					<h3>{data.shtam.title}</h3>
					<span class="dispatch-lede">{data.shtam.lede}</span>
					<span class="byline">{data.shtam.byline}</span>
					<div class="dispatch-links">
						<a
							href={resolve('/(public)/shtam/[slug]', { slug: data.shtam.slug })}
							class="call primary"
						>
							Lire la dépêche
						</a>
						<a href={resolve('/(public)/shtam')} class="call">Toute la gazette</a>
					</div>
				</article>
			</div>
		</section>
	{/if}

	<!-- Pour les parents : vouvoiement -->
	<section id="parents" class="section" aria-labelledby="parents-title">
		<div class="wrap narrow">
			<div class="parents" use:reveal>
				<span class="icon"><ShieldCheck size={28} aria-hidden="true" /></span>
				<div class="parents-body">
					<span class="kicker">Pour les parents</span>
					<h2 id="parents-title">Des élèves mineurs : la prudence est la règle</h2>
					<ul class="facts">
						{#each PARENT_FACTS as fact (fact)}
							<li><Check size={18} aria-hidden="true" /> {fact}</li>
						{/each}
					</ul>
					<div class="parent-links">
						{#each PARENT_LINKS as link (link.href)}
							<a href={link.href}>{link.label} <span aria-hidden="true">→</span></a>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Entrer : la voix de Père Ubu -->
	<section id="entrer" class="section final" aria-labelledby="entrer-title">
		<svg class="gidouille" viewBox="0 0 200 200" aria-hidden="true">
			<path d={GIDOUILLE.d} />
		</svg>
		<div class="wrap narrow final-body" use:reveal>
			<h2 id="entrer-title">Entre dans le Royaume</h2>
			<span class="ubu-says">
				« De par ma chandelle verte, Galopin, qu’attends-tu&nbsp;? »
				<span class="who">— Père Ubu</span>
			</span>
			<div class="calls center">
				{#each FINAL_CALLS as call, i (call.href)}
					<a href={call.href} class="call" class:primary={i === 0}>{call.label}</a>
				{/each}
			</div>
		</div>
	</section>
</div>

<style lang="postcss">
	@reference "../../../app.css";

	/* Ambiance du mois (Almanach), comme le halo de l'accueil : teintes claires et sombres
	   séparées, choisies par la classe .dark (light-dark() relu dans un @keyframes casse Safari) */
	.tour {
		--glow-1: var(--glow-1-light);
		--glow-2: var(--glow-2-light);
		--glow-3: var(--glow-3-light);
		@apply relative;
	}
	:global(.dark) .tour {
		--glow-1: var(--glow-1-dark);
		--glow-2: var(--glow-2-dark);
		--glow-3: var(--glow-3-dark);
	}

	.wrap {
		@apply mx-auto w-full max-w-6xl px-4 sm:px-6;
	}
	.wrap.narrow {
		@apply max-w-4xl;
	}
	.section {
		@apply py-16 sm:py-24;
		scroll-margin-top: 1rem;
	}
	.section.alt {
		@apply bg-muted/40;
	}

	/* Titres : `main h1/h2` imposent leur taille (app.css) ; une classe l'emporte,
	   en gardant l'échelle A−/A+ */
	.hero-title {
		font-size: calc(clamp(2.25rem, 1.2rem + 4.2vw, 4.25rem) * var(--font-scale, 1)) !important;
		line-height: 1.05 !important;
		@apply font-bold tracking-tight text-balance;
	}
	.hero-title em {
		@apply text-primary;
	}
	h2 {
		font-size: calc(clamp(1.75rem, 1.1rem + 2.4vw, 2.75rem) * var(--font-scale, 1)) !important;
		line-height: 1.15 !important;
		@apply font-bold text-balance;
	}
	.kicker {
		@apply text-sm font-semibold tracking-[0.18em] text-primary uppercase;
	}
	.section-head {
		@apply mb-10 flex max-w-3xl flex-col gap-3 sm:mb-14;
	}
	.intro,
	.lede {
		@apply text-lg text-muted-foreground;
	}

	/* Avancement de la lecture : barre fine, liée au défilement de <main> */
	.reading {
		@apply pointer-events-none sticky top-0 z-30 -mb-[3px] hidden h-[3px] origin-left bg-primary;
	}
	@supports (animation-timeline: scroll()) {
		.reading {
			display: block;
			animation: lecture linear both;
			animation-timeline: scroll(nearest block);
		}
	}
	@keyframes lecture {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}

	/* Ouverture */
	.hero {
		@apply relative isolate overflow-hidden py-14 sm:py-20 lg:py-24;
	}
	.aurora span {
		@apply absolute -z-10 rounded-full blur-3xl;
		animation: derive 18s ease-in-out infinite alternate;
	}
	.aurora span:nth-child(1) {
		@apply top-[-10%] left-[-10%] h-[28rem] w-[28rem];
		background-color: var(--glow-1);
	}
	.aurora span:nth-child(2) {
		@apply top-[20%] right-[-12%] h-[24rem] w-[24rem];
		background-color: var(--glow-2);
		animation-duration: 22s;
		animation-delay: -6s;
	}
	.aurora span:nth-child(3) {
		@apply bottom-[-20%] left-[30%] h-[22rem] w-[22rem];
		background-color: var(--glow-3);
		animation-duration: 26s;
		animation-delay: -12s;
	}
	@keyframes derive {
		to {
			transform: translate(6%, 8%) scale(1.15);
		}
	}
	.hero-grid {
		@apply grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)];
	}
	.hero-text {
		@apply flex flex-col items-start gap-5;
	}
	.today {
		@apply text-sm text-muted-foreground;
	}
	.today a {
		@apply rounded-sm font-medium text-foreground italic underline decoration-primary underline-offset-4 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
	}
	.hero-ubu {
		@apply flex flex-col items-center gap-4;
		--ubu-size: clamp(10rem, 30vw, 17rem);
	}
	.bubble {
		@apply relative max-w-xs rounded-2xl border border-border bg-card px-4 py-3 text-center shadow-md;
		font-family: 'Lora', Georgia, serif;
		animation: bulle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both;
	}
	.bubble::after {
		content: '';
		@apply absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-r border-b border-border bg-card;
	}
	@keyframes bulle {
		from {
			opacity: 0;
			transform: translateY(0.75rem) scale(0.9);
		}
	}

	/* Boutons */
	.calls {
		@apply flex flex-wrap gap-3;
	}
	.calls.center {
		@apply justify-center;
	}
	.call {
		@apply inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-foreground/15 bg-card px-5 py-2.5 font-semibold transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none;
	}
	.call.primary {
		@apply border-primary bg-primary text-primary-foreground;
	}

	/* Lieux */
	.featured {
		@apply grid gap-5 md:grid-cols-3;
	}
	.others {
		@apply mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3;
	}
	.place {
		@apply relative flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg;
	}
	.place:focus-within {
		@apply ring-2 ring-ring;
	}
	.place.big {
		@apply flex-col overflow-hidden p-6;
	}
	.place.big::before {
		content: '';
		@apply absolute -top-16 -right-16 -z-0 h-40 w-40 rounded-full opacity-70 blur-2xl transition-opacity duration-500;
		background-color: var(--glow-1);
	}
	.place.big:hover::before {
		@apply opacity-100;
	}
	/* Le dernier lieu, seul sur sa ligne, en bandeau (2 colonnes, puis 3) */
	@media (min-width: 640px) and (max-width: 1023.98px) {
		.others .place:last-child:nth-child(odd) {
			grid-column: span 2;
		}
	}
	@media (min-width: 1024px) {
		.others .place:last-child:nth-child(3n + 1) {
			grid-column: span 3;
		}
	}
	.place h3 {
		font-size: calc(1.25rem * var(--font-scale, 1)) !important;
		line-height: 1.3 !important;
	}
	.place.big h3 {
		font-size: calc(1.5rem * var(--font-scale, 1)) !important;
	}
	/* Toute la carte est cliquable ; le lien, lui, ne porte que le titre */
	.stretched {
		@apply focus-visible:outline-none;
	}
	.stretched::after {
		content: '';
		@apply absolute inset-0 z-10 rounded-2xl;
	}
	.place-body {
		@apply flex flex-col gap-1;
	}
	.tagline {
		font-family: 'Lora', Georgia, serif;
		@apply text-foreground/80 italic;
	}
	.description {
		@apply text-sm text-muted-foreground;
	}
	.enter {
		@apply mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-primary;
	}
	.icon {
		@apply relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-foreground;
	}
	.icon.small {
		@apply h-11 w-11 rounded-xl;
	}

	/* Rigueur */
	.demos {
		@apply grid gap-6 lg:grid-cols-2;
	}
	.panel {
		@apply flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6;
	}
	.panel h3 {
		font-size: calc(1.375rem * var(--font-scale, 1)) !important;
	}
	.panel-intro {
		@apply text-muted-foreground;
	}
	.strengths {
		@apply mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3;
	}
	.strength {
		@apply flex gap-4;
	}
	.strength h3 {
		font-size: calc(1.125rem * var(--font-scale, 1)) !important;
	}
	.strength .description {
		@apply block;
	}
	.badge-account {
		@apply mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground;
	}

	/* La dépêche */
	.dispatch {
		@apply flex flex-col gap-3 rounded-sm border-t-4 border-b border-foreground bg-card px-5 py-6 shadow-sm sm:px-8;
	}
	.masthead {
		font-family: 'Lora', Georgia, serif;
		@apply border-b border-border pb-2 text-center text-sm font-bold tracking-[0.4em] uppercase;
	}
	.dispatch h3 {
		font-size: calc(clamp(1.375rem, 1rem + 1.2vw, 1.875rem) * var(--font-scale, 1)) !important;
		line-height: 1.2 !important;
	}
	.dispatch-lede {
		font-family: 'Lora', Georgia, serif;
		@apply text-lg;
	}
	.byline {
		@apply text-sm text-muted-foreground italic;
	}
	.dispatch-links {
		@apply mt-2 flex flex-wrap gap-3;
	}

	/* Parents */
	.parents {
		@apply flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:p-8;
	}
	.parents-body {
		@apply flex flex-col gap-4;
	}
	.parents h2 {
		font-size: calc(clamp(1.5rem, 1rem + 1.5vw, 2rem) * var(--font-scale, 1)) !important;
	}
	.facts {
		@apply flex flex-col gap-2;
	}
	.facts li {
		@apply flex items-start gap-2;
	}
	.facts :global(svg) {
		@apply mt-0.5 shrink-0 text-primary;
	}
	.parent-links {
		@apply flex flex-wrap gap-x-6 gap-y-2;
	}
	.parent-links a {
		@apply rounded-sm font-medium underline decoration-primary decoration-2 underline-offset-4 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
	}

	/* Entrer */
	.final {
		@apply relative isolate overflow-hidden text-center;
	}
	.final-body {
		@apply flex flex-col items-center gap-6;
	}
	.ubu-says {
		font-family: 'Lora', Georgia, serif;
		@apply text-xl italic sm:text-2xl;
	}
	.who {
		@apply mt-1 block text-base text-muted-foreground not-italic;
	}
	.gidouille {
		@apply absolute top-1/2 left-1/2 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 opacity-15;
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 6;
		stroke-linecap: round;
		animation: tourbillon 60s linear infinite;
	}
	@keyframes tourbillon {
		to {
			rotate: 360deg;
		}
	}

	/* Apparition au défilement (attachment `reveal`) */
	.tour :global([data-reveal]) {
		transition:
			opacity 0.7s ease,
			translate 0.7s cubic-bezier(0.22, 1, 0.36, 1);
		transition-delay: var(--reveal-delay, 0ms);
	}
	.tour :global([data-reveal='pending']) {
		opacity: 0;
		translate: 0 1.5rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.aurora span,
		.bubble,
		.gidouille {
			animation: none;
		}
		.place,
		.call {
			@apply transition-none hover:translate-y-0;
		}
	}
	@media print {
		.tour :global([data-reveal='pending']) {
			opacity: 1;
			translate: none;
		}
	}
</style>
