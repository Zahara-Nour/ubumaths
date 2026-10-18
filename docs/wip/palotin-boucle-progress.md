# La boucle du Palotin tourne — journal

> Branche `feat/palotin-boucle`, worktree `../ubumaths-wt-palotin`. Démarré le 2026-10-18.
> Conception : [mathoux-conception.md](mathoux-conception.md) § 8.

## Décisions de David (2026-10-18)

1. Révision espacée : un forfait par séance de révision terminée, une fois par jour (l'effort, pas
   la réussite : les cartes sont auto-évaluées).
2. Constance Royale comptée en semaines : au moins 3 jours de travail dans la semaine.
3. Mots affichés : **Pansées** (l'XP) et **Tour de panse** (le niveau), validés le 2026-10-18.
4. Images : SVG d'abord, remplacées plus tard par des images faites par IA.

## Découpage

- **PR 1 (sans migration)** : gain visible en fin de séance, bonus de thème, forfait de révision,
  images SVG, mots du lore, test d'intégration de la boucle.
- **PR 2 (code, sans migration)** : toutes les écritures de `student_buddies` passent par le
  serveur (client service). Elle doit précéder la PR 3 : retirer le droit d'écriture de l'élève
  avant que le code ait cessé de s'en servir casserait le choix du Palotin en prod.
- **PR 3 (migration)** : colonnes de la Constance hebdomadaire (début de semaine, jours travaillés)
  et retrait des policies INSERT/UPDATE de l'élève sur `student_buddies`.
- **PR 4** : code de la Constance hebdomadaire (après `db:migrate` et `db:types`).

**Question d'accès tranchée par David le 2026-10-18** : oui aux deux changements. Personne ne gagne
de lecture (les colonnes nouvelles se lisent comme le reste de la ligne : l'élève, ses profs,
l'admin) ; l'élève perd le droit d'écrire directement sa ligne de Palotin, toutes ses actions
légitimes passant par le serveur. ⚠️ La PR 3 contient des `DROP POLICY` : aucune donnée perdue, mais
c'est un `DROP` → arrêt avant `db:migrate` pour l'expliquer à David.

## Constat de sécurité (2026-10-18, prod, lecture seule)

La policy « Students can update their own buddy » (UPDATE, `student_id = auth.uid()`, sans
`with check` ni restriction de colonnes) laisse un élève modifier lui-même `xp`, `level`,
`current_streak`, `palotin_type`, `change_count` (donc changer de Palotin sans payer les 50
gidouilles). Correction prévue en PR 2.

## Avancement

- [ ] PR 1
- [ ] PR 2
- [ ] PR 3
