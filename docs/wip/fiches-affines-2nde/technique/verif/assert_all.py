"""Vérification des résultats des corrigés de la fiche « Fonctions affines : entraînement technique ».
Une assertion par résultat annoncé dans sol/ (et sol-en/, identique).
Lancer : scripts/fiches/.venv/bin/python -I docs/wip/fiches-affines-2nde/technique/verif/assert_all.py
"""
from fractions import Fraction as F
import sympy as sp

x = sp.symbols("x", real=True)
R = sp.S.Reals
n = 0


def ok(cond, msg):
    global n
    assert cond, msg
    n += 1


def affine(expr):
    """(m, p) si expr est affine en x, sinon None."""
    e = sp.expand(expr)
    poly = sp.Poly(e, x) if e.is_polynomial(x) else None
    if poly is None or poly.degree() > 1:
        return None
    return sp.nsimplify(e.coeff(x, 1)), sp.nsimplify(e.coeff(x, 0))


def solve_set(rel):
    return sp.solveset(rel, x, R)


# --- T01 ---
fs = {1: 3*x - 5, 2: -2*x, 3: x**2 + 1, 4: sp.Integer(7), 5: (x - 4)/3, 6: 1/x + 2, 7: 5 - x, 8: sp.sqrt(2)*x}
attendu = {1: (3, -5), 2: (-2, 0), 4: (0, 7), 5: (sp.Rational(1, 3), sp.Rational(-4, 3)), 7: (-1, 5), 8: (sp.sqrt(2), 0)}
for i, (m, p) in attendu.items():
    ok(affine(fs[i]) == (m, p), f"T01 f{i} : m={m}, p={p}")
ok(affine(fs[3]) is None, "T01 f3 non affine")
ok(not fs[6].is_polynomial(x), "T01 f6 non affine")
ok(fs[3].subs(x, 1) - fs[3].subs(x, 0) == 1 and fs[3].subs(x, 2) - fs[3].subs(x, 1) == 3, "T01 écarts f3")
for i in (2, 8):
    ok(attendu[i][1] == 0, f"T01 f{i} linéaire")
for i in (1, 4, 5, 7):
    ok(attendu[i][1] != 0, f"T01 f{i} non linéaire")

# --- T02 ---
ok(sp.expand((x + 1)**2 - x**2) == 2*x + 1, "T02 1")
ok(sp.expand(3*(x - 2) - (4 - x)) == 4*x - 10, "T02 2")
ok(sp.expand(x*(x + 3) - x**2) == 3*x, "T02 3")
ok(sp.expand((2*x - 1)*(x + 1)) == 2*x**2 + x - 1, "T02 4")
ok(sp.expand((x + 3)**2 - (x - 3)**2) == 12*x, "T02 5")

# --- T03 ---
f = lambda t: -3*t + 4
for a, v in [(0, 4), (2, -2), (-1, 7), (F(1, 3), 3), (F(-2, 3), 6)]:
    ok(f(F(a)) == v, f"T03 f({a})")
g = lambda t: t/2 - 1
for a, v in [(4, 1), (-6, -4), (1, F(-1, 2))]:
    ok(g(F(a)) == v, f"T03 g({a})")

# --- T04 ---
f = lambda t: 2*t - 3
for a, v in [(-2, -7), (-1, -5), (0, -3), (F(1, 2), -2), (3, 3)]:
    ok(f(F(a)) == v, f"T04 f({a})")
ok(solve_set(sp.Eq(2*x - 3, 7)) == sp.FiniteSet(5), "T04 antécédent de 7")
ok(solve_set(sp.Eq(2*x - 3, 0)) == sp.FiniteSet(sp.Rational(3, 2)), "T04 antécédent de 0")


# --- T05 ---
def deux_images(a, fa, b, fb):
    m = F(fb - fa, b - a)
    return m, fa - m*a


ok(deux_images(1, 5, 3, 9) == (2, 3), "T05 1")
ok(deux_images(-2, 7, 4, -5) == (-2, 3), "T05 2")
ok(deux_images(0, -1, 6, 3) == (F(2, 3), -1), "T05 3")
ok(deux_images(2, 4, 5, 4) == (0, 4), "T05 4")

# --- T06 ---
ok(1 - 3*2 == -5, "T06 1 : p=-5")
ok(0 - F(-1, 2)*4 == 2, "T06 2 : p=2")
ok(2 - 4*(-1) == 6, "T06 3 : p=6")
ok(F(-15, 5) == -3, "T06 4 : m=-3")

