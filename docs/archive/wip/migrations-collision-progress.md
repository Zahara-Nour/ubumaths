# Chantier « migrations-collision » — garde des horodatages de migration

## Reprendre ici

_Mis à jour le 2026-11-01, après #2165. Chantier clos, journal archivé._

- **État** : #2165 mergée (garde `pnpm check:migrations`, `pnpm migration:horodatage`, porte de la CI, PR de contenu allégée). Suite : #2167 (CI allégée sur main, chantier `ci-main-allegee`).
- **Mémoire** : `reference_horodatage-migration-collision.md` réécrite (plus de « max + 1 min »).

## Pourquoi

Le 2026-11-01, `20261101215000` a été pris par les lots 1re spé suites (#2140) et 4e lot 8 : la CI du lot 8 a
tourné sur un main qui n'avait pas encore l'autre migration (protection de `main` sans « branche à jour »),
la PR a été mergée verte, et la garde SECURITY DEFINER a échoué sur toutes les PR (correctif #2154).
Décision de David (2026-11-01) : A (horodatage = heure réelle) + B (garde au push et avant le merge) ;
C demandé ensuite par David (2026-11-01) : porte de la CI dans le job « Commit de version ? »
(horodatages d'abord, jobs lourds sautés s'ils échouent) et PR de contenu seul allégée
(`scripts/ci-nature-changement.sh`).

Revue (`code-reviewer`) : conflit « heure réelle » / garde quand main porte des horodatages ronds dans
le futur → `pnpm migration:horodatage` (heure UTC ou dernière + 1 s) ; exception du pre-push documentée.
