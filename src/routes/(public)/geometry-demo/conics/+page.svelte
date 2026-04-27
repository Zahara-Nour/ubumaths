<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { runDsl } from '$lib/geometry-core/dsl';

	// Curve transformation — y = x² rotated 45°
	const transformCurveFig = runDsl(
		`O = point(0, 0, couleur="noir")
f = courbe("y = x^2", couleur="bleu")
r = rotation(angle=45, centre=O)
f2 = transforme(r, f)
style(f2, couleur="rouge")`
	).figure;

	// Conic transformation — ellipse rotation + translation + homothetie
	const transformConicFig = runDsl(
		`O = point(0, 0, couleur="noir")
c = courbe("{x^2}/4 + {y^2}/9 - 1 = 0", couleur="bleu")

r = rotation(angle=30, centre=O)
c2 = transforme(r, c)
style(c2, couleur="rouge")

A = point(0, 0)
B = point(3, 1)
t = translation(vecteur=(A, B))
c3 = transforme(t, c)
style(c3, couleur="vert")

h = homothetie(rapport=0.5, centre=O)
c4 = transforme(h, c)
style(c4, couleur="violet")`
	).figure;

	// Similitude — spiral of triangles
	const similitudeFig = runDsl(
		`O = point(0, 0, couleur="noir")
A = point(3, 0, couleur="bleu")
B = point(4, 0, couleur="bleu")
C = point(3.5, 1, couleur="bleu")
segment(A, B, couleur="bleu")
segment(B, C, couleur="bleu")
segment(C, A, couleur="bleu")

sim = similitude(centre=O, angle=40, rapport=0.85)

A2 = transforme(sim, A)
B2 = transforme(sim, B)
C2 = transforme(sim, C)
segment(A2, B2, couleur="rouge")
segment(B2, C2, couleur="rouge")
segment(C2, A2, couleur="rouge")

A3 = transforme(sim, A2)
B3 = transforme(sim, B2)
C3 = transforme(sim, C2)
segment(A3, B3, couleur="vert")
segment(B3, C3, couleur="vert")
segment(C3, A3, couleur="vert")

A4 = transforme(sim, A3)
B4 = transforme(sim, B3)
C4 = transforme(sim, C3)
segment(A4, B4, couleur="violet")
segment(B4, C4, couleur="violet")
segment(C4, A4, couleur="violet")

A5 = transforme(sim, A4)
B5 = transforme(sim, B4)
C5 = transforme(sim, C4)
segment(A5, B5, couleur="orange")
segment(B5, C5, couleur="orange")
segment(C5, A5, couleur="orange")`
	).figure;

	// Implicit curve transformation — folium de Descartes
	const transformImplicitFig = runDsl(
		`O = point(0, 0, couleur="noir")
c = courbe("x^3 + y^3 - 3*x*y = 0", couleur="bleu")

A = point(0, 0)
B = point(2, 2)
t = translation(vecteur=(A, B))
c2 = transforme(t, c)
style(c2, couleur="rouge")

r = rotation(angle=90, centre=O)
c3 = transforme(r, c)
style(c3, couleur="vert")`
	).figure;
</script>

<div class="container mx-auto max-w-4xl p-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Transformation de courbe — y = x² tourne de 45°</h2>
	<p class="mb-4 text-muted-foreground">
		<code>transforme(r, courbe("y = x^2"))</code> cree une courbe implicite F(T⁻¹(x,y)) = 0. Le
		resultat n'est plus une fonction y=g(x) mais est rendu correctement.
		<br />
		<strong>Bleu</strong> : parabole y = x² |
		<strong>Rouge</strong> : rotation 45° autour de O
	</p>

	<GeometryCanvas
		figure={transformCurveFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{transformCurveFig.size} elements | courbe y=f(x) transformee
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">
		Transformation de coniques — ellipse rotation + translation + homothetie
	</h2>
	<p class="mb-4 text-muted-foreground">
		Les coniques restent des coniques apres transformation affine : les coefficients sont recalcules
		via la matrice inverse. <code>tangente()</code>, <code>point_sur()</code> et
		<code>zeros()</code> restent utilisables sur l'image.
		<br />
		<strong>Bleu</strong> : ellipse x²/4 + y²/9 = 1 |
		<strong>Rouge</strong> : rotation 30° |
		<strong>Vert</strong> : translation (3, 1) |
		<strong>Violet</strong> : homothetie rapport 0.5
	</p>

	<GeometryCanvas
		figure={transformConicFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{transformConicFig.size} elements | coniques transformees (restent GeoQuadraticCurve)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Similitude — spirale de triangles</h2>
	<p class="mb-4 text-muted-foreground">
		<code>similitude(centre=O, angle=40, rapport=0.85)</code> appliquee 4 fois successivement a un triangle.
		Chaque iteration tourne de 40° et reduit de 15%. Deplacez O pour changer le centre.
	</p>

	<GeometryCanvas
		figure={similitudeFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={50}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{similitudeFig.size} elements | similitude() — spirale de triangles
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Transformation de courbe implicite — folium de Descartes</h2>
	<p class="mb-4 text-muted-foreground">
		Courbe implicite F(x,y) = 0 transformee par translation et rotation. Le rendu utilise
		l'algorithme marching squares sur la courbe composee F(T⁻¹(x,y)) = 0.
		<br />
		<strong>Bleu</strong> : folium x³+y³-3xy = 0 |
		<strong>Rouge</strong> : translation (2, 2) |
		<strong>Vert</strong> : rotation 90°
	</p>

	<GeometryCanvas
		figure={transformImplicitFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{transformImplicitFig.size} elements | courbe implicite transformee
	</p>
</div>
