# Sprint 1 — Lexique ubuesque — Spéc Phase 0 (à valider)

> Statut : **spéc à valider par David avant tout code**. Décor lexical uniquement.
> Source : Compendium Section V. Contexte : [chiphres-rebranding-progress.md](chiphres-rebranding-progress.md).

## Périmètre (validé)

- **Lexique uniquement** : substitution terme générique → terme Chiphre. **PAS** de travail sur les voix/registres, les banques de citations, le ton, les cinématiques, le manifeste-en-voix, ni les surnoms ubuesques des concepts maths. (Tout ça = sprints ultérieurs.)
- **Partout** : élève + prof + admin + public. Immersion lexicale cohérente.
- **Mots de feedback inclus**, mais **en tant que libellés** (un mot, pas une réécriture de ton).

## Principes (non négociables)

1. **Les maths ne changent pas.** Les énoncés, corrigés, indices ne contiennent pas ces termes d'UI → ils ne sont pas touchés. Le lexique habille le **décor** (boutons, navigation, titres, libellés de features, notifications, états vides).
2. **L'info utile reste.** Sur une notification d'erreur technique : libellé ubuesque en préfixe **+ message d'origine conservé** (l'utilisateur doit comprendre ce qui a échoué). Ex. `toaster.error('Cornegidouille ! Échec de l'export')`.
3. **Accessibilité préservée** : un libellé ubuesque garde un `aria-label` clair si nécessaire.
4. **Une seule source** : tout passe par `src/lib/config/lore.ts`. Pas de chaîne ubuesque en dur ailleurs.

## Mapping complet (Section V) — annoté

Colonnes : Générique → **Chiphre** · statut · où ça s'applique.

### Actions / boutons

| Générique   | Chiphre                  | Statut  | Où                                                                       |
| ----------- | ------------------------ | ------- | ------------------------------------------------------------------------ |
| Sauvegarder | **Empocher**             | nouveau | boutons (×14 « Sauvegarder », ×56 « Enregistrer »)                       |
| Supprimer   | **Passer à la trappe**   | nouveau | boutons destructifs, menus                                               |
| Annuler     | **Renoncer**             | nouveau | dialogues (note doc « lâchement » = saveur, je garde « Renoncer » sobre) |
| Confirmer   | **Décréter**             | nouveau | dialogues                                                                |
| Recommencer | **Remettre le couvert**  | nouveau | exercices, jeux                                                          |
| Chercher    | **Fouiller**             | nouveau | barres de recherche, placeholders                                        |
| Filtrer     | **Trier dans la trappe** | nouveau | filtres de listes                                                        |

### Navigation / lieux

| Générique                    | Chiphre                       | Statut      | Où                                                             |
| ---------------------------- | ----------------------------- | ----------- | -------------------------------------------------------------- |
| Tableau de bord              | **Cabinet des Phynances**     | nouveau     | `dashboard-nav.ts`, titres (×9)                                |
| Boutique                     | **Marché Polonais**           | déjà acquis | nav, marketplace                                               |
| Inventaire                   | **Trappe à Trésors**          | nouveau     | nav élève                                                      |
| Paramètres                   | **Décrets Royaux**            | nouveau     | nav, réglages                                                  |
| Profil / compte              | **Blason**                    | nouveau     | « Mon Blason » = ton identité/tes armoiries (remplace Guérite) |
| Déconnexion                  | **Quitter le Royaume**        | nouveau     | nav footer                                                     |
| Aide / FAQ                   | **Le Bréviaire Pataphysique** | nouveau     | aide                                                           |
| Mentions légales             | **Édits Royaux**              | nouveau     | footer/légal (libellé du lien ; le contenu reste légal)        |
| Politique de confidentialité | **Sceau Secret**              | nouveau     | footer/légal                                                   |
| Niveau / chapitre            | **Province**                  | nouveau     | parcours                                                       |

### Entités / personnes

| Générique          | Chiphre                | Statut      | Où                                                                                              |
| ------------------ | ---------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| Élève              | **Galopin / Galopine** | nouveau     | partout (gérer le genre)                                                                        |
| Élèves (collectif) | **les Polonais**       | nouveau     | « tableau des Polonais » = leaderboard                                                          |
| Professeur         | **Maître Phynancier**  | nouveau     | jamais « prof »                                                                                 |
| Classe (groupe)    | **Bataillon**          | nouveau     | espace prof                                                                                     |
| **Amis** (feature) | **Conjurés**           | nouveau     | `/dashboard/friends` — canon Jarry (on conspire ensemble). **PAS** Palotins (réservé au buddy). |
| Buddy / compagnon  | **Palotin(s)**         | déjà acquis | `buddy/*` (inchangé, déjà en place)                                                             |

### Pédagogie / objets

| Générique           | Chiphre                         | Statut         | Où                                                               |
| ------------------- | ------------------------------- | -------------- | ---------------------------------------------------------------- |
| Exercice            | **Corvée**                      | nouveau        | listes d'exercices                                               |
| Devoir maison       | **Corvée Domestique**           | nouveau        |                                                                  |
| Examen / contrôle   | **Décervelage**                 | nouveau        | évaluations                                                      |
| Bac                 | **le Décervelage Suprême**      | nouveau        |                                                                  |
| Brevet              | **le Petit Décervelage**        | nouveau        |                                                                  |
| Indice              | **Coup de pouce de Conscience** | nouveau        | (libellé du bouton d'indice ; le texte de l'indice reste neutre) |
| Aide / tutoriel     | **Décervelage Pédagogique**     | nouveau        |                                                                  |
| Carte VIP           | **Carte Pataphysique**          | nouveau        | (ou garder « VIP » interne)                                      |
| Badge               | **Médaille de la Gidouille**    | nouveau        | succès                                                           |
| Notification        | **Décret**                      | nouveau        | « un nouveau décret »                                            |
| Avertissement       | **Coup de Sceptre**             | déjà (C/M/R/T) |                                                                  |
| Streak / régularité | **Constance Royale**            | nouveau        |                                                                  |

