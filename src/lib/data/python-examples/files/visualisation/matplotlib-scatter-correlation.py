import numpy as np
import matplotlib.pyplot as plt

# Données : taille (cm) vs poids (kg) pour 12 personnes
taille = np.array([155, 160, 162, 165, 168, 170, 172, 175, 178, 180, 183, 188])
poids = np.array([50, 54, 58, 60, 62, 64, 68, 70, 72, 75, 78, 85])

# Régression linéaire : y = a x + b (méthode des moindres carrés)
a, b = np.polyfit(taille, poids, 1)
print(f"Droite de régression : y = {a:.3f} x + {b:.2f}")

# Coefficient de corrélation r et r² (qualité de l'ajustement)
r = np.corrcoef(taille, poids)[0, 1]
print(f"r  = {r:.3f}")
print(f"r² = {r ** 2:.3f}")

# Tracé
plt.figure(figsize=(8, 5))
plt.scatter(taille, poids, s=50, color="steelblue", label="Mesures")

x_droite = np.array([taille.min(), taille.max()])
signe = "+" if b >= 0 else "−"
plt.plot(
    x_droite,
    a * x_droite + b,
    color="red",
    linewidth=2,
    label=f"y = {a:.2f} x {signe} {abs(b):.1f}",
)

plt.title("Poids en fonction de la taille — régression linéaire")
plt.xlabel("Taille (cm)")
plt.ylabel("Poids (kg)")
plt.grid(True, alpha=0.3)
plt.legend()
plt.tight_layout()
plt.show()
