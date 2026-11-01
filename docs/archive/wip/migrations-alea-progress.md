# Chantier « migrations-alea » — horodatage de migration tiré au hasard quand main est en avance

## Reprendre ici

_Mis à jour le 2026-11-01, après #2177. Chantier clos, journal archivé._

- **État** : #2177 mergée — `pnpm migration:horodatage` en avance : dernière + 1 à 59 s au hasard, en vraie heure. CI verte (chemin GNU prouvé par les tests serveur), revue `code-reviewer` sans finding.
- **Mémoire** : `reference_horodatage-migration-collision.md` complétée.

## Pourquoi

Le 2026-11-01, main était daté ~2 h en avance sur l'horloge (horodatages ronds d'avant #2165). `--prochain`
rendait alors « dernière + 1 s » : deux sessions lancées ensemble recevaient le même nombre
(`20261101224701` pris par `questions-1spe` #2171 et `questions-4` #2169 ; 4 CI pour une migration de 3 lignes).
La garde `check:migrations --pr` a bloqué chaque fois : rien de cassé sur main.

Pistes de `questions-4` (suffixe par session, jeton de merge) jugées trop lourdes pour un état transitoire ;
**décision de David (2026-11-01, « je suis tes recos »)** : décalage aléatoire de 1 à 59 s. Au passage, l'ancien
« + 1 » pouvait produire une seconde 60 (`…5959 + 1 = …5960`) : l'addition se fait désormais en vraie heure.
