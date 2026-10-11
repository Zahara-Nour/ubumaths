<script lang="ts">
	/**
	 * Une vue de présentation (élèves, parents ou professeurs) : Père Ubu et un titre, puis
	 * des blocs courts, une démonstration en direct, les portes d'entrée. Le contenu vit dans
	 * `$lib/kingdom-tour/views`.
	 *
	 * Lisible sans JavaScript : la roue des publics s'y ajoute en bas à droite, et les mêmes
	 * choix restent en liens ordinaires au pied de la page.
	 */
	import { resolve } from '$app/paths';
	import {
		BookOpen,
		Calculator,
		CalendarDays,
		Check,
		Crown,
		FlaskConical,
		Gamepad2,
		KeyRound,
		Laugh,
		LayoutDashboard,
		ListChecks,
		ListOrdered,
		MousePointerClick,
		Newspaper,
		Printer,
		Repeat,
		Terminal,
		Trophy
	} from '@lucide/svelte';
	import type { MonthPalette } from '$lib/almanach/palettes';
	import AudienceWheel from '$lib/components/kingdom-tour/AudienceWheel.svelte';
	import CipherDemo from '$lib/components/kingdom-tour/CipherDemo.svelte';
	import FormDemo from '$lib/components/kingdom-tour/FormDemo.svelte';
	import PereUbuFigure from '$lib/components/kingdom-tour/PereUbuFigure.svelte';
	import { AUDIENCES } from '$lib/kingdom-tour/audiences';
	import type { AudienceView, ViewIcon } from '$lib/kingdom-tour/views';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Types

	interface Props {
		view: AudienceView;
		ambiance: MonthPalette;
	}

	// Constantes

	const ICONS: Record<ViewIcon, typeof Check> = {
		automaths: ListChecks,
		atelier: FlaskConical,
		'cabinet-noir': KeyRound,
		games: Gamepad2,
		upsilon: Calculator,
		python: Terminal,
		glossary: BookOpen,
		shtam: Newspaper,
		almanach: CalendarDays,
		zygomatics: Laugh,
		cabinet: LayoutDashboard,
		tutor: Crown,
		review: Repeat,
		rewards: Trophy,
		steps: ListOrdered,
		words: MousePointerClick,
		printable: Printer
	};

	// Variables

	let { view, ambiance }: Props = $props();
	const others = $derived(AUDIENCES.filter((audience) => audience.id !== view.id));
</script>

<SeoHead title={view.seoTitle} description={view.seoDescription} />

