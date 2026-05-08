import statistics as stats

notes = [12, 15, 9, 18, 11, 14, 10, 16, 13]

print(f"Effectif       : {len(notes)}")
print(f"Moyenne        : {stats.mean(notes):.2f}")
print(f"Médiane        : {stats.median(notes)}")
print(f"Mode           : {stats.mode([2, 3, 3, 4, 5])}")
print(f"Variance       : {stats.variance(notes):.2f}")
print(f"Écart-type     : {stats.stdev(notes):.2f}")

# Quartiles
q1, q2, q3 = stats.quantiles(notes, n=4)
print(f"\nQ1 = {q1}, Q2 (médiane) = {q2}, Q3 = {q3}")
print(f"Étendue interquartile (IQR) = {q3 - q1}")

# Comparaison de deux séries
groupe_a = [12, 13, 14, 15, 16]   # serrée
groupe_b = [4, 9, 14, 19, 24]     # dispersée
print(f"\nGroupe A : moy = {stats.mean(groupe_a)}, σ = {stats.stdev(groupe_a):.2f}")
print(f"Groupe B : moy = {stats.mean(groupe_b)}, σ = {stats.stdev(groupe_b):.2f}")
print("Même moyenne, dispersions très différentes.")
