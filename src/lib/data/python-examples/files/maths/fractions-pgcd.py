from fractions import Fraction
from math import gcd, lcm

# Le module Fraction évite les erreurs d'arrondi
a = Fraction(1, 3)
b = Fraction(1, 6)
print(f"{a} + {b} = {a + b}")
print(f"{a} - {b} = {a - b}")
print(f"{a} * {b} = {a * b}")
print(f"{a} / {b} = {a / b}")

# Comparaison avec les flottants
print("\nAvec floats : 0.1 + 0.2 =", 0.1 + 0.2)
print("Avec Fraction :", Fraction(1, 10) + Fraction(2, 10))

# Fraction depuis un float ou une chaîne
print("\nFraction(0.5) =", Fraction(0.5))
print("Fraction('3/4') =", Fraction("3/4"))

# Simplification automatique
f = Fraction(48, 36)
print(f"\n48/36 simplifié → {f}")

# PGCD et PPCM
print(f"\npgcd(48, 18) = {gcd(48, 18)}")
print(f"ppcm(4, 6)   = {lcm(4, 6)}")
print(f"pgcd(12, 18, 24) = {gcd(12, 18, 24)}")
