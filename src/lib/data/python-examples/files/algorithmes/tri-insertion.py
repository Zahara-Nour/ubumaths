def tri_insertion(xs):
    """Tri par insertion : O(n²) pire cas, O(n) si presque trié."""
    xs = list(xs)
    for i in range(1, len(xs)):
        valeur = xs[i]
        j = i - 1
        # Décaler les éléments plus grands que `valeur` vers la droite
        while j >= 0 and xs[j] > valeur:
            xs[j + 1] = xs[j]
            j -= 1
        xs[j + 1] = valeur
    return xs


for cas in [
    [5, 2, 9, 1, 7, 3],
    [1, 2, 3, 4, 5],          # déjà trié → O(n)
    [5, 4, 3, 2, 1],          # ordre inverse (pire cas)
]:
    print(f"{cas} → {tri_insertion(cas)}")

# Visualisation pas à pas
print("\nTrace pas à pas pour [5, 2, 4, 6, 1] :")
xs = [5, 2, 4, 6, 1]
for i in range(1, len(xs)):
    valeur = xs[i]
    j = i - 1
    while j >= 0 and xs[j] > valeur:
        xs[j + 1] = xs[j]
        j -= 1
    xs[j + 1] = valeur
    print(f"  Étape {i} : {xs}")
