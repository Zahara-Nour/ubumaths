# Chantier variations-a-completer — journal

## Reprendre ici

_Mis à jour le 2026-11-08, après #2456._

- **État** : PR 1 (outil) mergée, #2456 (`2c4ace803`), pas encore en prod. Revue Opus : 0 bloquant, 3 mineurs corrigés dans la PR. N° 14 passé dans « Livré » de `outils-manquants.md` ; vérification à l'œil notée (`verifications-manuelles.md`, 2026-11-08).
- **Prochaine action** : rien dans ce chantier. Le modèle « courbe → tableau de variations à compléter » (variante de `7f82d15a`) revient à `automatismes-1spe` ; ensuite, versement du durable (déjà dans `docs/systeme/ubumark.md`, `questions.md`) et archivage du journal.
- **En attente de David** : `deploy:prod`, puis la vérification à l'œil.
- **Pièges en cours** : vartable 0.2.1 ne sait pas omettre une flèche → énoncé PDF à flèche cachée sans aucune flèche ; voir le PDF avec `node scripts/fiches/compile-prod.mjs` puis `pdftoppm`.
- **Worktree / branche** : aucun (retiré après le merge).

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

## Fait (PR #2456, 2026-11-08)

- Parseur (`variation-table-parser.ts`) : `readHiddenVariationCell`, `arrowAnswer` (positions, bornes
  implicites), `variationRowForDisplay` ; genre `fleche` (`HiddenCellKind`) ; `revealVariationBody` retire
  les lignes `?flèche`.
- Questions : `sign-table-case.ts` (jetons `↗` `↘`, LaTeX `\nearrow` `\searrow`), `masked-statement.ts`
  (`?` seul, `?, position`, hauteurs voisines en `center`, bornes implicites écrites ; garde
  `variationMasked`), corrigé (`SignTableAnswer`, `expected-result`).
- Écran : `VariationTable.svelte`, `SignCellPicker.svelte` (choix ↗ / ↘, touches `↑` `↓` `c` `d`).
- PDF : valeur cachée = case vide ; **flèche cachée → aucune flèche du tableau** (David, 2026-11-08 :
  vartable 0.2.1 traçait une flèche horizontale entre les deux valeurs centrées, lue « constante ») ;
  vérifié avec `compile-prod.mjs`.
- Page à cocher : valeur et flèche cachées encadrées.
