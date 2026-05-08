import random
import matplotlib.pyplot as plt

# Marche aléatoire 2D : à chaque pas, on choisit une des 4 directions
def marche_2d(n_pas):
    x, y = 0, 0
    xs, ys = [0], [0]
    for _ in range(n_pas):
        dx, dy = random.choice([(1, 0), (-1, 0), (0, 1), (0, -1)])
        x += dx
        y += dy
        xs.append(x)
        ys.append(y)
    return xs, ys


plt.figure(figsize=(8, 8))
for i in range(3):
    xs, ys = marche_2d(2000)
    plt.plot(xs, ys, alpha=0.6, linewidth=0.8)
    plt.plot(xs[0], ys[0], "go", markersize=10)   # départ
    plt.plot(xs[-1], ys[-1], "rs", markersize=10) # arrivée

plt.title("3 marches aléatoires 2D (2000 pas)")
plt.xlabel("x")
plt.ylabel("y")
plt.axis("equal")
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()
