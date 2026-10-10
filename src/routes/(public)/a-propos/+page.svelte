<!--
	« Chiphre, c'est quoi ? » — page de présentation destinée aux parents.

	Le texte est le « Manifeste public — version destinée aux parents » de
	docs/Chiphres/lore-pataphysique.md (section I), repris tel quel (apostrophes
	typographiques mises à part). L'exergue de Tristan Bernard en a été retirée
	(décision de David, 2026-10-06), remplacée par une citation d'Oscar Wilde
	choisie par David. N'ajouter ici aucun texte de lore absent du manifeste.

	`main p` et `main li` imposent leur taille (src/app.css, `!important`) : les
	textes plus petits ou plus grands que le corps passent par des `<div>`.
-->
<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
</script>

<SeoHead
	title="Chiphre, c’est quoi ? - Chiphre"
	description="Chiphre en quelques mots, pour les parents : un royaume imaginaire à traverser, les mathématiques rigoureuses des programmes officiels, sans publicité ni revente de données."
/>

<article class="mx-auto w-full max-w-[65ch] px-4 py-10 text-foreground sm:py-14">
	<header class="mb-8 flex flex-col gap-2">
		<h1 class="font-bold tracking-tight">Chiphre, c’est quoi ?</h1>
		<div class="text-base text-muted-foreground italic">les Chiphres de la Chandelle Verte</div>
	</header>

	<figure class="mb-10 flex flex-col gap-2 border-s-2 border-border ps-4">
		<blockquote>
			<div class="text-lg italic">
				«&nbsp;L’expérience est le nom que chacun donne à ses erreurs.&nbsp;»
			</div>
		</blockquote>
		<figcaption class="text-sm text-muted-foreground">
			— Oscar Wilde, <cite class="italic">L’Éventail de Lady Windermere</cite> (1892)
		</figcaption>
	</figure>

	<p class="mb-10">
		Apprendre les mathématiques peut faire peur. Le mot, la discipline, la note. Pourtant ce sont
		les mêmes enfants qui se plaisent à résoudre des énigmes, qui aiment dessiner de belles figures
		géométriques, et qui s’interrogent devant les paradoxes. La peur ne vient pas des mathématiques.
		Elle vient de la manière dont on les enseigne et de l’image que certains ont pu malheureusement
		en donner.
	</p>

	<section class="mb-10 flex flex-col gap-3" aria-labelledby="voyage">
		<h2 id="voyage" class="font-semibold">Le voyage Chiphre</h2>
		<p>
			Un royaume imaginaire. Des provinces à traverser. Des récompenses à empocher. Des défis à
			relever. Et derrière un décor qui invite au voyage, les mathématiques rigoureuses des
			programmes officiels, présentées de manière originale.
		</p>
	</section>

	<section class="mb-10 flex flex-col gap-3" aria-labelledby="serieux">
		<h2 id="serieux" class="font-semibold">Est-ce vraiment sérieux ?</h2>
		<p>
			Très sérieux. Chiphre s’inspire des œuvres d’<strong>Alfred Jarry</strong> (1873-1907),
			écrivain français, ainsi que de celles de <strong>Lewis Carroll</strong> (mathématicien à
			Oxford et auteur d’<em>Alice au pays des merveilles</em>) et de toute une tradition culturelle
			française — celle de Rabelais, de Cyrano de Bergerac, et plus récemment d’Alphonse Allais ou
			d’Erik Satie. Cinq siècles de pensée humaniste qui ont en commun de croire qu’on peut être à
			la fois rigoureux et s’amuser. Le ton de Chiphre est enjoué, farceur, mais ne cède en rien à
			la rigueur pédagogique.
		</p>
	</section>

	<section class="mb-10 flex flex-col gap-3" aria-labelledby="n-est-pas">
		<h2 id="n-est-pas" class="font-semibold">Ce que Chiphre n’est pas</h2>
		<ul class="flex list-disc flex-col gap-1.5 ps-6 marker:text-muted-foreground">
			<li>Un site de soutien scolaire classique.</li>
			<li>Un site avec de la publicité.</li>
			<li>Un service qui revend les données des familles.</li>
			<li>Un site qui promet de faire aimer les mathématiques en deux semaines.</li>
		</ul>
	</section>

	<section class="mb-10 flex flex-col gap-3" aria-labelledby="propose">
		<h2 id="propose" class="font-semibold">Ce que Chiphre propose</h2>
		<ul class="flex list-disc flex-col gap-1.5 ps-6 marker:text-muted-foreground">
			<li>Un suivi de progression personnalisé, accessible aux parents.</li>
			<li>Une préparation conforme au programme français.</li>
			<li>Conformité RGPD : l’utilisation de vos données personnelles est encadrée.</li>
			<li>Un décor savoureux ; une pédagogie rigoureuse.</li>
		</ul>
	</section>

	<div class="flex flex-col gap-3 border-t border-border pt-8">
		<p>
			Apprendre les mathématiques sans s’en rendre compte. Et peut-être s’en moquer un peu, en
			chemin.
		</p>
		<p><em>Bienvenue sur Chiphre.</em></p>
	</div>

	<footer class="mt-10 border-t border-border pt-6">
		<div class="text-sm text-muted-foreground italic">
			Chiphre est créé par un enseignant agrégé de Mathématiques et ingénieur en Informatique,
			passionné de littérature et d’illusionnisme.
		</div>
	</footer>
</article>
