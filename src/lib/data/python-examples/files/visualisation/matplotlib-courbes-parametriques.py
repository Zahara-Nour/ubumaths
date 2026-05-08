import numpy as np
import matplotlib.pyplot as plt

# Courbes paramétriques : x = f(t), y = g(t)
t = np.linspace(0, 2 * np.pi, 1000)

fig, axes = plt.subplots(1, 3, figsize=(13, 4))

# 1. Lissajous (a/b rationnel → courbe fermée)
a, b = 3, 2
x1 = np.sin(a * t)
y1 = np.sin(b * t + np.pi / 2)
axes[0].plot(x1, y1, color="steelblue")
axes[0].set_title(f"Lissajous ({a}:{b})")
axes[0].set_aspect("equal")

# 2. Cycloïde (point d'un cercle qui roule)
x2 = t - np.sin(t)
y2 = 1 - np.cos(t)
axes[1].plot(x2, y2, color="darkorange")
axes[1].set_title("Cycloïde")
axes[1].set_aspect("equal")

# 3. Spirale d'Archimède
r = 0.3 * t
x3 = r * np.cos(t)
y3 = r * np.sin(t)
axes[2].plot(x3, y3, color="firebrick")
axes[2].set_title("Spirale d'Archimède")
axes[2].set_aspect("equal")

for ax in axes:
    ax.grid(True, alpha=0.3)
    ax.axhline(0, color="gray", linewidth=0.5)
    ax.axvline(0, color="gray", linewidth=0.5)

plt.tight_layout()
plt.show()
