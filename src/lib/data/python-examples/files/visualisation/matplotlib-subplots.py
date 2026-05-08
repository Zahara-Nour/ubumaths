import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 2 * np.pi, 200)

# Grille 2×2 de graphiques
fig, axes = plt.subplots(2, 2, figsize=(11, 7))

axes[0, 0].plot(x, np.sin(x), color="steelblue")
axes[0, 0].set_title("sin(x)")

axes[0, 1].plot(x, np.cos(x), color="darkorange")
axes[0, 1].set_title("cos(x)")

axes[1, 0].plot(x, np.tan(x), color="firebrick")
axes[1, 0].set_title("tan(x)")
axes[1, 0].set_ylim(-5, 5)   # tan diverge

axes[1, 1].plot(x, np.sin(x) * np.cos(x), color="seagreen")
axes[1, 1].set_title("sin(x)·cos(x) = ½ sin(2x)")

# Mise en forme commune
for ax in axes.flat:
    ax.grid(True, alpha=0.3)
    ax.axhline(0, color="gray", linewidth=0.5)
    ax.axvline(0, color="gray", linewidth=0.5)

plt.suptitle("Quatre fonctions trigonométriques", fontsize=14)
plt.tight_layout()
plt.show()
