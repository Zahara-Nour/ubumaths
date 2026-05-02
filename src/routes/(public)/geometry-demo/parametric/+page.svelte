<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	const circleDsl = `c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=2*pi, couleur="bleu")`;

	const parabolaDsl = `c = courbe("x = t", "y = t^2", t_min=-2, t_max=2, couleur="rouge")`;

	const cardioidDsl = `c = courbe("x = (1 - cos(t)) * cos(t)", "y = (1 - cos(t)) * sin(t)", t_min=0, t_max=2*pi, couleur="violet")`;

	const lissajousDsl = `c1 = courbe("x = sin(3*t)", "y = sin(2*t)", t_min=0, t_max=2*pi, couleur="bleu")
c2 = courbe("x = sin(4*t)", "y = sin(3*t)", t_min=0, t_max=2*pi, couleur="rouge")
c3 = courbe("x = sin(5*t)", "y = sin(4*t)", t_min=0, t_max=2*pi, couleur="vert")`;

	const cycloidDsl = `c = courbe("x = t - sin(t)", "y = 1 - cos(t)", t_min=0, t_max=4*pi, couleur="orange")`;

	const archimedeanSpiralDsl = `c = courbe("x = t * cos(t)", "y = t * sin(t)", t_min=0, t_max=6*pi, couleur="cyan")`;

	const sliderTmaxDsl = `s = slider(min=0.1, max=2*pi, valeur=pi)
c = courbe("x = cos(t)", "y = sin(t)", t_min=0, t_max=s, couleur="bleu")`;

	const sliderRadiusDsl = `r = slider(min=0.5, max=4, valeur=2)
c = courbe("x = r * cos(t)", "y = r * sin(t)", t_min=0, t_max=2*pi, param="t", couleur="rouge")`;

	const closedFillDsl = `c = courbe("x = 2 * cos(t)", "y = sin(t)", t_min=0, t_max=2*pi, couleur="violet", remplissage="violet")`;
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="mt-4 mb-8 text-2xl font-bold">Courbes paramétriques — geometry-core</h1>

	<p class="mb-6 text-muted-foreground">
		Tracé d'une courbe t → (x(t), y(t)) via le builtin <code>courbe()</code> avec deux équations
		<code>"x = ..."</code> et <code>"y = ..."</code>. Le paramètre est auto-détecté ; les bornes
		<code>t_min</code> et <code>t_max</code> peuvent référencer un slider pour animer le tracé.
	</p>

	<hr class="my-8" />

	<DslDemo
		dsl={circleDsl}
		title="Cercle — (cos t, sin t)"
		description="La courbe paramétrique la plus classique. Détection automatique de courbe fermée."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={parabolaDsl}
		title="Parabole — (t, t²)"
		description="Forme paramétrique de y = x². Sampling adaptatif via ‖vitesse‖."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={cardioidDsl}
		title="Cardioïde — (1 − cos t)·(cos t, sin t)"
		description="Forme polaire r = 1 − cos θ exprimée en paramétrique."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={lissajousDsl}
		title="Courbes de Lissajous — (sin nt, sin mt)"
		description="Trois ratios de fréquences (3:2, 4:3, 5:4). Densité d'échantillonnage plus élevée dans les régions à forte courbure."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={cycloidDsl}
		title="Cycloïde — (t − sin t, 1 − cos t)"
		description="Trajectoire d'un point d'un cercle qui roule sans glisser sur une droite."
		width={700}
		height={500}
		center={{ x: 6, y: 1 }}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={archimedeanSpiralDsl}
		title="Spirale d'Archimède — (t cos t, t sin t)"
		description="r = t en polaire. Sampling dense près de l'origine, plus large vers l'extérieur."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={sliderTmaxDsl}
		title="Tracé animé — slider sur t_max"
		description="Déplace le slider pour faire varier t_max de 0 à 2π : la courbe se construit progressivement et bascule en courbe fermée à 2π."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={sliderRadiusDsl}
		title="Coefficient dynamique — slider dans x(t), y(t)"
		description="Le rayon r est contrôlé par un slider ; toutes les courbes paramétriques se redessinent quand le slider bouge."
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={closedFillDsl}
		title="Courbe fermée — remplissage"
		description="Ellipse paramétrique avec fond. Le sampler détecte la fermeture et le rendu SVG ferme le path (Z) pour permettre le fill."
		width={700}
		height={500}
	/>
</div>
