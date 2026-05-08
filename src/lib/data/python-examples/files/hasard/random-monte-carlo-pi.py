import random

# Méthode de Monte-Carlo : approximer π en tirant des points
# au hasard dans le carré [0,1]² et comptant ceux dans le quart de
# disque (x² + y² ≤ 1). Le rapport tend vers π/4.

def estimer_pi(n):
    dans_disque = 0
    for _ in range(n):
        x, y = random.random(), random.random()
        if x ** 2 + y ** 2 <= 1:
            dans_disque += 1
    return 4 * dans_disque / n


for n in [100, 1_000, 10_000, 100_000]:
    estimation = estimer_pi(n)
    print(f"n = {n:7d} → π ≈ {estimation:.4f}")

print(f"\nValeur exacte : 3.1416")
print("La précision augmente comme √n (loi des grands nombres).")
