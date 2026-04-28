<script lang="ts">
	import DslDemo from '../DslDemo.svelte';

	// ==========================================================================
	// Transformation objects — reusable rotation applied to a triangle
	// ==========================================================================
	const transformTriangleDsl = `O = point(0, 0, couleur="noir")
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
style(s3, couleur="vert", trait="tirets")`;

	// ==========================================================================
	// Transformation objects — all types demo
	// ==========================================================================
	const transformAllTypesDsl = `A = point(3, 2, couleur="bleu")
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
style(c_refl, couleur="violet")`;

	// ==========================================================================
	// Composition of transformations
	// ==========================================================================
	const composeDsl = `O = point(0, 0, couleur="noir")
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
segment(C3, A3, couleur="rouge")`;

	// ==========================================================================
	// Direct application syntax on various objects
	// ==========================================================================
	const directSyntaxDsl = `O = point(0, 0, couleur="noir")
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
style(c3, couleur="vert")`;

	// ==========================================================================
	// Polygone builtin — polygone(A, B, C, ...) + transformation
	// ==========================================================================
	const polygoneDsl = `A = point(2, 0, couleur="bleu")
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
style(p3, couleur="vert")`;

	// ==========================================================================
	// Projection — polygon projected onto a line
	// ==========================================================================
	const projectionDsl = `A = point(-3, 0, couleur="noir")
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
style(p2, couleur="rouge")`;

	// ==========================================================================
	// Affinite — circle to ellipse
	// ==========================================================================
	const affiniteDsl = `A = point(-5, 0, couleur="noir")
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
style(c3, couleur="vert")`;

	// ==========================================================================
	// Inversion — circles and lines
	// ==========================================================================
	const inversionDsl = `O = point(0, 0, couleur="noir")
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
style(c4, couleur="cyan")`;
</script>

<div class="mx-auto max-w-6xl space-y-4 p-8">
	<a href="/geometry-demo" class="text-sm text-muted-foreground hover:underline"
		>← Retour aux demos</a
	>

	<h1 class="text-3xl font-bold">Transformations geometriques</h1>

	<hr class="my-8" />

	<DslDemo
		dsl={transformTriangleDsl}
		title="Objets transformation — rotation reutilisable"
		description="Un objet rotation r = rotation(angle=60, centre=O) applique a chaque sommet du triangle via transforme(r, A). Deplacez O pour deplacer le centre de rotation, deplacez A/B/C pour voir les images suivre."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={transformAllTypesDsl}
		title="Transformations — rotation, symetrie centrale, symetrie axiale"
		description="Un segment et un cercle transformes par 3 types de transformation differents. Deplacez les points pour voir les images reagir."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={composeDsl}
		title="Composition — compose(homothetie, rotation)"
		description="f = compose(h, r) : applique rotation 45° puis homothetie rapport 1.5. Le triangle bleu est transforme en deux etapes visibles."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={directSyntaxDsl}
		title="Syntaxe directe — rotation(segment, centre=O, angle=90)"
		description="Application directe sans objet transformation nomme : rotation(segment, centre=O, angle=90). Fonctionne pour segments, droites, cercles, vecteurs."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={35}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={polygoneDsl}
		title="Polygone — polygone(A, B, C, D, E) + transforme()"
		description="Builtin polygone(A, B, C, ...) pour creer des polygones a N sommets. Ici un pentagone transforme par rotation 72° et symetrie centrale. Deplacez les sommets ou le centre O."
		center={{ x: 0, y: 0 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={projectionDsl}
		title="Projection orthogonale — polygone sur une droite"
		description="projection(axe=d) projette un pentagone sur l'axe Ox. Le resultat est un polygone aplati. Deplacez les sommets pour observer la projection."
		center={{ x: 1, y: 2 }}
		pixelsPerUnit={60}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={affiniteDsl}
		title="Affinite orthogonale — cercle vers ellipse"
		description="affinite(axe=(A,B), rapport=k) etire perpendiculairement a l'axe. Un cercle devient une ellipse. Deplacez O pour observer la deformation."
		center={{ x: 0, y: 2 }}
		pixelsPerUnit={40}
		width={700}
		height={500}
	/>

	<hr class="my-8" />

	<DslDemo
		dsl={inversionDsl}
		title="Inversion circulaire — droites et cercles"
		description="inversion(centre=O, rayon=3) : transformation non-affine. Une droite ne passant pas par O devient un cercle passant par O. Un cercle passant par O devient une droite."
		center={{ x: 0, y: 1 }}
		pixelsPerUnit={35}
		width={700}
		height={500}
	/>
</div>
