# Chantier `idees-1re-second-degre` — journal

Idées reprises d'ailleurs, rubrique « Fonctions polynomiales de degré 2 » de Première spécialité
(code 1AL2, 22 exercices), selon le skill `idees-rubrique`. Relevé :
[idees-1re-second-degre-releve.md](idees-1re-second-degre-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, rubrique prise._

- **État** : relevé écrit, phase 0 publiée (page à cocher, 16 fiches) · **Prochaine action** :
  lire les verdicts (`ArtifactData list verdicts` sur https://claude.ai/artifact/JeWK9CeELHWtAMj2fkmzBy),
  puis écrire le gros lot · **En attente de David** : F1 à F15 et Q1 · **Pièges en cours** : aucun ·
  **Worktree / branche** : `../ubumaths-wt-idees-1re-second-degre`, `docs/idees-1re-second-degre`
  (pas encore de commit ; la branche servira au lot).

## Historique

### 2026-11-22 — rubrique prise

- David a choisi 1AL2 parmi les rubriques libres de Première ; la ligne est passée à « prise » sur
  `main` (27b0fe9aa).
- Nos modèles relevés en prod (MCP lecture seule) : 35 modèles publiés tagués sur les points de
  second degré de 1re spé (1SPE-243 à 258, 287, 382 à 387, 402, 403, 420), plus deux modèles 1_SPE
  publiés sans point (eae2ff6a « Déterminer les racines… », f8ccc8b6 « Vrai ou Faux sur les
  polynômes du second degré ») et sept modèles 1_GEN / 1_TECHNO sur les paraboles. Le point
  1SPE-382 (signe d'une forme factorisée) n'a aucun modèle ; 1SPE-251 en a un.
- Aucun de ces modèles n'est réservé par une autre session.

### 2026-11-22 — relevé, phase 0 publiée

- Relevé : 21 exercices (pas 22 : le tableau comptait aussi un fichier de test), lus par deux agents
  (Sonnet) ; `choisiDelta` et l'interactivité de 1AL24-2 vérifiés dans le code. 4 ✅, 15 🟡, 2 ❌
  (résoudre par la forme canonique, discuter selon un paramètre m). 10 exercices sur 21 n'ont pas de
  saisie chez eux.
- Page à cocher : https://claude.ai/artifact/JeWK9CeELHWtAMj2fkmzBy (16 fiches). Si tout est oui :
  7 modèles neufs (28 variations : F1 à F7) et 13 variations de 9 modèles publiés (604f83b7,
  b09c430a, 9e1d084e, afe51ac4, aab8e41c, 87140df3, 18e26873, 56b1803f, a9aece33).
- Q1 : « pas factorisable » (une case « expression, ou bien impossible ») → je recommande de
  l'ajouter à `outils-manquants.md`, sans variation en attendant. F3 : point 1SPE-246 recommandé,
  1SPE-386 possible.
- Question d'accès : personne (rangement de modèles, variations ajoutées).
- Questions ouvertes, sans réponse = non tranchées : F1 à F15, Q1.
