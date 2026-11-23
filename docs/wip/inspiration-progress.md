# Chantier `inspiration` — idées reprises d'une autre plateforme

## Reprendre ici

_Mis à jour le 2026-11-22 : la proposition 3 est livrée (chantier `diaporama-reglages` clos : #2936, #2984, #2988)._

- **État** : 9 propositions passées avec David. **5 retenues** : 4 livrée (chantier `lecture-facilitee`), **5 livrée** (chantier `memes-nombres`, #2922), **3 livrée** (chantier `diaporama-reglages`, #2936, #2984, #2988) ; restent 2, 10. **3 gardées pour plus tard** (7, 8, 9), **2 mises de côté** (1, 6).
- **Prochaine action** : la 2 (multivue, même fichier `ClassroomSeries` que la 3), puis 10 (course de chevaux, gros chantier temps réel).
- **En attente de David** : rien sur ce chantier.
- **Pièges en cours** : le bouton « Export PDF » de `/automaths/panier` n'est qu'une alerte « Fonctionnalité à venir » (`handleExportPDF`) : il n'existe aucun PDF de série.
- **Worktree / branche** : aucun.

## Décisions de David (2026-11-18)

### Retenues

**2. Diaporama « multivue » (forme En classe, `ClassroomSeries`).** L'écran se coupe en cases ; chaque case montre la même question avec d'autres nombres, une par rangée d'élèves.

- 2 ou 3 vues au plus (au-delà, illisible au vidéoprojecteur).
- Chaque case porte une lettre A / B / C bien visible (pas de couleur seule : vidéoprojecteur, daltonisme).
- Une question identique dans toutes les cases (carte de cours, question sans tirage) est montrée une seule fois, pleine largeur.
- Grilles de fin (questions, corrections) en 2 ou 3 colonnes.

**3. Réglages du diaporama En classe**, tous en option, éteints par défaut :

- a) correction juste après chaque question (question 1 → correction 1 → question 2…), durée réglable ; s'appuie sur la correction concise ;
- b) pause automatique à la fin du chrono de chaque question (la pause existe déjà, Espace) ;
- c) un son discret entre deux questions. **Pas de carton** (vérifier que le numéro de question est déjà affiché).
- Les derniers réglages sont retenus dans le navigateur (rien en base).

**4. « Lecture facilitée ».** → chantier `lecture-facilitee` ouvert le 2026-11-19.

- D'abord à l'écran, réglage de l'élève à côté de la taille du texte, gardé dans le navigateur : texte en **Luciole** + espacement des lettres et des lignes.
- Les maths gardent la police KaTeX de Chiphre (rien renommé ni retiré).
- **Pas d'OpenDyslexic** : pas d'effet prouvé ; à ajouter seulement sur demande.
- Le PDF (option du prof sur une fiche) vient après.
- Avant de coder : page d'essai Luciole + police des maths.

**5. Lien de série : « Mêmes nombres pour tous ».** → livrée le 2026-11-19 (chantier `memes-nombres`, #2922). Case dans `SeriesLinkShare`, éteinte par défaut : le lien porte une graine, tous les élèves ont les mêmes questions (correction collective d'un devoir). Le lien court et le QR la conservent.

- Pas de réglage « correction seulement si faux » ; le reste des réglages de son lien élève est déjà couvert par les formes de série ou hors sujet.
- Phase 0 : vérifier qu'une même graine rend bien les mêmes nombres pour tous les modèles, et le comportement des lignes répétées.

**10. Course de chevaux en réseau.** Souvenir de David, site oublié : plusieurs joueurs en même temps, chacun a un cheval ; chaque bonne réponse le fait avancer ; le premier arrivé gagne. Retenue par David le 2026-11-18 ; détails à trancher en phase 0.

- Chiphre a déjà du multijoueur en temps réel : le démineur en match (`src/lib/stores/multiplayer.svelte.ts`, un canal Supabase par match ; `docs/systeme/jeux-et-economie.md`, `docs/systeme/realtime.md`). Base possible.
- Les questions viendraient d'une série (mêmes questions pour tous, cf. proposition 5).
- Qui joue avec qui : jamais au-delà de l'école (frontière sociale, CLAUDE.md) ; en classe, lancée par le prof ?

### Gardées pour plus tard, sans priorité

**7. PDF « à la carte ».** Une seule impression pour plusieurs fiches, triée par élève. Déjà possible fiche par fiche (affectation à certains élèves + « Imprimer une copie par élève », ADR 0030) ; David différencie rarement sur papier.

**8. Sujets du brevet et du bac.** Version officielle d'abord, rangée en exercices avec une source « Brevet » / « Bac » (CONTEXT.md, ADR 0019) ; version aux nombres tirés au hasard exercice par exercice, là où c'est simple. Surtout du contenu à écrire. **Droit de reprise des sujets à vérifier** avant toute publication.

**9. QCM Cam (sondage par cartes imprimées et caméra, façon Plickers).** Gros chantier. Si un jour : version où l'image reste dans le téléphone et **rien n'est enregistré**.

### Mises de côté

**1. « J'ai… qui a… ? »** (cartes en chaîne imprimées depuis une série).

**6. Poids des types de question dans un modèle.** Inutile : les modèles de Chiphre sont petits, le mélange se fait en mettant plusieurs modèles dans la série.

### Écartées d'emblée

Exports Moodle, AMC, ÉLÉA, Capytale (mono-professeur, ADR 0002) ; raccourcisseur externe edurl.fr (Chiphre a `/l/<code>`) ; Anki (Chiphre a ses révisions espacées).

## Historique

### 2026-11-18 — étude d'une autre plateforme

Parcouru dans Chrome : un exercice et ses paramètres, menu, lien élève, diaporama, autres exports (PDF LaTeX, parcours, Moodle, à la carte, flash-cards et « J'ai… qui a… ? », diaporama PDF, QCM Cam, AMC, Anki). Nouveautés 2026 lues sur le site d'une académie : passage à Typst, flash-cards, affichage vidéoprojecteur repensé, cahiers d'automatismes 2de/1re, sujets DNB/bac officiels et aléatoires.

Déjà dans Chiphre, donc rien à reprendre : graine et série dans l'adresse, Course aux nombres, flash-cards à l'écran, QR et liens courts, PDF Typst, révisions espacées, Blockly, signalement d'erreur.
