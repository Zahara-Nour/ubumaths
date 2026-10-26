# Chantier « réponses à placer » — l'élève répond en plaçant un objet

## Reprendre ici

_Mis à jour le 2026-10-26, ouverture du chantier (aucune PR)._

- **État** : chantier ouvert par David le 2026-10-26, rien de codé. Né du chantier « questions » (outil n° 4 de [questions-progress.md](questions-progress.md) § 3).
- **Prochaine action** : **phase 0** — lire l'existant (blocs `line`, `horloge`, construire de `monnaie` / `collection`, ADR 0033), puis écrire les comportements en français (nominal / limite / erreur) et les questions ci-dessous ; **attendre la validation de David** avant tout code.
- **En attente de David** : la validation de la phase 0 (pas encore écrite).
- **Pièges en cours** : `geometrie-validation` a tranché CP-008 → réponses à placer (pas la case « figure ») ; ne pas mélanger avec la case « figure » (`figure-et-choix`) ; une PR = une session.
- **Worktree / branche** : `../ubumaths-wt-reponses-a-placer` · `feat/reponses-a-placer`.

---

## 1. Le besoin

Un type de réponse qui n'existe pas encore : l'élève **place** un objet (point, étiquette,
aiguille, hauteur de barre) et la réponse jugée est sa **position**. Formes notées dans le
chantier « questions » : point sur une droite graduée, étiquettes à ranger, aiguilles.

Points du programme qui l'attendent :

- **CP-008** — placer des nombres sur une demi-droite graduée de un en un (borne : graduée de un
  en un uniquement). Verdict du conseil (`geometrie-validation`), suivi par David le 2026-10-25.
- **CP-072** — présenter des données en diagramme en barres (hauteur des barres ; caractère à 2-5
  valeurs, moins de 40 individus).
- **CP-058** — vérifier un alignement à la règle : à réexaminer (placer, case « figure », ou ni l'un
  ni l'autre).
- Horloge : placer les aiguilles (aujourd'hui CP-047 se joue en QCM entre cadrans).

## 2. Questions de la phase 0 (à poser à David, pas tranchées)

1. Par quel geste commencer ? (recommandation à donner après lecture de l'existant)
2. Le geste à l'écran : glisser, toucher une graduation, ou les deux ? Sur téléphone ?
3. Ce qui est jugé : la position exacte (graduation) ; une tolérance ?
4. Écriture par le prof : une ligne dans le bloc existant (comme `construire:`), ou un bloc neuf ?
5. Correction et PDF : comment montrer la position juste ; que donne la fiche imprimée ?
