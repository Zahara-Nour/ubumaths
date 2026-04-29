/**
 * Standard library of predefined macros for the geometry DSL.
 *
 * These are written as DSL scripts and auto-loaded into the interpreter.
 * Each macro creates geometric elements using the builtin functions.
 */

export const STDLIB_MACROS = `
# ─── Constructions fondamentales ─────────────────────────────

macro mediatrice(A, B):
    M = milieu(A, B)
    H = rotation(A, centre=M, angle=90)
    d = droite(M, H)
    retourne (M, d)

macro mediane(A, B, C):
    M = milieu(B, C)
    s = segment(A, M)
    retourne (M, s)

macro hauteur(A, B, C):
    P = translation(A, vecteur=(B, C))
    Q = rotation(P, centre=A, angle=90)
    d = droite(A, Q)
    bc = droite(B, C)
    F = intersection(d, bc)
    retourne (F, d)

macro perpendiculaire(P, A, B):
    Q = translation(P, vecteur=(A, B))
    R = rotation(Q, centre=P, angle=90)
    d = droite(P, R)
    retourne d

macro parallele(P, A, B):
    Q = translation(P, vecteur=(A, B))
    d = droite(P, Q)
    retourne d

macro bissectrice(A, V, B):
    c = cercle(V, passant=A)
    B2 = intersection(c, demidroite(V, B), 2)
    M = milieu(A, B2)
    d = droite(V, M)
    retourne d

# ─── Triangles ───────────────────────────────────────────────

macro triangle(A, B, C):
    segment(A, B)
    segment(B, C)
    segment(C, A)

macro triangle_equilateral(A, B):
    C = rotation(B, centre=A, angle=60)
    segment(A, B)
    segment(B, C)
    segment(C, A)
    retourne C

macro triangle_isocele(A, B, angle=40):
    demi = angle / 2
    M = milieu(A, B)
    H = rotation(A, centre=M, angle=90)
    C = rotation(M, centre=A, angle=90 - demi)
    segment(A, B)
    segment(A, C)
    segment(B, C)
    retourne C

macro triangle_rectangle(A, B, angle=45):
    C = rotation(B, centre=A, angle=angle)
    segment(A, B)
    segment(A, C)
    segment(B, C)
    angle_droit(B, A, C)
    retourne C

# ─── Quadrilateres ───────────────────────────────────────────

macro parallelogramme(A, B, C):
    D = translation(A, vecteur=(B, C))
    segment(A, B)
    segment(B, C)
    segment(C, D)
    segment(D, A)
    retourne D

macro rectangle(A, B, largeur=2):
    H = rotation(B, centre=A, angle=90)
    dax = H.x - A.x
    day = H.y - A.y
    la = sqrt(dax * dax + day * day)
    dx = dax / la * largeur
    dy = day / la * largeur
    C = point(B.x + dx, B.y + dy)
    D = point(A.x + dx, A.y + dy)
    segment(A, B)
    segment(B, C)
    segment(C, D)
    segment(D, A)
    angle_droit(D, A, B)
    retourne (C, D)

macro carre(A, B):
    C = rotation(A, centre=B, angle=90)
    D = rotation(B, centre=A, angle=-90)
    segment(A, B)
    segment(B, C)
    segment(C, D)
    segment(D, A)
    angle_droit(D, A, B)
    retourne (C, D)

macro losange(A, B, angle=60):
    C = rotation(A, centre=B, angle=angle)
    D = translation(C, vecteur=(B, A))
    segment(A, B)
    segment(B, C)
    segment(C, D)
    segment(D, A)
    retourne (C, D)

# ─── Polygones ───────────────────────────────────────────────

macro polygone_regulier(centre, rayon, n):
    P[0] = point(centre.x + rayon, centre.y)
    pour i de 1 a n - 1:
        P[i] = rotation(P[0], centre=centre, angle=i * 360 / n)
    pour i de 0 a n - 1:
        segment(P[i], P[(i + 1) % n])
    retourne P

macro etoile(centre, rayon, n, saut=2):
    P[0] = point(centre.x + rayon, centre.y)
    pour i de 1 a n - 1:
        P[i] = rotation(P[0], centre=centre, angle=i * 360 / n)
    pour i de 0 a n - 1:
        segment(P[i], P[(i + saut) % n])
    retourne P

# ─── Cercles remarquables ────────────────────────────────────

macro cercle_circonscrit(A, B, C):
    (M1, d1) = mediatrice(A, B)
    (M2, d2) = mediatrice(B, C)
    O = intersection(d1, d2)
    c = cercle(O, passant=A)
    retourne (O, c)

macro cercle_inscrit(A, B, C):
    b1 = bissectrice(A, B, C)
    b2 = bissectrice(B, C, A)
    I = intersection(b1, b2)
    r = distance(I, droite(A, B))
    c = cercle(I, rayon=r)
    retourne (I, c)

# ─── Points remarquables du triangle ───────────────────────

macro centre_gravite(A, B, C):
    M = milieu(B, C)
    N = milieu(A, C)
    G = intersection(droite(A, M), droite(B, N))
    retourne G

macro orthocentre(A, B, C):
    (F1, h1) = hauteur(A, B, C)
    (F2, h2) = hauteur(B, A, C)
    H = intersection(h1, h2)
    retourne H

# ─── Droite et cercle d'Euler ───────────────────────────────

macro droite_euler(A, B, C):
    # Undefined for equilateral triangles (G = H coincide)
    G = centre_gravite(A, B, C)
    H = orthocentre(A, B, C)
    d = droite(G, H)
    retourne d

macro cercle_euler(A, B, C):
    M1 = milieu(A, B)
    M2 = milieu(B, C)
    M3 = milieu(A, C)
    (O, c) = cercle_circonscrit(M1, M2, M3)
    retourne (O, c)
`;
