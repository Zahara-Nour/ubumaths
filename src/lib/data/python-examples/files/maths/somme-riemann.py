import math

# Approximation d'une intégrale par sommes de Riemann.
# ∫_a^b f(x) dx ≈ Σ f(xᵢ) × Δx

def integrale_rectangles_gauche(f, a, b, n):
    """Méthode des rectangles à gauche."""
    dx = (b - a) / n
    return sum(f(a + i * dx) for i in range(n)) * dx


def integrale_rectangles_milieu(f, a, b, n):
    """Méthode du point milieu (plus précise)."""
    dx = (b - a) / n
    return sum(f(a + (i + 0.5) * dx) for i in range(n)) * dx


def integrale_trapezes(f, a, b, n):
    """Méthode des trapèzes."""
    dx = (b - a) / n
    s = (f(a) + f(b)) / 2
    s += sum(f(a + i * dx) for i in range(1, n))
    return s * dx


# Test : ∫₀¹ x² dx = 1/3 (≈ 0.3333)
exacte = 1 / 3
print(f"∫₀¹ x² dx — valeur exacte : {exacte:.6f}")
print(f"\n{'n':>6} | {'gauche':>12} | {'milieu':>12} | {'trapèze':>12}")
for n in [10, 100, 1000, 10000]:
    g = integrale_rectangles_gauche(lambda x: x ** 2, 0, 1, n)
    m = integrale_rectangles_milieu(lambda x: x ** 2, 0, 1, n)
    t = integrale_trapezes(lambda x: x ** 2, 0, 1, n)
    print(f"{n:6d} | {g:12.8f} | {m:12.8f} | {t:12.8f}")

# Test 2 : ∫₀^π sin(x) dx = 2
print(f"\n∫₀^π sin(x) dx — valeur exacte : 2")
n = 1000
print(f"  Trapèzes (n=1000) : {integrale_trapezes(math.sin, 0, math.pi, n):.10f}")
