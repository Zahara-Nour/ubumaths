def euclide_etendu(a, b):
    """Calcule pgcd(a, b) ET les coefficients u, v tels que a*u + b*v = pgcd.
    Identité de Bézout : tout pgcd s'écrit comme combinaison linéaire.
    """
    if b == 0:
        return a, 1, 0
    pgcd, u_prime, v_prime = euclide_etendu(b, a % b)
    u = v_prime
    v = u_prime - (a // b) * v_prime
    return pgcd, u, v


for a, b in [(48, 18), (240, 46), (17, 5), (1071, 462)]:
    d, u, v = euclide_etendu(a, b)
    print(f"pgcd({a}, {b}) = {d}")
    print(f"  Bézout : {a}×({u}) + {b}×({v}) = {a * u + b * v}  ✓\n")

# Application : inverse modulaire
# Si pgcd(a, n) = 1, alors a admet un inverse mod n : a × u ≡ 1 (mod n)
print("Inverses modulaires (utilisé en cryptographie RSA) :")
for a, n in [(3, 11), (7, 26), (5, 17)]:
    d, u, _ = euclide_etendu(a, n)
    if d == 1:
        inv = u % n
        print(f"  {a}⁻¹ ≡ {inv} (mod {n})  →  {a} × {inv} = {a * inv} ≡ {(a * inv) % n} (mod {n})")
