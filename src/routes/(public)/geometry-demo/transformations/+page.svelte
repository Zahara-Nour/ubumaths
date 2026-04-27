<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import { runDsl } from '$lib/geometry-core/dsl';

	// ==========================================================================
	// Transformation objects — reusable rotation applied to a triangle
	// ==========================================================================
	const transformTriangleFig = runDsl(
		`O = point(0, 0, couleur="noir")
A = point(3, 0, couleur="bleu")
B = point(5, 0, couleur="bleu")
C = point(4, 2, couleur="bleu")
segment(A, B, couleur="bleu")
segment(B, C, couleur="bleu")
segment(C, A, couleur="bleu")

r = rotation(angle=60, centre=O)

A2 = transforme(r, A)
B2 = transforme(r, B)
C2 = transforme(r, C)
style(A2, couleur="rouge")
style(B2, couleur="rouge")
style(C2, couleur="rouge")
segment(A2, B2, couleur="rouge")
segment(B2, C2, couleur="rouge")
segment(C2, A2, couleur="rouge")

s1 = transforme(r, segment(A, B))
s2 = transforme(r, segment(B, C))
s3 = transforme(r, segment(C, A))
style(s1, couleur="vert", trait="tirets")
style(s2, couleur="vert", trait="tirets")
style(s3, couleur="vert", trait="tirets")`
	).figure;

	// ==========================================================================
	// Transformation objects — all types demo
	// ==========================================================================
	const transformAllTypesFig = runDsl(
		`A = point(3, 2, couleur="bleu")
B = point(5, 2, couleur="bleu")
s = segment(A, B, couleur="bleu")
c = cercle(A, rayon=1, couleur="bleu")

O = point(0, 0, couleur="noir")

rot = rotation(angle=90, centre=O)
s_rot = transforme(rot, s)
c_rot = transforme(rot, c)
style(s_rot, couleur="rouge")
style(c_rot, couleur="rouge")

sym = symetrie(centre=O)
s_sym = transforme(sym, s)
c_sym = transforme(sym, c)
style(s_sym, couleur="vert")
style(c_sym, couleur="vert")

P1 = point(-6, 0, couleur="gris")
P2 = point(6, 0, couleur="gris")
axe = droite(P1, P2, couleur="gris", trait="tirets")
refl = symetrie(axe=axe)
s_refl = transforme(refl, s)
c_refl = transforme(refl, c)
style(s_refl, couleur="violet")
style(c_refl, couleur="violet")`
	).figure;

	// ==========================================================================
	// Composition of transformations
	// ==========================================================================
	const composeFig = runDsl(
		`O = point(0, 0, couleur="noir")
A = point(2, 0, couleur="bleu")
B = point(4, 0, couleur="bleu")
C = point(3, 1.5, couleur="bleu")
segment(A, B, couleur="bleu")
segment(B, C, couleur="bleu")
segment(C, A, couleur="bleu")

r = rotation(angle=45, centre=O)
h = homothetie(rapport=1.5, centre=O)
f = compose(h, r)

A2 = transforme(r, A)
B2 = transforme(r, B)
C2 = transforme(r, C)
style(A2, couleur="orange")
style(B2, couleur="orange")
style(C2, couleur="orange")
segment(A2, B2, couleur="orange", trait="tirets")
segment(B2, C2, couleur="orange", trait="tirets")
segment(C2, A2, couleur="orange", trait="tirets")

A3 = transforme(f, A)
B3 = transforme(f, B)
C3 = transforme(f, C)
style(A3, couleur="rouge")
style(B3, couleur="rouge")
style(C3, couleur="rouge")
segment(A3, B3, couleur="rouge")
segment(B3, C3, couleur="rouge")
segment(C3, A3, couleur="rouge")`
	).figure;

	// ==========================================================================
	// Direct application syntax on various objects
	// ==========================================================================
	const directSyntaxFig = runDsl(
		`O = point(0, 0, couleur="noir")
A = point(2, 1, couleur="bleu")
B = point(4, 1, couleur="bleu")
s = segment(A, B, couleur="bleu")
d = droite(A, B, couleur="bleu", trait="tirets")
c = cercle(point(3, 3, couleur="bleu"), rayon=1, couleur="bleu")

s2 = rotation(s, centre=O, angle=90)
style(s2, couleur="rouge")

d2 = rotation(d, centre=O, angle=90)
style(d2, couleur="rouge", trait="tirets")

c2 = rotation(c, centre=O, angle=90)
style(c2, couleur="rouge")

u = vecteur(2, 1, couleur="bleu")
r = rotation(angle=90, centre=O)
u2 = transforme(r, u)
style(u2, couleur="rouge")

c3 = homothetie(c, centre=O, rapport=2)
style(c3, couleur="vert")`
	).figure;

	// ==========================================================================
	// Polygone builtin — polygone(A, B, C, ...) + transformation
	// ==========================================================================
	const polygoneFig = runDsl(
		`A = point(2, 0, couleur="bleu")
B = point(4, 0, couleur="bleu")
C = point(5, 2, couleur="bleu")
D = point(3, 3, couleur="bleu")
E = point(1, 2, couleur="bleu")
p = polygone(A, B, C, D, E)
style(p, couleur="bleu")

O = point(0, 0, couleur="noir")
r = rotation(angle=72, centre=O)
p2 = transforme(r, p)
style(p2, couleur="rouge")

s = symetrie(centre=O)
p3 = transforme(s, p)
style(p3, couleur="vert")`
	).figure;

	// ==========================================================================
	// Projection — polygon projected onto a line
	// ==========================================================================
	const projectionFig = runDsl(
		`A = point(-3, 0, couleur="noir")
B = point(5, 0, couleur="noir")
d = droite(A, B)
style(d, couleur="noir", trait="tirets")

C = point(0, 3, couleur="bleu")
D = point(2, 4, couleur="bleu")
E = point(4, 3, couleur="bleu")
F = point(3, 1.5, couleur="bleu")
G = point(1, 1.5, couleur="bleu")
p = polygone(C, D, E, F, G)
style(p, couleur="bleu")

proj = projection(axe=d)
p2 = transforme(proj, p)
style(p2, couleur="rouge")`
	).figure;

	// ==========================================================================
	// Affinite — circle to ellipse
	// ==========================================================================
	const affiniteFig = runDsl(
		`A = point(-5, 0, couleur="noir")
B = point(5, 0, couleur="noir")
d = droite(A, B)
style(d, couleur="noir", trait="tirets")

O = point(0, 2, couleur="bleu")
c = cercle(O, rayon=2, couleur="bleu")

aff = affinite(axe=(A, B), rapport=0.5)
c2 = transforme(aff, c)
style(c2, couleur="rouge")

aff2 = affinite(axe=(A, B), rapport=2)
c3 = transforme(aff2, c)
style(c3, couleur="vert")`
	).figure;

	// ==========================================================================
	// Inversion — circles and lines
	// ==========================================================================
	const inversionFig = runDsl(
		`O = point(0, 0, couleur="noir")
inv = inversion(centre=O, rayon=3)

A = point(2, 0, couleur="bleu")
B = point(2, 4, couleur="bleu")
d = droite(A, B, couleur="bleu")
d2 = transforme(inv, d)
style(d2, couleur="rouge")

C = point(-3, 2, couleur="vert")
c = cercle(C, rayon=1, couleur="vert")
c2 = transforme(inv, c)
style(c2, couleur="orange")

D = point(1.5, 0, couleur="violet")
c3 = cercle(D, rayon=1.5, couleur="violet")
c4 = transforme(inv, c3)
style(c4, couleur="cyan")`
	).figure;
