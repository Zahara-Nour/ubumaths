import random

# Bootstrap : méthode statistique pour estimer la variabilité d'un
# estimateur en rééchantillonnant l'échantillon original AVEC remise.
# Utile quand on ne connaît pas la loi sous-jacente.

# Échantillon : tailles (cm) de 30 personnes
echantillon = [
    162, 175, 168, 171, 159, 184, 167, 172, 178, 165,
    170, 169, 173, 181, 158, 176, 168, 174, 172, 166,
    179, 163, 177, 170, 168, 175, 171, 169, 182, 164,
]

n = len(echantillon)
moyenne_obs = sum(echantillon) / n
print(f"Moyenne observée : {moyenne_obs:.2f} cm (n = {n})")

# 1000 rééchantillons bootstrap
n_resamples = 1000
moyennes_boot = []
for _ in range(n_resamples):
    rechantillon = random.choices(echantillon, k=n)  # avec remise
    moyennes_boot.append(sum(rechantillon) / n)

# Intervalle de confiance à 95% (méthode des percentiles)
moyennes_boot.sort()
borne_inf = moyennes_boot[int(0.025 * n_resamples)]
borne_sup = moyennes_boot[int(0.975 * n_resamples)]

print(f"\nIntervalle de confiance bootstrap à 95% :")
print(f"  [{borne_inf:.2f} ; {borne_sup:.2f}] cm")

import math
ec_type_moyenne = math.sqrt(
    sum((m - moyenne_obs) ** 2 for m in moyennes_boot) / n_resamples
)
print(f"\nÉcart-type bootstrap de la moyenne : {ec_type_moyenne:.3f} cm")