# --- T07 : lectures (p = f(0), m = f(1)-f(0) ou (f(2)-f(0))/2) sur des nœuds ---
for expr, m, p in [(2*x - 1, 2, -1), (-x + 3, -1, 3), (x/2 + 2, F(1, 2), 2), (sp.Integer(-2), 0, -2)]:
    ok(affine(expr) == (sp.nsimplify(m), sp.nsimplify(p)), f"T07 {expr}")
ok((2*x - 1).subs(x, 1) == 1 and (-x + 3).subs(x, 1) == 2 and (x/2 + 2).subs(x, 2) == 3, "T07 nœuds lus")

# --- T08 : points du corrigé ---
for expr, pts in [(2*x - 3, [(0, -3), (2, 1)]), (-x/3 + 2, [(0, 2), (3, 1)]),
                  (sp.Integer(-1), [(0, -1), (2, -1)]), (-sp.Rational(3, 2)*x, [(0, 0), (2, -3)])]:
    for a, b in pts:
        ok(expr.subs(x, a) == b, f"T08 {expr} en {a}")

# --- T09 ---
f = lambda t: -2*t + 5
ok(f(F(1)) == 3, "T09 A sur la droite")
ok(f(F(-2)) == 9 and 9 != 1, "T09 B hors de la droite")
ok(f(F(3, 2)) == 2, "T09 C sur la droite")
ok(f(F(10)) == -15 and -15 != -14, "T09 D hors de la droite")
ok(f(F(-4)) == 13, "T09 E : y=13")
ok(solve_set(sp.Eq(-2*x + 5, 0)) == sp.FiniteSet(sp.Rational(5, 2)), "T09 F : x=5/2")

# --- T10 ---
for expr, m in [(-4*x + 1, -4), (x/5 - 7, sp.Rational(1, 5)), (sp.Integer(3), 0), ((1 - 3*x)/2, sp.Rational(-3, 2))]:
    ok(affine(expr)[0] == m, f"T10 m de {expr}")
ok((-4*x + 1).subs(x, -2) == 9, "T10 f1(-2)")
ok((-4*x + 1).subs(x, 3) == -11, "T10 f1(3)")

# --- T11 ---
f = lambda t: -3*t + 2
ok(sp.sqrt(2) > sp.Rational(14, 10) and F(14, 10)**2 == F(196, 100), "T11 1,4 < racine de 2")
ok(f(sp.sqrt(2)) < f(sp.Rational(14, 10)), "T11 f(rac2) < f(1.4)")
ok(f(-sp.pi) > f(-3), "T11 f(-pi) > f(-3)")
g = lambda t: t/4 + 1
ok(g(F(1, 1000)) < g(F(1, 100)), "T11 g(0.001) < g(0.01)")
ok(F(1 - 5, 7 - 2) == F(-4, 5), "T11 m de h = -4/5")

# --- T12 : zéro et signe à gauche / à droite ---
for expr, z, gauche, droite in [(2*x - 6, 3, -1, 1), (-3*x + 1, sp.Rational(1, 3), 1, -1),
                                (x/2 + 4, -8, -1, 1), (5 - 2*x, sp.Rational(5, 2), 1, -1)]:
    ok(solve_set(sp.Eq(expr, 0)) == sp.FiniteSet(z), f"T12 zéro de {expr}")
    ok(sp.sign(expr.subs(x, z - 1)) == gauche and sp.sign(expr.subs(x, z + 1)) == droite, f"T12 signes de {expr}")

# --- T13 ---
ok(solve_set(3*x - 12 > 0) == sp.Interval.open(4, sp.oo), "T13 1")
ok(solve_set(-2*x + 7 >= 0) == sp.Interval(-sp.oo, sp.Rational(7, 2)), "T13 2")
ok(solve_set(5*x + 1 < 2*x - 8) == sp.Interval.open(-sp.oo, -3), "T13 3")
ok(solve_set(4 - x <= 3*x + 6) == sp.Interval(sp.Rational(-1, 2), sp.oo), "T13 4")

# --- T14 ---
ok(solve_set(sp.Eq(-2*x + 3, -7)) == sp.FiniteSet(5), "T14 1")
ok(solve_set(-2*x + 3 < 1) == sp.Interval.open(1, sp.oo), "T14 2")
ok(solve_set(-2*x + 3 >= 5) == sp.Interval(-sp.oo, -1), "T14 3")

# --- T15 ---
ok(solve_set(sp.Eq(3*x - 1, -x + 7)) == sp.FiniteSet(2), "T15 abscisse commune")
ok((3*x - 1).subs(x, 2) == 5 and (-x + 7).subs(x, 2) == 5, "T15 point (2 ; 5)")
ok(solve_set(3*x - 1 > -x + 7) == sp.Interval.open(2, sp.oo), "T15 f > g")

print(f"✅ {n} assertions vérifiées.")
