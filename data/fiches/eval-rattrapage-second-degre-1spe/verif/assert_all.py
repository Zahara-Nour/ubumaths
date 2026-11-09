# Vérification de chaque résultat des corrigés (sympy). Usage : python3 assert_all.py
from sympy import symbols, Rational as Q, expand, solve, solveset, S, Interval, factor, diff, discriminant

Reels = S.Reals
x = symbols('x', real=True)

# --- Dauphin -----------------------------------------------------------------
a = symbols('a')
assert solve(a * 1 * (1 - 6) - Q(5, 2), a) == [Q(-1, 2)]
h = Q(-1, 2) * x * (x - 6)
assert expand(h) == expand(-Q(1, 2) * x**2 + 3 * x)
assert expand(h - (-Q(1, 2) * (x - 3) ** 2 + Q(9, 2))) == 0
assert h.subs(x, 0) == 0 and h.subs(x, 6) == 0 and h.subs(x, 1) == Q(5, 2)
assert solve(diff(h, x), x) == [3] and h.subs(x, 3) == Q(9, 2)
assert sorted(solve(h - 4, x)) == [2, 4]
assert solveset(h >= Q(5, 2), x, Reels) == Interval(1, 5)

# --- Massif ------------------------------------------------------------------
aire_triangle = x * (10 - x) / 2
Sx = 100 - 4 * aire_triangle
assert expand(Sx) == expand(2 * x**2 - 20 * x + 100)
assert solve(diff(Sx, x), x) == [5] and Sx.subs(x, 5) == 50
F = 100 - Sx
assert expand(F) == expand(-2 * x**2 + 20 * x)
assert discriminant(x**2 - 10 * x + 21, x) == 16
assert solveset(F >= 42, x, Reels) == Interval(3, 7)

# --- Bougies -----------------------------------------------------------------
C = Q(1, 2) * x**2 + 6 * x + 160
B = 30 * x - C
assert expand(B) == expand(-Q(1, 2) * x**2 + 24 * x - 160)
assert expand(B - (-Q(1, 2) * (x - 8) * (x - 40))) == 0
assert expand((x - 8) * (x - 40)) == x**2 - 48 * x + 320
assert solveset(B > 0, x, Reels) == Interval.open(8, 40)
assert solve(diff(B, x), x) == [24] and B.subs(x, 24) == 128
assert 24**2 == 576 and -Q(1, 2) * 576 + 576 - 160 == 128

print('✅ toutes les assertions passent')
