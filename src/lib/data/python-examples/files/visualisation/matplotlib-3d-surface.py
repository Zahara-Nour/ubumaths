import numpy as np
import matplotlib.pyplot as plt

# Surface 3D : z = f(x, y) = sin(√(x² + y²))
x = np.linspace(-5, 5, 80)
y = np.linspace(-5, 5, 80)
X, Y = np.meshgrid(x, y)
R = np.sqrt(X ** 2 + Y ** 2)
Z = np.sin(R)

fig = plt.figure(figsize=(10, 7))
ax = fig.add_subplot(111, projection="3d")

surf = ax.plot_surface(X, Y, Z, cmap="viridis", alpha=0.9, edgecolor="none")

ax.set_title("z = sin(√(x² + y²))  — fonction radiale")
ax.set_xlabel("x")
ax.set_ylabel("y")
ax.set_zlabel("z")

fig.colorbar(surf, ax=ax, shrink=0.6, aspect=10, label="z")

plt.tight_layout()
plt.show()
