# Repères des petits secteurs du diagramme circulaire (Q54)

Branche `fix/circulaire-reperes`. Décision Q54 (2026-10-02).

- `spreadOutsideMarkers` (`stat-chart-scene.ts`) : les repères extérieurs trop proches sont étalés
  à pas constant autour de la moyenne de leurs angles (groupes fusionnés, départ après le plus grand
  vide → un groupe à cheval sur midi n'est pas coupé). Écran et PDF partagent la scène.
- Trait de rappel coudé : milieu du secteur → aplomb à 1,05 → repère ; il ne coupe plus le disque.
- `PIE_MARKER_PX` (9) et `PIE_MARKER_CM` (0,17) exportés et utilisés par les deux rendus ; un test
  vérifie que `PIE_MARKER_RADIUS` (0,13) les majore aux trois tailles.
- `--font-scale` non appliqué au SVG (décidé : déborderait d'un dessin à taille fixe).

Revue (`code-reviewer`, fuzz 200 000 disques) : jonction de midi non vérifiée → chevauchements dès
17 repères, INATTEIGNABLE (12 catégories au plus ; aucun échec sous 15) → pas de code mort, un fuzz
de 3000 vrais blocs le prouve ; trait droit qui coupait le disque → coudé, preuve rouge faite.
PDF de contrôle compilé (typst.ts de production) : 7 et 11 secteurs à 1 %, pages relues.
