import random
from collections import Counter

# Lancer 2 dés N fois et étudier la distribution des sommes
N = 10_000
sommes = [random.randint(1, 6) + random.randint(1, 6) for _ in range(N)]

# Comptage par valeur
freq = Counter(sommes)

print(f"Distribution sur {N} lancers :")
print("Somme | Effectif | Fréquence | Théorique")
print("-" * 45)

# Probabilités théoriques (nombre de combinaisons / 36)
theoriques = {2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6,
              8: 5, 9: 4, 10: 3, 11: 2, 12: 1}

for s in range(2, 13):
    n = freq[s]
    print(f"  {s:3d} | {n:7d}  |  {n / N:.3%}   |  {theoriques[s] / 36:.3%}")

print(f"\nMoyenne empirique : {sum(sommes) / N:.3f}")
print("Espérance théorique : 7 (somme la plus probable)")