### Monnaie / abonnement

| Générique      | Chiphre              | Statut            |
| -------------- | -------------------- | ----------------- |
| Argent virtuel | **Gidouille** 🌀     | déjà acquis       |
| Argent réel    | **Phynances**        | nouveau (wording) |
| Abonnement     | **Pacte Phynancier** | nouveau           |

### Feedback (en tant que libellés — validé)

| Générique          | Chiphre              | Règle                                                              |
| ------------------ | -------------------- | ------------------------------------------------------------------ |
| Mauvaise réponse   | **Pataphysique**     | « Vous avez fait de la pataphysique ! » (pédagogique)              |
| Bonne réponse      | **Coup de Maître**   |                                                                    |
| Erreur (technique) | **Cornegidouille !** | **préfixe** de toast + message d'origine conservé (cf. principe 2) |

### Difficulté

| Générique | Chiphre               |
| --------- | --------------------- |
| Facile    | **Polonais**          |
| Moyen     | **Galopin Aguerri**   |
| Difficile | **Décervelage Royal** |

## Carve-outs

- **« Mathématiques » → « Mathres »** : appliqué en **wording interne** (site connecté), **MAIS interdit** dans : le **manifeste public** / page d'accueil, le **légal/RGPD**, les **certificats/exports officiels**. → substitution ciblée, pas un sweep brutal des ×58/×83 occurrences.
- **Niveaux scolaires** (6ᵉ→Syz'esme, …, Term→Phinalle) : c'est un **système** (Sprint 3), pas un simple libellé → **hors Sprint 1**.
- **Légal** : seuls les **libellés de liens** (« Édits Royaux », « Sceau Secret ») peuvent changer ; le **contenu** des pages reste tel quel (déjà rebrandé en PR #57).

## Architecture `src/lib/config/lore.ts`

Module de constantes, namespacé par catégorie (pas par voix) :

```ts
export const lore = {
	actions: {
		save: 'Empocher',
		delete: 'Passer à la trappe',
		cancel: 'Renoncer',
		confirm: 'Décréter',
		restart: 'Remettre le couvert',
		search: 'Fouiller',
		filter: 'Trier dans la trappe'
	},
	nav: {
		dashboard: 'Cabinet des Phynances',
		shop: 'Marché Polonais',
		inventory: 'Trappe à Trésors',
		settings: 'Décrets Royaux',
		profile: 'Blason',
		logout: 'Quitter le Royaume',
		help: 'Le Bréviaire Pataphysique'
	},
	entities: {
		student: 'Galopin',
		studentF: 'Galopine',
		studentsCollective: 'les Polonais',
		teacher: 'Maître Phynancier',
		class: 'Bataillon',
		friends: 'Conjurés'
	},
	learning: {
		exercise: 'Corvée',
		homework: 'Corvée Domestique',
		exam: 'Décervelage',
		baccalaureate: 'le Décervelage Suprême',
		brevet: 'le Petit Décervelage',
		hint: 'Coup de pouce de Conscience',
		badge: 'Médaille de la Gidouille',
		notification: 'Décret'
	},
	economy: {
		virtualCurrency: 'Gidouille',
		realCurrency: 'Phynances',
		subscription: 'Pacte Phynancier'
	},
	feedback: { wrong: 'Pataphysique', correct: 'Coup de Maître', errorPrefix: 'Cornegidouille' },
	difficulty: { easy: 'Polonais', medium: 'Galopin Aguerri', hard: 'Décervelage Royal' },
	discipline: 'Mathres'
};
```

(Genre Galopin/Galopine : helper `student(gender)`. Tests unitaires uniquement sur les éventuels helpers — le reste = constantes.)

## Surfaces à balayer (ordre proposé)

1. `lore.ts` (le module).
2. `dashboard-nav.ts` (labels de navigation — très visible).
3. Boutons globaux (composants UI réutilisés : save/delete/cancel/confirm/search).
4. Titres de pages (`<title>` et en-têtes h1).
5. Libellés de features (Boutique/Inventaire/Profil/Paramètres/Déconnexion).
6. Notifications (`toaster.*`, ~1157 — préfixe sur erreurs, libellés sur succès).
7. Substitution ciblée « Mathématiques → Mathres » (hors carve-outs).

**Non touché** : énoncés/corrigés/indices (contenu maths), pages légales (contenu), niveaux scolaires.

## Décisions à valider

- [x] **« Amis » → Conjurés** (validé). **Profil → Blason** (remplace Guérite, validé sauf objection).
- [ ] Mapping ci-dessus OK tel quel ? (ajustements de termes ?)
- [ ] « Mathres » avec les carve-outs (public/légal/certificats exclus) : OK ?
- [ ] Structure de `lore.ts` OK ?
- [ ] Ordre de balayage OK ?
