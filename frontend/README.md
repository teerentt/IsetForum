# IsetForum — frontend Angular

Interface française pour l’Institut supérieur des études technologiques de Radès : fil inspiré de Reddit, thème bleu et blanc par défaut, mode sombre au choix et logo ISET Radès. Le projet Spring Boot se trouve dans le dossier voisin `../backend/`.

## Démarrer

Ouvrez un nouveau terminal **Command Prompt** dans VS Code (profil configuré pour cet espace de travail), puis depuis `frontend/` :

```cmd
ng serve
```

Ouvrez http://localhost:4200 : la première page est la connexion. Le lien **Continuer en visiteur** ouvre le contenu public. Une session déjà authentifiée est restaurée après actualisation.

Les dépendances sont installées. Après un nouveau clonage, lancez `npm ci` une première fois. Angular CLI est déjà installé globalement sur ce poste ; sur un autre poste, installez `@angular/cli@21` globalement. Le projet utilise Angular 21 et Node 22.19.

Le proxy de développement transfère `/api/**` vers `http://127.0.0.1:8080`. Spring Boot et MySQL doivent être démarrés séparément ; voir le README à la racine. `ng serve` démarre uniquement Angular.

## Organisation

- `core/models/` : contrats des comptes et du forum.
- `core/services/` : authentification HTTP, état local du forum et interactions de présentation.
- `core/services/theme.service.ts` : thème sombre/clair, conservé après actualisation.
- `core/guards/` et `core/interceptors/` : accès aux routes et expiration des sessions.
- `core/demo/` : contenu fictif du forum, séparé des vrais comptes.
- `layout/` : en-tête, navigation latérale et structure du forum.
- `features/auth/` : connexion et inscription, avec une mise en page commune.
- `features/feed/`, `communities/`, `profile/`, `admin/`, `publications/` : fonctionnalités du forum. Les ressources sont dans chaque communauté, les favoris dans le profil.
- `shared/components/` : icônes, cartes, notifications et dialogues réutilisables.
- `shared/styles/` : styles communs du contenu des dialogues.

Chaque composant possède ses propres fichiers TypeScript, HTML et CSS. Les variables du thème et les éléments visuels communs sont dans `src/styles.css`.

Le logo utilisé par l’application est servi depuis `public/assets/logo-iset.png`. Les fichiers de référence d’origine, `maquette.png` et `logo_iset.png`, sont conservés dans `src/app/assets/`. Le bouton de thème est disponible sur la connexion et dans l’en-tête du forum. Le fil, les communautés, les ressources, les favoris et les dialogues partagent les mêmes variables visuelles.

## Ce qui utilise MySQL

Connexion, inscription étudiante, lecture du compte courant, rôles et déconnexion utilisent réellement Spring Boot et MySQL. L’authentification repose sur une session HttpOnly et la protection CSRF. Aucun jeton ni mot de passe n’est conservé dans localStorage. La création d’un compte enseignant ou administrateur n’est pas proposée à l’inscription.

Depuis le sprint 3, `/forum/administration` utilise aussi les API réelles. Son onglet Communautés permet de créer, consulter, modifier et supprimer ; son onglet Demandes d’adhésion permet d’approuver ou refuser les demandes MySQL. `AdminService` et `admin.models.ts` contiennent les appels HTTP et leurs contrats. La suppression demande confirmation et retire les adhésions, publications et commentaires associés, en conservant les utilisateurs. Le rôle est contrôlé par le garde Angular et par le serveur.

## Ce qui reste une démonstration

En dehors de l’administration et de l’authentification, les écrans Angular utilisent encore les communautés, adhésions, publications, commentaires, ressources texte, favoris et likes fictifs. Les modifications de démonstration sont isolées par compte dans le navigateur (`isetforum-demo-v2-account-<id>`), avec un espace séparé pour les visiteurs. Elles ne sont pas synchronisées entre utilisateurs. Les communautés et demandes de démonstration n’alimentent pas l’administration réelle.

Les noms et descriptions des communautés privées sont publics ; leur contenu est masqué aux non-membres dans la démonstration. Les API de publications et commentaires du sprint 3 appliquent déjà ces droits côté serveur ; le raccordement des écrans utilisateur reste à faire.

Les ressources actuelles sont des notes téléchargeables au format `.txt`. L’envoi de fichiers et la réinitialisation du mot de passe par e-mail restent à implémenter.

## Vérifier

```cmd
npm test
npm run build
npm run test:browser
```

Le build est généré dans `dist/isetforum/browser/`. Les tests navigateur utilisent Microsoft Edge en mode headless et nécessitent le backend démarré avec le profil `dev`. Ils créent un compte étudiant de test dans MySQL et enregistrent des captures dans `artifacts/` (ignoré par Git).

Pour tester directement le serveur Angular plutôt que le build statique :

```cmd
set ISETFORUM_FRONTEND_URL=http://localhost:4200
npm run test:browser
```

Après redémarrage de Spring Boot, `node scripts/check-persistence.mjs` vérifie que le compte créé par le dernier test navigateur peut encore se connecter.

Les polices Google sont facultatives : des polices de remplacement sont prévues sans connexion externe.
