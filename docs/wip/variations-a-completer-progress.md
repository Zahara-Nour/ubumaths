# Chantier variations-a-completer — journal

## Reprendre ici

_Mis à jour le 2026-11-08, ouverture._

- **État** : phase 0 validée (David, 2026-11-08, « go » sur les recos A, B, C) ; PR 1 (outil) en cours.
- **Prochaine action** : tests rouges du parseur → parseur → générateur de questions et saisie → rendu écran / PDF → masquage d'évaluation → correction.
- **En attente de David** : rien.
- **Pièges en cours** : —
- **Worktree / branche** : `../ubumaths-wt-variations-a-completer`, `feat/variations-a-completer`.

## Origine

`docs/wip/outils-manquants.md` § 1 n° 14 (ordre de David du 2026-11-06 : après le lot bissectrice,
#2441). Point visé : 1re Automatismes « tableau de variations lu graphiquement »
(`automatismes-1spe` § Lot « Lectures graphiques » ; en attendant, `7f82d15a` en choix multiple).

## Phase 0 (validée le 2026-11-08)

L'auteur écrit le tableau juste et préfixe d'un `?` ce que l'élève trouve, dans une ligne `variation:` :

- `-2: ?4, top` : **valeur cachée** (case math, juge ordinaire) ;
- `-2,2: ?flèche` (ou `?fleche`) : **flèche cachée**, choix « ↗ / ↘ » ; réponse tirée des
  positions écrites par l'auteur.

Comportements :

1. Une valeur voisine d'une flèche cachée s'affiche **au milieu** (écran, PDF, énoncé d'évaluation) :
   sa hauteur dirait la réponse.
2. Ordre des cases : domaine, puis chaque ligne dans son ordre, colonne par colonne (point,
   intervalle, point…).
3. Correction : tableau juste, cases marquées ; corrigé imprimé révélé (`revealVariationBody`).
4. PDF de l'énoncé : valeur cachée = case vide ; flèche cachée non dessinée.
5. Se combine avec `?` dans `domain:` et dans les lignes `sign:` ; un tableau sans `?` est inchangé.
6. Refus (« Ligne N : … ») : `?` sur ±∞ ; `?flèche` sans flèche (même hauteur, valeur centrée,
   asymptote, zone interdite) ; `?` sur `||` ou une limite double ; intervalle hors du domaine.

Décisions (David, 2026-11-08, « go » sur les recommandations) :

- **A** : flèche = choix « ↗ / ↘ » par intervalle (pas « haut / bas » par valeur).
- **B** : outil seul dans ce chantier ; la variante « courbe → tableau à compléter » de `7f82d15a`
  revient à `automatismes-1spe`.
- **C** : pas de flèche horizontale (aucun point ne la demande).

Pas de question d'accès (ni base ni droits). Revue : `code-reviewer` en Opus (correction des réponses).
