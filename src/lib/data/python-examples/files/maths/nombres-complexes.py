import math
import cmath

# En Python, j (et non i) désigne l'imaginaire pur
z1 = 3 + 4j
z2 = complex(1, 2)     # 1 + 2j
print(z1, z2)

# Parties réelle et imaginaire
print(f"Re(z1) = {z1.real}, Im(z1) = {z1.imag}")

# Module, argument, conjugué
print(f"|z1| = {abs(z1)}")
print(f"arg(z1) = {cmath.phase(z1):.4f} rad ({math.degrees(cmath.phase(z1)):.2f}°)")
print(f"conjugué(z1) = {z1.conjugate()}")

# Addition, multiplication
print(f"\nz1 + z2 = {z1 + z2}")
print(f"z1 * z2 = {z1 * z2}")
print(f"z1 / z2 = {z1 / z2}")

# Forme exponentielle (Euler) : z = r·e^(iθ)
import cmath
r, theta = cmath.polar(z1)
print(f"\nForme polaire de z1 : r = {r}, θ = {theta:.4f} rad")
z_reconstruit = cmath.rect(r, theta)
print(f"Reconstruction : {z_reconstruit}")

# Identité d'Euler : e^(iπ) + 1 = 0
print(f"\ne^(iπ) + 1 = {cmath.exp(1j * math.pi) + 1}  (≈ 0)")

# Racines d'une équation : z² = -1
print(f"\nRacines de z² = -1 : {cmath.sqrt(-1)} et {-cmath.sqrt(-1)}")

# Racines n-ièmes de l'unité
n = 6
print(f"\n{n} racines {n}-ièmes de l'unité :")
for k in range(n):
    racine = cmath.exp(2j * math.pi * k / n)
    print(f"  z_{k} = {racine.real:+.3f} + {racine.imag:+.3f}j")
