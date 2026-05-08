from sympy import symbols, limit, sin, cos, ln, exp, oo, Rational

x = symbols("x")

# Limites classiques
print("Limites usuelles :")
print(f"  sin(x)/x quand x → 0  = {limit(sin(x) / x, x, 0)}")
print(f"  (1 + 1/x)^x quand x → ∞ = {limit((1 + 1 / x) ** x, x, oo)}")  # = e
print(f"  ln(x)/x quand x → ∞    = {limit(ln(x) / x, x, oo)}")
print(f"  (1 - cos(x))/x² quand x → 0 = {limit((1 - cos(x)) / x ** 2, x, 0)}")

# Limites à gauche / à droite
print(f"\n1/x quand x → 0⁺ = {limit(1 / x, x, 0, '+')}")
print(f"1/x quand x → 0⁻ = {limit(1 / x, x, 0, '-')}")

# Limite avec forme indéterminée 0/0
expr = (x ** 2 - 1) / (x - 1)
print(f"\n(x² - 1)/(x - 1) quand x → 1 = {limit(expr, x, 1)}")
print("  Pourquoi ? Factorisation : (x-1)(x+1)/(x-1) = x+1 → 2")

# Asymptotes : limite en ±∞
g = (3 * x ** 2 + 2 * x - 1) / (x ** 2 + 1)
print(f"\nLimite à l'∞ de (3x² + 2x - 1)/(x² + 1) = {limit(g, x, oo)}")
print(f"  → asymptote horizontale y = {limit(g, x, oo)}")
