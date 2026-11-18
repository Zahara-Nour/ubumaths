# Chantier `exercices-noelie` — série sur la médiatrice (6e) et script de série

## Reprendre ici

_Mis à jour le 2026-11-18, après #2827._

- **État** : #2827 (script `creer-serie`) mergée ; PR 2 (`content/questions-6-mediatrice` : `scripts/questions/6-mediatrice/`, générateur `docs/wip/questions/lot-6-mediatrice.py`) ouverte · **Prochaine action** : merger la PR 2, puis David crée les brouillons en prod (`create-questions --publier`), commit des id, migration de rangement (6-165 et 6-167, nœud « médiatrice et bissectrice »), publication, fichier `scripts/series/6-mediatrice.json`, `creer-serie --publier` par David · **En attente de David** : la question d'accès de la migration ; l'œil sur les figures (aperçu admin non joué : pas de connexion locale) · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-exercices-noelie`, `content/questions-6-mediatrice`

## Décisions (phase 0 validée par David le 2026-11-18)

- Existant en prod (6e, publiés) : Définition (15f9d78b), Propriété caractéristique (9e90342c,
  dont la variation « tableau de distances → quels points sont sur la médiatrice »), Problèmes
  (1b2ed3a5 : corde, centre d'un cercle par A et B, puits), Construire au compas (ed444b1d),
  médiatrices concourantes (c199bf10). Aucune série enregistrée ne les regroupait.
- **Modèle 1 — « Tracer la médiatrice d'un segment sur quadrillage »** : milieu en comptant les
  carreaux, perpendiculaire à l'équerre (bloc `figure-a-completer`, `grille: 1`,
  `droite m = mediatrice(A, B)`). 3 variations : horizontal, vertical, en biais (milieu sur un
  nœud). Niveau 3, 120 s.
- **Modèle 2 — « Calculer avec la médiatrice »** : figure codée, réponse en cm dans une case.
  3 variations : périmètre de MAB (MA, AB donnés) ; MA à partir du périmètre et de AB ;
  périmètre de AMBN (M, N sur la médiatrice). Erreur visée : MA + AB sans MB. Niveau 3, 90 s.
- **Script de série** : fichier `scripts/series/<nom>.json` (forme d'une série de l'appli,
  `modele` = titre de relecture) ; simulation par défaut (bornes de l'appli, modèles existants,
  publiés, du niveau) ; `--publier` au nom de l'unique professeur, id écrit en tête du fichier ;
  fichier avec id → `--mettre-a-jour` obligatoire, série verrouillée refusée par la base.
  Écriture en prod : David, par `!`.
- Série prévue : Définition ×2 (60 s), Propriété ×3 (60 s), Problèmes ×2 (90 s), Calculer avec la
  médiatrice ×2, Tracer sur quadrillage ×1, Construire au compas ×1 (240 s).

## Journal

- 2026-11-18 — PR 1 : script + logique testée (`scripts/lib/serie-fichier.ts`, 14 tests) ;
  essais en base locale : création (id écrit), relance refusée sans `--mettre-a-jour`, mise à
  jour. Doc : `couvrir-un-niveau.md` § 8 bis.
- 2026-11-18 — #2827 mergée (suites de revue : id affiché si le fichier ne s'écrit pas, écriture
  atomique, `--mettre-a-jour` sans id refusé, lignes strictes, `.eq('created_by')`). Option `--prod`
  proposée par l'audit non retenue (une manipulation de plus pour David).
- 2026-11-18 — PR 2 : deux modèles (16 et 9 specs vertes, sonde des figures 600 tirages 0 problème,
  créés en base locale) ; corrigés en route : périmètre affiché `\{eval:…}` (variation 2), sens
  « monte » faux pour le segment en biais qui descend.
