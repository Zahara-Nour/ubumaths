import numpy as np
import matplotlib.pyplot as plt

x = np.linspace(0, 2 * np.pi, 200)

plt.figure(figsize=(8, 4))
plt.plot(x, np.sin(x), label="sin(x)", linewidth=2)
plt.plot(x, np.cos(x), label="cos(x)", linewidth=2, linestyle="--")

# Mise en forme
plt.title("Sinus et cosinus")
plt.xlabel("x (radians)")
plt.ylabel("y")
plt.axhline(0, color="gray", linewidth=0.5)
plt.axvline(0, color="gray", linewidth=0.5)
plt.grid(True, alpha=0.3)
plt.legend()
plt.tight_layout()
plt.show()
