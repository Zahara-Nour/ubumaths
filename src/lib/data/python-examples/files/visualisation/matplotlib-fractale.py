import numpy as np
import matplotlib.pyplot as plt

# Ensemble de Mandelbrot : z(n+1) = z(n)² + c, avec z(0) = 0
# c appartient à l'ensemble si la suite reste bornée.

def mandelbrot(c, max_iter=100):
    """Retourne le nombre d'itérations avant divergence (= max_iter si dans l'ensemble)."""
    z = 0
    for n in range(max_iter):
        if abs(z) > 2:
            return n
        z = z * z + c
    return max_iter


# Grille de points dans le plan complexe
# Taille modeste : sur Pyodide (sans JIT), 300×200 prend déjà ~10 s.
# Augmenter pour plus de détail mais s'attendre à un calcul plus long.
largeur, hauteur = 300, 200
re = np.linspace(-2.2, 1.0, largeur)
im = np.linspace(-1.2, 1.2, hauteur)

image = np.zeros((hauteur, largeur))
for i, y in enumerate(im):
    for j, x in enumerate(re):
        image[i, j] = mandelbrot(complex(x, y))

plt.figure(figsize=(11, 7))
plt.imshow(
    image,
    extent=(-2.2, 1.0, -1.2, 1.2),
    cmap="twilight_shifted",
    origin="lower",
)
plt.colorbar(label="itérations avant divergence")
plt.title("Ensemble de Mandelbrot")
plt.xlabel("Re(c)")
plt.ylabel("Im(c)")
plt.tight_layout()
plt.show()
