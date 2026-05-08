import random
import matplotlib.pyplot as plt

# Marche aléatoire 1D : à chaque pas, +1 ou -1 avec p=0.5
def marche(n_pas):
    position = 0
    trajectoire = [0]
    for _ in range(n_pas):
        position += random.choice([-1, 1])
        trajectoire.append(position)
    return trajectoire


# 5 trajectoires de 1000 pas
plt.figure(figsize=(10, 5))
for i in range(5):
    plt.plot(marche(1000), alpha=0.7, label=f"trajectoire {i + 1}")

plt.title("Marche aléatoire 1D — 1000 pas")
plt.xlabel("Pas")
plt.ylabel("Position")
plt.axhline(0, color="black", linewidth=0.5)
plt.grid(True, alpha=0.3)
plt.legend()
plt.tight_layout()
plt.show()

# Statistique : position finale sur 1000 simulations
finals = [marche(1000)[-1] for _ in range(1000)]
print(f"Position finale moyenne : {sum(finals) / len(finals):.2f}")
print(f"Min / Max               : {min(finals)} / {max(finals)}")
print("L'écart-type théorique après n pas est √n ≈ 31.6")
