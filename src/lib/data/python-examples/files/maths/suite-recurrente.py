import matplotlib.pyplot as plt

# Suite récurrente : u(n+1) = f(u(n))
# Exemple : suite logistique u(n+1) = r·u(n)·(1 - u(n))
# Comportement étonnant : convergence simple, cycles, chaos selon r

def suite_logistique(r, u0, n):
    suite = [u0]
    for _ in range(n):
        suite.append(r * suite[-1] * (1 - suite[-1]))
    return suite


# Tracé pour différentes valeurs de r
fig, axes = plt.subplots(2, 2, figsize=(11, 7))
parametres = [
    (2.5, "Convergence vers un point fixe"),
    (3.2, "Cycle de période 2"),
    (3.5, "Cycle de période 4"),
    (3.9, "Chaotique"),
]

for ax, (r, titre) in zip(axes.flat, parametres):
    suite = suite_logistique(r, 0.5, 50)
    ax.plot(suite, "o-", markersize=3, color="steelblue")
    ax.set_title(f"r = {r}\n{titre}")
    ax.set_xlabel("n")
    ax.set_ylabel("u(n)")
    ax.grid(True, alpha=0.3)
    ax.set_ylim(-0.05, 1.05)

plt.tight_layout()
plt.show()

# Affichage texte pour r = 3.9 (chaos)
print("Premières valeurs de la suite chaotique (r=3.9, u₀=0.5) :")
for n, v in enumerate(suite_logistique(3.9, 0.5, 10)):
    print(f"  u({n}) = {v:.6f}")
