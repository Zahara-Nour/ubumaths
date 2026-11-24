# Chantier `idees-1re-exponentielle` : idées de la rubrique « fonction exponentielle » de 1re spé

## Reprendre ici

_Mis à jour le 2026-11-24, lot des 6 modèles neufs écrit._

- **État** : F1 à F6 écrits (`scripts/questions/idees-1re-exponentielle-neufs/`, script
  `docs/wip/questions/idees-1re-exponentielle-neufs.py`), simulation verte, essayés en base locale ·
  **Prochaine action** : David lance `create-questions --publier` en prod ; je commite les ids, puis
  la migration de rangement, la PR et `security-auditor` · **En attente de David** : la création en prod,
  et sa réponse sur F7 à F10 (variations de 4 modèles publiés), pas tranchées · **Pièges en cours** :
  les messages des erreurs prévues sont réécrits (`e` → `\exponentialE`) : table `REECRIT` du script ;
  ids locaux retirés des fichiers · **Worktree / branche** : `../ubumaths-wt-idees-1re-exponentielle`,
  `docs/idees-1re-exponentielle`.

## Journal

### 2026-11-24 — réservation, relevé, phase 0

- Rubrique 1AN3 (11 exercices) réservée dans [idees-ailleurs-repartition.md](idees-ailleurs-repartition.md)
  (`0212f8817`).
- Relevé : 1 ✅, 8 🟡, 2 ❌ (équation produit nul, inéquation produit). Aucun brouillon de 1re sur
  l'exponentielle en prod.
- Phase 0 : il y a 6 modèles neufs.
  - F1 : développer (1SPE-294).
  - F2 : équation produit nul (1SPE-405).
  - F3 : inéquation produit (1SPE-405).
  - F4 : dériver un produit avec e^{kx} (1SPE-394).
  - F5 : dériver un quotient (1SPE-396).
  - F6 : tableau de variations à remplir (1SPE-283).

  À côté, 6 variations sur 4 modèles publiés : F7 6a5e58da, F8 68166a11, F9 227f2c9c, F10 15d3aaa0. F11
  dit ce qui n'est pas repris, et pourquoi.

- Bornes de 1re appliquées : pas de ln, donc pas de zéro de a + beˣ hors a = −b ; pas de limite dans
  les tableaux ; seule composée e^{ax+b}.
- Nœuds et points vérifiés en base (règle « point sur le nœud du modèle ou sa notion ») : 1SPE-405 sur
  « Fonction exponentielle > variations », 1SPE-292 sur la notion, 1SPE-394/396 sur « Dérivation >
  opérations sur les dérivées », 1SPE-283 sur « Dérivation > variations et extremums ».
- Question d'accès : personne ne gagne d'accès (rangement et variations de modèles).

### 2026-11-24 — modèles neufs validés, lot écrit

- David : « je valide les modèles ». La page à cocher n'a aucun verdict : je le lis comme un oui à
  F1–F6 (modèles neufs). F7–F10 (variations de publiés) ne sont pas tranchés : la question lui est
  reposée.
- 6 modèles, 22 variations, 108 specs : chaque case a deux ou trois erreurs prévues, et chaque
  variation un coup de pouce. Les tableaux (F6) n'ont ni limite ni ln.
- F5 : forme en avertissement (`form: warn`) : (1 − 2x)e^{−x} est une « forme à améliorer » de
  (−2x + 1)/eˣ, pas une erreur.
- Vérifs : `question:specs` 108/108, 1 100 tirages réussis ; `create-questions` en simulation vert ;
  2 522 formules d'aperçu passées à `validateLatex` + accolades, 0 problème.
- Base locale : 6 brouillons créés (ids locaux retirés des fichiers). Rendu vu par `pnpm voir` :
  tableau à compléter de F6 (ordinateur) et ensemble S de F2 (iPhone).
