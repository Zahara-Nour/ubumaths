<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	// =============================================================================
	// Domain restriction (Phase B): courbe(... sur ]a;b]) / courbe(... avec a<x<b)
	// =============================================================================

	const domainSurDsl = `f = courbe("y = x^2 sur [-2 ; 2]", couleur="bleu")`;

	const domainOpenClosedDsl = `f = courbe("y = x sur ]-1 ; 1[", couleur="bleu")
g = courbe("y = x^2 sur [-1 ; 1[", couleur="rouge")`;

	const domainAvecDsl = `unite_angle("radians")
f = courbe("y = sin(x) avec -3 < x <= 3", couleur="violet")`;

	const domainHalfOpenDsl = `f = courbe("y = x^2 avec x >= 0", couleur="orange")
g = courbe("y = -x^2 avec x < 0", couleur="vert")`;

	const domainSliderDsl = `a = slider(min=-5, max=0, valeur=-2)
b = slider(min=0, max=5, valeur=2)
f = courbe("y = x^2 sur [a ; b]", couleur="bleu")`;

	// =============================================================================
	// Piecewise — condition form (si)
	// =============================================================================

	const absSiDsl = `f = courbe("y = { -x si x < 0, x si x >= 0 }", couleur="bleu")`;

	const signSiDsl = `f = courbe("y = { -1 si x < 0, 0 si x = 0, 1 si x > 0 }", couleur="rouge")`;

	const compoundDsl = `f = courbe("y = { 1 si 0 < x < 5, 0 }", couleur="violet")`;

	// =============================================================================
	// Piecewise — interval form (sur)
	// =============================================================================

	const absSurDsl = `f = courbe("y = { -x sur ]-infini ; 0[, x^2 sur [0 ; +infini[ }", couleur="bleu")`;

	const stepDsl = `f = courbe("y = { -1 sur ]-infini ; -1[, 0 sur [-1 ; 1], 1 sur ]1 ; +infini[ }", couleur="orange")`;

	const piecewisePolynomialDsl = `f = courbe("y = { x^2 sur [-3 ; -1], 1 sur ]-1 ; 1[, x^2 sur [1 ; 3] }", couleur="vert")`;

	// =============================================================================
	// Piecewise — réactivité
	// =============================================================================

	const reactivePiecewiseDsl = `a = slider(min=-3, max=3, valeur=0)
f = courbe("y = { -x si x < a, x si x >= a }", couleur="rouge")`;

	const reactiveSurDsl = `b = slider(min=0.5, max=4, valeur=2)
f = courbe("y = { -x^2 sur ]-infini ; -b], x^2 sur ]-b ; b[, -x^2 sur [b ; +infini[ }", couleur="violet")`;
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="mt-4 mb-2 text-2xl font-bold">Restriction de domaine et fonctions par morceaux</h1>

	<p class="mb-6 text-muted-foreground">
		Tracé d'une fonction <code>y = f(x)</code> avec :
	</p>
	<ul class="mb-6 ml-6 list-disc text-muted-foreground">
		<li>
			<strong>Restriction de domaine</strong> via <code>sur ]a ; b]</code> ou
			<code>avec a &lt; x &lt;= b</code> (cercles ouverts/fermés aux bornes selon la convention scolaire).
		</li>
		<li>
			<strong>Fonctions par morceaux</strong> via <code>{`{ expr si cond, ... }`}</code> ou
			<code>{`{ expr sur ]a ; b[, ... }`}</code>. Premier morceau qui matche gagne (convention
			Desmos / GeoGebra).
		</li>
		<li>
			<strong>Bornes réactives</strong> dans tous les cas — un slider dans une borne ou une condition
			recalcule la courbe.
		</li>
	</ul>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Restriction de domaine</h2>

	<DslDemo
		dsl={domainSurDsl}
		title="y = x² sur [-2 ; 2]"
		description="Restriction par intervalle fermé. Les deux cercles pleins indiquent les bornes incluses."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={domainOpenClosedDsl}
		title="Bornes ouvertes vs fermées"
		description="]−1 ; 1[ produit deux cercles vides (bornes exclues). [-1 ; 1[ mélange : cercle plein à gauche, cercle vide à droite."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={domainAvecDsl}
		title="Forme inégalité — sin(x) avec −3 < x ≤ 3"
		description="Forme alternative équivalente à `sur ]-3 ; 3]`. Encadrement composé `a < x <= b` natif."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={domainHalfOpenDsl}
		title="Demi-droites — x ≥ 0 et x < 0"
		description="Restriction unilatérale. Le cercle apparaît seulement aux bornes finies (pas à l'infini)."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={domainSliderDsl}
		title="Bornes réactives — sliders a et b"
		description="Déplace les sliders : la fonction se redessine et les marqueurs aux extrémités suivent."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Fonctions par morceaux — forme « si »</h2>

	<DslDemo
		dsl={absSiDsl}
		title="|x| par morceaux"
		description="La valeur absolue exprimée comme piecewise. Conditions évaluées dans l'ordre — la première qui matche gagne."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={signSiDsl}
		title="Fonction signe — 3 morceaux"
		description="sign(x) avec un morceau par cas (négatif, zéro, positif). Saut visible à x = 0 dans le rendu."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={compoundDsl}
		title="Encadrement composé — 1 si 0 < x < 5, sinon 0"
		description="Chaîne de relations `0 < x < 5` parsée nativement. Le dernier morceau sans `si` est le défaut (otherwise)."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Fonctions par morceaux — forme « sur »</h2>

	<DslDemo
		dsl={absSurDsl}
		title="|x| par intervalles"
		description="Forme équivalente à la version `si`, mais avec des intervalles `]−∞ ; 0[` et `[0 ; +∞[` plus parlants pour des élèves."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={stepDsl}
		title="Fonction en escalier — 3 paliers"
		description="Trois paliers constants séparés par deux sauts à x = ±1. Le sampler détecte les discontinuités et split le path."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={piecewisePolynomialDsl}
		title="Polynomial par morceaux — paraboles + plateau"
		description="x² sur les deux côtés, plateau central. Composition typique en analyse scolaire (raccord continu en x = ±1)."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Piecewise réactif</h2>

	<DslDemo
		dsl={reactivePiecewiseDsl}
		title="Frontière mobile — slider a"
		description="Le slider `a` contrôle la position de la frontière entre les deux branches. La courbe se recompose dynamiquement."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={reactiveSurDsl}
		title="Trois branches symétriques — slider b"
		description="Slider sur la borne commune des trois branches. Démontre la combinaison interval form + réactivité."
		width={700}
		height={500}
	/>
</div>
