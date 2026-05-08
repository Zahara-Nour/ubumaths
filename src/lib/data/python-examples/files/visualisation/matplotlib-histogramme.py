import numpy as np
import matplotlib.pyplot as plt

# Simulation de 1000 lancers de 3 dés
rng = np.random.default_rng(42)
lancers = rng.integers(1, 7, size=(1000, 3)).sum(axis=1)

plt.figure(figsize=(8, 4))
plt.hist(
    lancers,
    bins=range(3, 20),
    edgecolor="black",
    color="steelblue",
    align="left",
)

plt.title("Somme de 3 dés sur 1000 lancers")
plt.xlabel("Somme")
plt.ylabel("Effectif")
plt.xticks(range(3, 19))
plt.axvline(lancers.mean(), color="red", linestyle="--", label=f"moyenne = {lancers.mean():.2f}")
plt.legend()
plt.tight_layout()
plt.show()

print(f"Moyenne empirique : {lancers.mean():.3f} (théorique : 10.5)")
