# Chantier calcul-aligne-displaystyle

## Reprendre ici

_Mis à jour le 2026-11-08, après #2471._

- **État** : ✅ mergé (#2471), pas encore en prod (`deploy:prod` sur demande de David) · **Prochaine action** : aucune ; journal à verser dans `docs/archive/` · **En attente de David** : lancer ou non la PR du bug voisin du cahier de texte (ci-dessous) · **Pièges en cours** : aucun · **Worktree / branche** : supprimés

## Problème (David, 2026-11-08)

Dans un calcul aligné (`array{rcl}`, #d8b829376), la taille variait d'une ligne à l'autre : les
lignes avec une fraction étaient réduites, les autres non. Cause : un `array` met ses cellules en
style texte (MathLive : `mathstyleName: "textstyle"`, comme LaTeX) ; l'ancien `aligned` était en
style display.

## Décision (David, 2026-11-08)

Option A retenue : `\displaystyle` en tête de chaque membre, écrit par `calcul-aligne.ts` (et non
un `pnpm patch` de MathLive, qui aurait changé tous les `array` du site).

## Ce qui a été fait

- Membres en `\displaystyle`, lignes séparées par `\\[6pt]` : au grand format, deux fractions
  voisines se touchaient (MathLive n'espace pas les lignes d'un `array`). `[6pt]` et non `[0.6em]` :
  le rendu français réécrit `0.6` en `0{,}6`.
- Lecture de l'ancienne forme et du groupe `{\displaystyle …}` de MathLive ; `normaliserCalcul`.
- Ancien bloc affiché au grand format (éditeur, `MathBlock` de l'énoncé et de la messagerie) sans
  réécrire le nœud avant une frappe.
- PDF : l'écart retiré en tête de ligne de la grille.
- Vérifié dans le navigateur : frappe dans une cellule `\displaystyle` (reste dans l'atome), écart
  conservé par MathLive, rendu éditeur / messagerie / énoncé.

## Bug voisin trouvé, hors de cette PR

Cahier de texte : `transformMathHtml` (`src/lib/utils/sanitize.ts`) passe `SAFE_FOR_TEMPLATES: true`
à DOMPurify, qui retire tout `{{ … }}` : une formule contenant `}}` (`\sqrt{\frac{1}{2}}`,
`\frac{…\sqrt{91}}{2}`) est tronquée jusqu'au dernier `}}`. Vu sur `/demo/editeur`, carte « Le
cahier de texte ». Existait avant ce chantier ; assainisseur de sécurité → PR à part, avec
`security-auditor`.

## Après la PR (2026-11-08)

- Revue `code-reviewer` : `{\displaystyle a+b}^2` perdait ses accolades (corrigé, test) ; regex de
  l'écart partagée, rangée dans `src/lib/ubumark/utils/calcul-centre.ts` (le générateur Typst
  importait l'éditeur, hors du filtre `paths` de la suite d'intégration).
- La ligne « Vérifié contre le code » d'`ubumark.md` est modifiée par toutes les sessions :
  conflits à répétition. La date du correctif est dans le paragraphe « Calcul aligné », pas sur
  cette ligne.
