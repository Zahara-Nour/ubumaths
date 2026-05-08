# Algorithme de Fisher-Yates : mélange uniforme d'une liste en O(n)
# C'est ce que random.shuffle utilise en interne.

import random


def fisher_yates(liste):
    """Mélange la liste en place. Garanti uniforme."""
    n = len(liste)
    for i in range(n - 1, 0, -1):
        # Choisir j dans [0, i] inclus
        j = random.randint(0, i)
        liste[i], liste[j] = liste[j], liste[i]
    return liste


# Test sur un jeu de cartes
cartes = [f"{v}{c}" for c in "♠♥♦♣" for v in ("A", "R", "D", "V", "10", "9", "8", "7")]
print(f"Avant : {cartes[:8]} ... ({len(cartes)} cartes)")

fisher_yates(cartes)
print(f"Après : {cartes[:8]} ...")

# Vérification empirique : sur 6000 mélanges d'une liste de 3 éléments,
# chaque permutation doit apparaître ≈ 1000 fois (uniformité).
from collections import Counter

c = Counter()
for _ in range(6000):
    liste = [1, 2, 3]
    fisher_yates(liste)
    c[tuple(liste)] += 1

print("\n6000 mélanges de [1, 2, 3] :")
for perm, n in sorted(c.items()):
    print(f"  {perm} : {n}  ({n / 6000:.1%})")
