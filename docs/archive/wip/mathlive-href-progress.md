# Chantier mathlive-href

## Reprendre ici

_Mis à jour le 2026-11-08, après #2488._

- **État** : ✅ mergé (#2488), pas encore en prod (`deploy:prod` sur demande de David) ; chantier clos, journal archivé · **Prochaine action** : aucune · **En attente de David** : lien public du cahier — refuser ou non les commandes à attributs dans les formules (écart de `editeur-riche.md`) · **Pièges en cours** : aucun · **Worktree / branche** : supprimés

Revues : `code-reviewer` (charge `math-span` sans preuve remplacée, attributs vérifiés, prod mesurée : 0 carnet sur 2, 0 modèle), `security-auditor` (rien de bloquant ; deux restes faibles notés dans `editeur-riche.md`).

## Demande (David, 2026-11-08)

« Corrige les risques de sécurité » : les deux points faibles de l'audit #2425 notés dans
`docs/systeme/editeur-riche.md` (`<math-field>` accepté dans le HTML, `\href` de MathLive non
audité).

## Enquête

- MathLive 0.111.1 : `\href` rendu seulement en `http:` / `https:` (sinon erreur) ; `openUrl`
  n'ouvre que `http:`, `https:`, `file:`. `\htmlStyle`, `\class`, `\cssId`, `\htmlData` posent des
  attributs (mesuré par `safe-latex.ts`, 2026-10-14).
- Contenu d'élève lu par un autre, déjà gardé : chat et description des signalements
  (`RestrictedRichText`, rendu restreint), carnet d'élève lu par un autre
  (`isForeignStudentNotebook` → restreint, HTML de sortie en texte), réponses d'élèves
  (`student-answer-safety.ts`), Atelier (`safe-latex.ts`).
- `sanitizeHtml` : sorties HTML du carnet (lues par leur auteur ou un carnet de prof) et modèles de
  messages (prof, admin). Aucun producteur de `math-field` dans ce HTML. Aucun chemin d'un élève
  vers un autre lecteur trouvé.

## Fait

- `sanitizeHtml` : balises MathLive (`math-field`, `math-inline`, `math-display`) et attributs
  `read-only` / `disabled` retirés, par précaution.
- Test rouge puis vert : `describeSansMathLive` (3 rouges côté serveur avant), serveur et navigateur.
- Doc : `editeur-riche.md`, écart clos avec l'inventaire ci-dessus.
