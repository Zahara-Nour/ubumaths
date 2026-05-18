/**
 * Standard library of predefined macros for the geometry DSL.
 *
 * These are written as DSL scripts and auto-loaded into the interpreter.
 * Each macro creates geometric elements using the builtin functions.
 *
 * ──────────────────────────────────────────────────────────────────────
 * Convention de retour : **un macro = un objet principal**.
 * Les sous-produits (points dérivés, points intermédiaires de construction)
 * sont accessibles via les accesseurs (`centre`, `extremite`, `milieu`,
 * `sommet`, `sommets`). Les byproducts non significatifs sont rendus
 * invisibles par défaut.
 * ──────────────────────────────────────────────────────────────────────
 */

export const STDLIB_MACROS = `
# NOTE : mediatrice, perpendiculaire, parallele, mediane, bissectrice
# ont été migrés en builtins (dsl/builtins.ts). hauteur reste macro
# pour l'instant — sera migré dans le commit 6.

# ─── Constructions fondamentales (hauteur seule restante) ────

macro hauteur(A, B, C):
    P = translation(A, vecteur=(B, C))
    masque(P)
    Q = rotation(P, centre=A, angle=90)
    masque(Q)
    d = droite(A, Q)
    bc = droite(B, C)
    masque(bc)
    F = intersection(d, bc)
    masque(F)
    retourne d

# NOTE : triangle, triangle_equilateral, triangle_isocele, triangle_rectangle
# ont été migrés en builtins (dsl/builtins.ts).

# NOTE : parallelogramme, rectangle, carre, losange ont été migrés
# en builtins (dsl/builtins.ts).

# NOTE : polygone_regulier et etoile ont été migrés en builtins
# (dsl/builtins.ts). Breaking change : ils retournent maintenant un
# polygone unique (au lieu d'un array de points). Sommets accessibles
# via sommet(p, i) et sommets(p).

# ─── Corde ───────────────────────────────────────────────────

macro corde(c, d):
    P1 = intersection(c, d, 1)
    masque(P1)
    P2 = intersection(c, d, 2)
    masque(P2)
    s = segment(P1, P2)
    retourne s

# ─── Cercles remarquables ────────────────────────────────────

macro cercle_circonscrit(A, B, C):
    d1 = mediatrice(A, B)
    masque(d1)
    d2 = mediatrice(B, C)
    masque(d2)
    O = intersection(d1, d2)
    masque(O)
    c = cercle(O, passant=A)
    retourne c

macro cercle_inscrit(A, B, C):
    b1 = bissectrice(A, B, C)
    masque(b1)
    b2 = bissectrice(B, C, A)
    masque(b2)
    I = intersection(b1, b2)
    masque(I)
    ab = droite(A, B)
    masque(ab)
    r = distance(I, ab)
    c = cercle(I, rayon=r)
    retourne c

# ─── Points remarquables du triangle ───────────────────────

macro centre_gravite(A, B, C):
    M = milieu(B, C)
    masque(M)
    N = milieu(A, C)
    masque(N)
    d1 = droite(A, M)
    masque(d1)
    d2 = droite(B, N)
    masque(d2)
    G = intersection(d1, d2)
    retourne G

macro orthocentre(A, B, C):
    h1 = hauteur(A, B, C)
    masque(h1)
    h2 = hauteur(B, A, C)
    masque(h2)
    H = intersection(h1, h2)
    retourne H

# ─── Droite et cercle d'Euler ───────────────────────────────

macro droite_euler(A, B, C):
    # Undefined for equilateral triangles (G = H coincide)
    G = centre_gravite(A, B, C)
    masque(G)
    H = orthocentre(A, B, C)
    masque(H)
    d = droite(G, H)
    retourne d

macro cercle_euler(A, B, C):
    M1 = milieu(A, B)
    masque(M1)
    M2 = milieu(B, C)
    masque(M2)
    M3 = milieu(A, C)
    masque(M3)
    c = cercle_circonscrit(M1, M2, M3)
    retourne c
`;
