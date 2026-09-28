# 0011 — Fiche d'automatismes : instances figées par une graine

- **Statut** : acceptée
- **Date** : 2026-09-28 · **Décidée par** : David

## Contexte

Les automatismes de 1re (évolutions, droites, lectures graphiques, statistiques) passent par le
système de questions : modèles paramétrés, corrigés automatiquement, entraînés en Automaths. On veut
aussi en tirer des **fiches** (PDF). Rien ne relie aujourd'hui un modèle de question à une fiche.

## Décision

- Une fiche d'automatismes est faite d'**exercices ordinaires** : chaque **série** est un exercice
  qui regroupe plusieurs instances de modèles de questions, tirées avec une **graine fixe**.
- Raison (David) : **même copie pour toute la classe**.
- Les modèles et les graines sont listés dans un script versionné : la fiche est reproductible, sans
  changer le schéma de la base.
- Les modèles de seconde sont réutilisés tels quels ; on n'ajoute pas le niveau 1re à leurs `grades`
  (un niveau accède déjà aux niveaux inférieurs ; Automaths ne filtre pas par niveau).

## Écarté

- **Lien vivant** (la fiche pointe vers les modèles et tire de nouvelles valeurs à chaque PDF, une
  copie par élève) : écarté, la classe doit avoir la même copie.
- **Un exercice par question** : une série par exercice, un automatisme tient en une ligne.
- **Bouton dans l'application** pour créer la fiche : plus tard, si l'usage le justifie ; d'abord un
  script.
- **Ajouter `1_SPE` aux modèles de seconde réutilisés** : inutile.

## Conséquences

- Une fois figé, un exercice ne suit plus son modèle : corriger un modèle ne corrige pas les fiches
  déjà créées (les régénérer par le script).
- Dans l'énoncé figé, une case devient des pointillés et un QCM la liste de ses choix ; le corrigé
  donne la réponse attendue puis la correction du modèle.
