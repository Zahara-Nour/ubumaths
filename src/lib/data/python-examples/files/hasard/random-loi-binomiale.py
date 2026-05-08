import random
import matplotlib.pyplot as plt
from collections import Counter

# Loi binomiale : nombre de succès sur n épreuves de Bernoulli
# indépendantes de paramètre p.
# Exemple : 20 tirs avec p=0.3 de succès, répété 10000 fois.

n_epreuves = 20
p_succes = 0.3
n_simulations = 10_000


def une_experience(n, p):
    return sum(1 for _ in range(n) if random.random() < p)


resultats = [une_experience(n_epreuves, p_succes) for _ in range(n_simulations)]

# Distribution empirique
freq = Counter(resultats)
xs = sorted(freq)
ys = [freq[k] / n_simulations for k in xs]

plt.figure(figsize=(9, 5))
plt.bar(xs, ys, color="steelblue", edgecolor="black")
plt.title(f"Loi binomiale empirique — n={n_epreuves}, p={p_succes}, {n_simulations} simulations")
plt.xlabel("Nombre de succès")
plt.ylabel("Fréquence empirique")
plt.axvline(n_epreuves * p_succes, color="red", linestyle="--",
            label=f"Espérance = np = {n_epreuves * p_succes}")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()

print(f"Moyenne empirique : {sum(resultats) / n_simulations:.3f}")
print(f"Espérance théorique (np) : {n_epreuves * p_succes}")
