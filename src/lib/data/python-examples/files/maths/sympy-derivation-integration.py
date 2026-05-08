from sympy import symbols, diff, integrate, sin, cos, exp, ln, simplify, Rational

x = symbols("x")

# Dérivée
f = x ** 3 - 2 * x ** 2 + x - 5
print(f"f(x) = {f}")
print(f"f'(x) = {diff(f, x)}")
print(f"f''(x) = {diff(f, x, 2)}")

# Dérivée de fonctions usuelles
print()
for f in [sin(x), cos(x), exp(x), ln(x), x ** Rational(1, 2)]:
    print(f"  ({f})' = {diff(f, x)}")

# Intégrale indéfinie (primitive)
print()
print(f"∫ x² dx = {integrate(x ** 2, x)} (+ C)")
print(f"∫ sin(x) dx = {integrate(sin(x), x)} (+ C)")

# Intégrale définie
print(f"\n∫₀¹ x² dx = {integrate(x ** 2, (x, 0, 1))}")
print(f"∫₀^π sin(x) dx = {integrate(sin(x), (x, 0, 'pi'))}")
print(f"∫₁^e (1/x) dx = {integrate(1 / x, (x, 1, 'E'))}")

# Vérification : ∫f' = f (théorème fondamental)
f = x ** 3 + 2 * x
verif = integrate(diff(f, x), x)
print(f"\n∫f'(x) dx = {verif} (≡ f(x) à constante près)")
