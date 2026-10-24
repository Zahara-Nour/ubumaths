<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	// ── 1. Dessin libre ──────────────────────────────────────────

	const dessinLibreDsl = `A = point(0, 0, couleur="rouge")
T = trace(A, couleur="violet")`;

	// ── 2. Spirale d'Archimede ───────────────────────────────────

	const spiraleDsl = `O = point(0, 0, couleur="bleu")
t = slider(min=0, max=1080, valeur=0, pas=2)
A = point(1, 0)
B = rotation(A, centre=O, angle=t)
r = t / 360
C = homothetie(B, centre=O, rapport=r, couleur="orange")
T = trace(C, couleur="violet")`;

	// ── 3. Epicycloide via slider ────────────────────────────────

	const epicycloideDsl = `O = point(0, 0, couleur="bleu")
t = slider(min=0, max=1080, valeur=0, pas=3)
P = point(4, 0)
A = rotation(P, centre=O, angle=t, couleur="gris")
Q = point(5, 0)
B0 = rotation(Q, centre=O, angle=t, couleur="gris")
k = -3 * t
B = rotation(B0, centre=A, angle=k, couleur="orange")
segment(A, B, couleur="gris")
T = trace(B, couleur="violet")`;

	// ── 4. Rosace progressive ────────────────────────────────────

	const rosaceDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=4, couleur="gris")
n = slider(min=2, max=7, valeur=3, pas=1)
t = slider(min=0, max=360, valeur=0, pas=1)
A = point(4, 0)
B = rotation(A, centre=O, angle=t)
theta = angle_polaire(O, B)
k = cos(n * theta)
C = homothetie(B, centre=O, rapport=k, couleur="orange")
T = trace(C, couleur="violet")`;

	// ── 5. Exploration 2 parametres ──────────────────────────────

	const explorationDsl = `O = point(0, 0, couleur="bleu")
a = slider(min=0, max=360, valeur=0, pas=5)
r = slider(min=1, max=5, valeur=3, pas=0.2)
A = point(1, 0)
B = rotation(A, centre=O, angle=a)
C = homothetie(B, centre=O, rapport=r, couleur="orange")
T = trace(C, couleur="violet")`;

	// ── 6. Lieu vs Trace ─────────────────────────────────────────

	const compareDsl = `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 0, couleur="vert")
M = milieu(A, P, couleur="orange")
L = lieu(M, A, couleur="cyan")
T = trace(M, couleur="violet")`;
</script>

<svelte:head>
	<title>Geometry Demo — Trace</title>
</svelte:head>

<div class="container mx-auto max-w-6xl space-y-8 p-4">
	<h1 class="text-2xl font-bold">Trace (lieu progressif)</h1>
	<p class="text-muted-foreground">
		<code>trace(P)</code> accumule les positions du point P au fil des interactions. Contrairement a
		<code>lieu()</code> qui calcule le locus complet analytiquement, <code>trace()</code> construit la
		courbe progressivement — et fonctionne avec n'importe quel point, meme libre.
	</p>

	<h2 class="mt-6 text-xl font-bold">Dessin libre</h2>

	<DslDemo
		dsl={dessinLibreDsl}
		title="1. Main levee"
		description="Deplacez le point A (rouge) librement — la trace dessine votre mouvement. Impossible avec lieu() qui exige un point_sur."
		width={600}
		height={400}
	/>

	<h2 class="mt-8 text-xl font-bold">Courbes par slider</h2>

	<DslDemo
		dsl={spiraleDsl}
		title="2. Spirale d'Archimede"
		description="Glissez le slider t lentement de 0 a 1080. Le point C s'eloigne en tournant : la spirale se deroule sous vos yeux. Le rapport d'homothetie r = t/360 croit avec l'angle."
		width={600}
		height={500}
		pixelsPerUnit={30}
	/>

	<DslDemo
		dsl={epicycloideDsl}
		title="3. Epicycloide"
		description="Le point B tourne autour de A qui tourne autour de O, a des vitesses differentes (rapport -3). Glissez t pour dessiner l'epicycloide. Poussez jusqu'a 1080 pour voir le motif complet."
		width={600}
		height={500}
		pixelsPerUnit={30}
	/>

	<h2 class="mt-8 text-xl font-bold">Rosace et exploration</h2>

	<DslDemo
		dsl={rosaceDsl}
		title="4. Rosace progressive"
		description="Glissez t pour dessiner la rosace petale par petale. Changez n (nombre de petales) et rebalayez t pour voir une rosace differente se construire sur la precedente."
		width={600}
		height={500}
		pixelsPerUnit={30}
	/>

	<DslDemo
		dsl={explorationDsl}
		title="5. Exploration 2 parametres"
		description="Deux sliders : angle a et rayon r. Balayez a a rayon fixe (arc de cercle), puis changez r et rebalayez (nouvel arc). La trace montre votre parcours dans l'espace des parametres — impossible avec lieu() qui est 1D."
		width={600}
		height={500}
		pixelsPerUnit={30}
	/>

	<h2 class="mt-8 text-xl font-bold">Comparaison lieu / trace</h2>

	<DslDemo
		dsl={compareDsl}
		title="6. lieu() (cyan) vs trace() (violet)"
		description="Le lieu (cyan) affiche l'ellipse complete instantanement. La trace (violet) se construit au fur et a mesure que vous deplacez A sur le cercle. Deplacez P (vert) : le lieu se recalcule, mais la trace garde la memoire des anciennes positions."
		width={600}
		height={400}
	/>
</div>