</script>

<div class="mx-auto max-w-4xl space-y-4 p-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="text-3xl font-bold">Transformations geometriques</h1>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Objets transformation — rotation reutilisable</h2>
	<p class="mb-4 text-muted-foreground">
		Un objet rotation <code>r = rotation(angle=60, centre=O)</code> applique a chaque sommet du
		triangle via <code>transforme(r, A)</code>. Deplacez O pour deplacer le centre de rotation,
		deplacez A/B/C pour voir les images suivre.
		<br />
		<strong>Bleu</strong> : triangle original |
		<strong>Rouge</strong> : sommets images (transforme point par point) |
		<strong>Vert tirets</strong> : segments images (transforme(r, segment))
	</p>

	<GeometryCanvas
		figure={transformTriangleFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{transformTriangleFig.size} elements | transformation objects + transforme()
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">
		Transformations — rotation, symetrie centrale, symetrie axiale
	</h2>
	<p class="mb-4 text-muted-foreground">
		Un segment et un cercle transformes par 3 types de transformation differents. Deplacez les
		points pour voir les images reagir.
		<br />
		<strong>Bleu</strong> : originaux |
		<strong>Rouge</strong> : rotation 90° autour de O |
		<strong>Vert</strong> : symetrie centrale (O) |
		<strong>Violet</strong> : symetrie axiale (axe x, tirets gris)
	</p>

	<GeometryCanvas
		figure={transformAllTypesFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{transformAllTypesFig.size} elements | rotation + symetrie centrale + axiale
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Composition — compose(homothetie, rotation)</h2>
	<p class="mb-4 text-muted-foreground">
		<code>f = compose(h, r)</code> : applique rotation 45° puis homothetie rapport 1.5. Le triangle
		bleu est transforme en deux etapes visibles.
		<br />
		<strong>Bleu</strong> : triangle original |
		<strong>Orange tirets</strong> : apres rotation seule (45°) |
		<strong>Rouge</strong> : apres composition rotation + homothetie
	</p>

	<GeometryCanvas
		figure={composeFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{composeFig.size} elements | compose(homothetie, rotation)
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Syntaxe directe — rotation(segment, centre=O, angle=90)</h2>
	<p class="mb-4 text-muted-foreground">
		Application directe sans objet transformation nomme : <code
			>rotation(segment, centre=O, angle=90)</code
		>. Fonctionne pour segments, droites, cercles, vecteurs.
		<br />
		<strong>Bleu</strong> : originaux (segment, droite tirets, cercle, vecteur) |
		<strong>Rouge</strong> : rotation 90° |
		<strong>Vert</strong> : homothetie rapport 2 (cercle uniquement)
	</p>

	<GeometryCanvas
		figure={directSyntaxFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{directSyntaxFig.size} elements | syntaxe directe sur objets varies
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Polygone — polygone(A, B, C, D, E) + transforme()</h2>
	<p class="mb-4 text-muted-foreground">
		Builtin <code>polygone(A, B, C, ...)</code> pour creer des polygones a N sommets. Ici un
		pentagone transforme par rotation 72° et symetrie centrale. Deplacez les sommets ou le centre O.
		<br />
		<strong>Bleu</strong> : pentagone original |
		<strong>Rouge</strong> : rotation 72° autour de O |
		<strong>Vert</strong> : symetrie centrale (O)
	</p>

	<GeometryCanvas
		figure={polygoneFig}
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{polygoneFig.size} elements | polygone() + transforme()
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Projection orthogonale — polygone sur une droite</h2>
	<p class="mb-4 text-muted-foreground">
		<code>projection(axe=d)</code> projette un pentagone sur l'axe Ox. Le resultat est un polygone
		aplati. Deplacez les sommets pour observer la projection.
		<br />
		<strong>Bleu</strong> : pentagone original |
		<strong>Rouge</strong> : projection sur la droite
	</p>

	<GeometryCanvas
		figure={projectionFig}
		center={{ x: 1, y: 2 }}
		pixelsPerUnit={60}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{projectionFig.size} elements | projection() — polygone sur droite
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Affinite orthogonale — cercle vers ellipse</h2>
	<p class="mb-4 text-muted-foreground">
		<code>affinite(axe=(A,B), rapport=k)</code> etire perpendiculairement a l'axe. Un cercle devient
		une ellipse. Deplacez O pour observer la deformation.
		<br />
		<strong>Bleu</strong> : cercle original |
		<strong>Rouge</strong> : rapport=0.5 (compression) |
		<strong>Vert</strong> : rapport=2 (etirement)
	</p>

	<GeometryCanvas
		figure={affiniteFig}
		center={{ x: 0, y: 2 }}
		pixelsPerUnit={40}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{affiniteFig.size} elements | affinite() — cercle vers ellipse
	</p>

	<hr class="my-8" />

	<h2 class="mb-4 text-xl font-bold">Inversion circulaire — droites et cercles</h2>
	<p class="mb-4 text-muted-foreground">
		<code>inversion(centre=O, rayon=3)</code> : transformation non-affine. Une droite ne passant pas
		par O devient un cercle passant par O. Un cercle passant par O devient une droite.
		<br />
		<strong>Bleu</strong> : droite verticale → <strong>Rouge</strong> : cercle image |
		<strong>Vert</strong> : cercle (ne passe pas par O) → <strong>Orange</strong> : cercle image |
		<strong>Violet</strong> : cercle (passe par O) → <strong>Cyan</strong> : droite image
	</p>

	<GeometryCanvas
		figure={inversionFig}
		center={{ x: 0, y: 1 }}
		pixelsPerUnit={35}
		width={800}
		height={600}
	/>

	<p class="mt-4 text-sm text-muted-foreground">
		{inversionFig.size} elements | inversion() — droites et cercles
	</p>
</div>
