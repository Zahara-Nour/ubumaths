import random

# Étudier la plus longue série de pile (ou face) consécutifs
# sur N lancers. C'est étonnant : sur 100 lancers d'une pièce
# équilibrée, on s'attend à voir une série d'environ 7 d'affilée.

def plus_longue_serie(lancers):
    """Plus longue séquence de valeurs identiques consécutives."""
    if not lancers:
        return 0
    max_serie = courante = 1
    for i in range(1, len(lancers)):
        if lancers[i] == lancers[i - 1]:
            courante += 1
            max_serie = max(max_serie, courante)
        else:
            courante = 1
    return max_serie


# Une expérience : 100 lancers
lancers = random.choices(["P", "F"], k=100)
print("100 lancers : ", "".join(lancers))
print(f"Plus longue série : {plus_longue_serie(lancers)} d'affilée\n")

# Distribution sur 10 000 expériences de 100 lancers
N = 10_000
records = [plus_longue_serie(random.choices([0, 1], k=100)) for _ in range(N)]

print(f"Distribution sur {N} expériences de 100 lancers :")
print("Longueur | Effectif | Fréquence")
print("-" * 35)
from collections import Counter
freq = Counter(records)
for k in sorted(freq):
    print(f"  {k:5d}  | {freq[k]:7d}  | {freq[k] / N:.2%}")

print(f"\nMoyenne : {sum(records) / N:.2f}")
print("Théorique ≈ log₂(N/2) + 1 ≈ 6.6 pour N = 100")