<div class="view">
	<section class="hero" aria-labelledby="view-title">
		<div class="wrap hero-grid">
			<div class="hero-text">
				<span class="kicker">{view.kicker}</span>
				<h1 id="view-title" class="hero-title">{view.title}</h1>
				<p class="lede">{view.lede}</p>
			</div>
			<div class="hero-ubu">
				<PereUbuFigure {ambiance} size="clamp(9rem, 22vw, 13rem)" />
			</div>
		</div>
	</section>

	{#each view.blocks as block, b (block.id)}
		<section
			id={block.id}
			class="section"
			class:alt={b % 2 === 0}
			aria-labelledby="{block.id}-title"
		>
			<div class="wrap">
				<h2 id="{block.id}-title">{block.title}</h2>
				{#if block.text}
					<p class="text">{block.text}</p>
				{/if}

				{#if block.items}
					<ul class="items" class:two={block.items.length % 2 === 0 && block.items.length < 5}>
						{#each block.items as item (item.title)}
							{@const Icon = ICONS[item.icon]}
							<li class="item" class:link={!!item.href}>
								<span class="icon" aria-hidden="true"><Icon size={24} /></span>
								<div class="item-body">
									<h3>
										{#if item.href}
											<a href={item.href} class="stretched">{item.title}</a>
										{:else}
											{item.title}
										{/if}
									</h3>
									<p class="item-text">{item.text}</p>
								</div>
							</li>
						{/each}
					</ul>
				{/if}

				{#if block.facts}
					<ul class="facts">
						{#each block.facts as fact (fact)}
							<li><Check size={18} aria-hidden="true" />{fact}</li>
						{/each}
					</ul>
				{/if}

				{#if block.demo === 'form'}
					<div class="panel"><FormDemo /></div>
				{:else if block.demo === 'cipher'}
					<div class="panel"><CipherDemo /></div>
				{/if}

				{#if block.links}
					<p class="links">
						{#each block.links as link (link.href)}
							<a href={link.href}>{link.label}</a>
						{/each}
					</p>
				{/if}
			</div>
		</section>
	{/each}

	<section class="section final" aria-label="Entrer">
		<div class="wrap narrow final-body">
			<div class="calls">
				{#each view.calls as call, i (call.href)}
					<a href={call.href} class="call" class:primary={i === 0}>{call.label}</a>
				{/each}
			</div>
			<!-- Les autres vues, en liens ordinaires (sans JavaScript, la roue ne s'ouvre pas) -->
			<nav class="others" aria-label="Les autres visites">
				<span>Vous êtes plutôt :</span>
				{#each others as audience (audience.id)}
					<a href={resolve(audience.href)}>{audience.label}</a>
				{/each}
			</nav>
		</div>
	</section>
</div>

<AudienceWheel current={view.id} />

<style lang="postcss">
	@reference "../../../app.css";

	/* Orange brûlé en clair : l'orange du thème est à 2,2:1 sur fond clair (audit du Tour) */
	.view {
		--accent-text: #8f4000;
	}
	:global(.dark) .view {
		--accent-text: var(--color-primary);
	}

	.wrap {
		@apply mx-auto w-full max-w-6xl px-4 sm:px-6;
	}
	.wrap.narrow {
		@apply max-w-3xl;
	}
	.section {
		@apply py-12 sm:py-16;
	}
	.section.alt {
		@apply bg-muted/40;
	}

	/* `main h1/h2/h3/p` imposent leur taille (app.css) : une classe l'emporte, en gardant
	   l'échelle A−/A+ */
	.hero {
		@apply py-10 sm:py-14;
	}
	.hero-grid {
		@apply grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto];
	}
	.hero-text {
		@apply flex flex-col gap-4;
	}
	.kicker {
		@apply font-semibold tracking-[0.18em] uppercase;
		color: var(--accent-text);
		font-size: calc(0.875rem * var(--font-scale, 1));
	}
	.hero-title {
		font-size: calc(clamp(2rem, 1.2rem + 3.4vw, 3.5rem) * var(--font-scale, 1)) !important;
		line-height: 1.08 !important;
		@apply font-bold tracking-tight text-balance;
	}
	.lede {
		@apply text-foreground/80;
		font-size: calc(1.25rem * var(--font-scale, 1)) !important;
		line-height: 1.5 !important;
	}
	.hero-ubu {
		@apply flex justify-center;
	}
	h2 {
		font-size: calc(clamp(1.5rem, 1.1rem + 1.6vw, 2.25rem) * var(--font-scale, 1)) !important;
		line-height: 1.2 !important;
		@apply mb-4 font-bold text-balance;
	}
	.text {
		@apply max-w-3xl text-foreground/80;
		font-size: calc(1.125rem * var(--font-scale, 1)) !important;
		line-height: 1.6 !important;
	}

	/* Les cartes : icône, titre, une phrase ; toute la carte est cliquable si elle mène quelque part */
	.items {
		@apply mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3;
	}
	.items.two {
		@apply lg:grid-cols-2;
	}
	.item {
		@apply relative flex min-w-0 gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm;
	}
	.item.link {
		@apply transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg;
	}
	.item:has(:focus-visible) {
		@apply ring-2 ring-foreground ring-offset-2;
	}
	.icon {
		@apply grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-foreground;
	}
	.item-body {
		@apply flex min-w-0 flex-col gap-1;
	}
	.item h3 {
		font-size: calc(1.125rem * var(--font-scale, 1)) !important;
		line-height: 1.3 !important;
		@apply font-semibold;
	}
	.stretched {
		@apply focus-visible:outline-none;
	}
	.stretched::after {
		content: '';
		@apply absolute inset-0 rounded-2xl;
	}
	.item-text {
		@apply text-foreground/75;
		font-size: calc(0.9375rem * var(--font-scale, 1)) !important;
		line-height: 1.5 !important;
	}

	.facts {
		@apply mt-2 flex flex-col gap-2;
	}
	.facts li {
		@apply flex items-start gap-2;
	}
	.facts :global(svg) {
		@apply mt-1 shrink-0;
		color: var(--accent-text);
	}

	/* minmax : le César (ligne sans retour) défile dans son cadre au lieu d'élargir la page */
	.panel {
		@apply mt-6 grid max-w-3xl min-w-0 grid-cols-[minmax(0,1fr)] rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6;
	}

	.links {
		@apply mt-4 flex flex-wrap gap-x-6 gap-y-2;
	}
	.links a,
	.others a {
		@apply inline-flex min-h-11 items-center rounded-sm font-medium underline decoration-primary decoration-2 underline-offset-4 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none;
	}

	.final-body {
		@apply flex flex-col items-center gap-8 text-center;
	}
	.calls {
		@apply flex flex-wrap justify-center gap-3;
	}
	.call {
		@apply inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-foreground/50 bg-card px-5 py-2.5 font-semibold transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:outline-none;
	}
	.call.primary {
		@apply border-primary bg-primary text-primary-foreground;
	}
	.others {
		@apply flex flex-wrap items-center justify-center gap-x-4 text-foreground/75;
	}

	@media (prefers-reduced-motion: reduce) {
		.item.link,
		.call {
			@apply transition-none hover:translate-y-0;
		}
	}
</style>
