"""Vérification des résultats des corrigés — « Fonctions affines : applications » (Seconde).

UNE assertion par résultat écrit dans les corrigés (sol/ et sol-en/, mêmes nombres).
Usage : scripts/fiches/.venv/bin/python -I data/fiches/fonctions-affines-2nde/applications/verif/assert_all.py
"""

from fractions import Fraction as F

import sympy as sp

x, m, p, a, b, k = sp.symbols("x m p a b k", real=True)
n = 0


def ok(cond, label):
    global n
    assert cond, label
    n += 1


def affine(e):
    """(m, p) d'une expression affine en x, sinon None."""
    poly = sp.Poly(sp.expand(e), x)
    if poly.degree() > 1:
        return None
    return sp.nsimplify(poly.coeff_monomial(x)), sp.nsimplify(poly.coeff_monomial(1))


def sol_lin(lhs, rhs):
    return sp.solve(sp.Eq(lhs, rhs), x)


def sol_ineq(expr):
    return sp.solve_univariate_inequality(expr, x, relational=False)


Q = sp.Rational

# ── A01 taxi ────────────────────────────────────────────────────────────────
f = Q(3, 2) * x + 4
ok(f.subs(x, 1) == Q(11, 2), "A01 1a prix 1 km = 5.50")
ok(f.subs(x, 2) == 7, "A01 1a prix 2 km = 7")
ok(sp.expand(4 + x * Q(3, 2) - f) == 0, "A01 1b f(x)=1.5x+4")
ok(affine(f) == (Q(3, 2), 4), "A01 1c m=1.5, p=4")
ok(f.subs(x, 0) == 4, "A01 1d f(0)=4 (prise en charge)")
ok(f.subs(x, 12) == 22, "A01 2a f(12)=22")
ok(sol_lin(f, 31) == [18], "A01 2b f(x)=31 -> 18")
ok(sol_ineq(f <= 40) == sp.Interval(-sp.oo, 24), "A01 2c f(x)<=40 -> x<=24")
ok(sp.Interval(0, sp.oo).intersect(sol_ineq(f <= 40)) == sp.Interval(0, 24), "A01 2c [0;24]")

# ── A02 Celsius / Fahrenheit ───────────────────────────────────────────────
f = Q(9, 5) * x + 32
ok(affine(f) == (Q(9, 5), 32), "A02 1a m=1.8, p=32")
ok(Q(9, 5) > 0, "A02 1b croissante")
ok(f.subs(x, 1) - f.subs(x, 0) == Q(9, 5), "A02 1c +1 °C -> +1.8 °F")
ok(f.subs(x, 0) == 32, "A02 2a 0 °C = 32 °F")
ok(f.subs(x, 100) == 212, "A02 2b 100 °C = 212 °F")
ok(sol_lin(f, Q(986, 10)) == [37], "A02 3 98.6 °F = 37 °C")
ok(F(666, 10) / F(18, 10) == 37, "A02 3 66.6/1.8=37")
ok(sol_lin(f, x) == [-40], "A02 4 f(x)=x -> -40")
ok(f.subs(x, -40) == -40, "A02 4 vérification f(-40)=-40")

# ── A03 réservoir ──────────────────────────────────────────────────────────
f = 60 - Q(6, 100) * x
ok(F(6, 100) == F(6, 100) and float(F(6, 100)) == 0.06, "A03 1a 0.06 L/km")
ok(affine(f) == (Q(-6, 100), 60), "A03 1c m=-0.06, p=60")
ok(Q(-6, 100) < 0, "A03 2a décroissante")
ok(f.subs(x, 1) - f.subs(x, 0) == Q(-6, 100), "A03 2b -0.06 L par km")
ok(sol_lin(f, 0) == [1000], "A03 3 panne sèche à 1000 km")
ok(sol_lin(f, 15) == [750], "A03 4 réserve à 750 km")
ok(f.subs(x, 750) == 15, "A03 4 vérification f(750)=15")

# ── A04 cinéma ─────────────────────────────────────────────────────────────
f = 9 * x
g = 5 * x + 36
ok(f.subs(x, 5) == 45, "A04 1a A : 45")
ok(g.subs(x, 5) == 61, "A04 1a B : 61")
ok(affine(f) == (9, 0), "A04 1c f linéaire")
ok(affine(g) == (5, 36), "A04 1c g affine non linéaire")
ok(sol_lin(f, g) == [9], "A04 2a égalité à 9 places")
ok(f.subs(x, 9) == 81 and g.subs(x, 9) == 81, "A04 2a 81 €")
ok(sol_ineq(g < f) == sp.Interval.open(9, sp.oo), "A04 2b x>9")
ok(min(v for v in range(0, 50) if g.subs(x, v) < f.subs(x, v)) == 10, "A04 2c à partir de 10 places")

