import math
import random
import matplotlib.pyplot as plt
from collections import Counter

# Planche de Galton : une bille tombe à travers n rangées de clous.
# À chaque clou, elle dévie à gauche ou à droite avec p=0.5.
# La distribution des positions finales tend vers une gaussienne (TCL).

n_rangees = 20
n_billes = 5_000


def chute(n):
    """Position finale après n rangées (entre -n et n par pas de 2)."""
    position = 0
    for _ in range(n):
        position += random.choice([-1, 1])
    return position


positions = [chute(n_rangees) for _ in range(n_billes)]
freq = Counter(positions)

xs = sorted(freq)
ys = [freq[x] for x in xs]

plt.figure(figsize=(10, 5))
plt.bar(xs, ys, width=1.5, color="steelblue", edgecolor="black")
plt.title(f"Planche de Galton — {n_billes} billes, {n_rangees} rangées")
plt.xlabel("Position finale")
plt.ylabel("Effectif")
plt.axvline(0, color="red", linestyle="--", label="Médiane = 0")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()

# Vérification : moyenne ≈ 0, écart-type ≈ √n
moyenne = sum(positions) / n_billes
ec_type = math.sqrt(sum((p - moyenne) ** 2 for p in positions) / n_billes)
print(f"Moyenne empirique : {moyenne:.3f}  (théorique : 0)")
print(f"Écart-type empirique : {ec_type:.3f}  (théorique : √{n_rangees} ≈ {math.sqrt(n_rangees):.2f})")
