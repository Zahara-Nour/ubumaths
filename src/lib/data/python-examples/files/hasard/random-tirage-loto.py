import random

# Tirage du Loto français : 5 numéros parmi 49 + 1 numéro chance parmi 10
# Sample = tirage SANS remise (pas de doublons)

def tirage_loto():
    boules = sorted(random.sample(range(1, 50), 5))
    chance = random.randint(1, 10)
    return boules, chance


print("=== 5 grilles tirées au sort ===\n")
for i in range(5):
    boules, chance = tirage_loto()
    boules_str = " - ".join(f"{n:2d}" for n in boules)
    print(f"Grille {i + 1} : {boules_str}   chance : {chance}")

# Probabilité de gagner le jackpot ?
from math import comb
parmi_49 = comb(49, 5)
total = parmi_49 * 10
print(f"\nNombre total de grilles possibles : {total:,}")
print(f"Probabilité du jackpot : 1 / {total:,} ≈ {1 / total:.2e}")