# ── A05 location de voiture ────────────────────────────────────────────────
f = Q(1, 5) * x + 50
g = Q(3, 10) * x + 30
ok(affine(f) == (Q(1, 5), 50), "A05 1 f(x)=0.2x+50")
ok(affine(g) == (Q(3, 10), 30), "A05 1 g(x)=0.3x+30")
ok(sol_lin(f, g) == [200], "A05 égalité à 200 km")
ok(f.subs(x, 200) == 90, "A05 prix commun 90 €")
# lecture : le point commun et les ordonnées lues tombent sur la grille 50 ; 10
ok(200 % 50 == 0 and 90 % 10 == 0, "A05 point commun sur un nœud")
ok(f.subs(x, 150) == 80, "A05 f(150)=80")
ok(g.subs(x, 150) == 75, "A05 g(150)=75")
ok(f.subs(x, 150) - g.subs(x, 150) == 5, "A05 B moins chère de 5 € à 150 km")
ok(f.subs(x, 350) == 120, "A05 f(350)=120")
ok(g.subs(x, 350) == 135, "A05 g(350)=135")
ok(g.subs(x, 350) - f.subs(x, 350) == 15, "A05 A moins chère de 15 € à 350 km")
ok(sp.Interval(0, 400).intersect(sol_ineq(g < f)) == sp.Interval.Ropen(0, 200), "A05 g<f sur [0;200[")
ok(max(f.subs(x, 400), g.subs(x, 400)) <= 160, "A05 fenêtre y: 0 ; 160 suffit")

# ── A06 pourcentages ───────────────────────────────────────────────────────
ok(F(50) * F(6, 5) == 60, "A06 1a 50 € +20 % = 60 €")
ok(sp.expand(x + Q(1, 5) * x) == Q(6, 5) * x, "A06 1b f(x)=1.2x")
ok(sp.expand(x - Q(3, 10) * x) == Q(7, 10) * x, "A06 2 g(x)=0.7x")
ok(sp.expand(Q(7, 10) * Q(6, 5) * x) == Q(21, 25) * x, "A06 3a h(x)=0.84x")
ok(1 - F(21, 25) == F(16, 100), "A06 3b baisse de 16 %")
ok(sol_lin(Q(6, 5) * x, 54) == [45], "A06 4 prix initial 45 €")

# ── A07 proportionnel ou affine ────────────────────────────────────────────
ok(affine(4 * x) == (4, 0), "A07 1a périmètre linéaire")
ok(affine(x**2) is None, "A07 1b aire non affine")
ok((1**2 - 0**2, 2**2 - 1**2) == (1, 3), "A07 1b accroissements 1 puis 3")
ok(affine(2 * x + 5) == (2, 5), "A07 1c affine non linéaire")
ok((2 * 2 + 5, 2 * 4 + 5, 2 * 9) == (9, 13, 18), "A07 1c 9 €, 13 €, pas 18 €")
X, Y = [1, 2, 4, 7], [5, 8, 14, 23]
taux = [F(Y[i + 1] - Y[i], X[i + 1] - X[i]) for i in range(3)]
ok(taux == [3, 3, 3], "A07 2a taux constants 3")
ok(all(3 * u + 2 == v for u, v in zip(X, Y)), "A07 2a y=3x+2")
X, Y = [0, 1, 2, 3], [1, 2, 4, 8]
taux = [F(Y[i + 1] - Y[i], X[i + 1] - X[i]) for i in range(3)]
ok(taux == [1, 2, 4], "A07 2b taux 1, 2, 4 non constants")

# ── A08 démonstration ──────────────────────────────────────────────────────
fa = m * a + p
fb = m * b + p
ok(sp.expand((fb - fa) - m * (b - a)) == 0, "A08 1a f(b)-f(a)=m(b-a)")
ok(sp.expand((m * 5 + p) - (m * 3 + p)) == 2 * m, "A08 2a f(5)-f(3)=2m")
ok(sp.simplify(m * (b - a) / (b - a)) == m, "A08 3 taux = m")
# contrôle numérique du sens de variation selon le signe de m
for mv, signe in [(2, 1), (-3, -1), (0, 0)]:
    ok(sp.sign((mv * 5 + 1) - (mv * 2 + 1)) == signe, f"A08 1c-e m={mv}")

# ── A09 droite, variations et signe ────────────────────────────────────────
mm = F(-3 - 6, 2 - (-1))
ok(mm == -3, "A09 1a m=-3")
pp = 6 - mm * (-1)
ok(pp == 3, "A09 1b p=3")
f = -3 * x + 3
ok(f.subs(x, -1) == 6 and f.subs(x, 2) == -3, "A09 1b vérification")
ok(sol_lin(f, 0) == [1], "A09 3a S={1}")
ok(sol_ineq(f > 0) == sp.Interval.open(-sp.oo, 1), "A09 3b positif avant 1")
ok(sol_ineq(f < 0) == sp.Interval.open(1, sp.oo), "A09 3b négatif après 1")
ok(f.subs(x, 0) == 3, "A09 4a point (0 ; 3)")
ok(-7 <= f.subs(x, 3) and f.subs(x, -2) <= 10, "A09 4a tracé dans la fenêtre")

print(f"✅ {n} assertions vérifiées")
