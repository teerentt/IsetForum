# Organisation du projet

IsetForum est un monolithe Spring Boot avec un frontend Angular séparé. Le dossier `backend/` contient le projet Maven complet : `pom.xml`, `mvnw`, `mvnw.cmd`, `.mvn/` et `src/`. Le dossier `frontend/` contient uniquement le projet Angular. Ouvrez `backend/pom.xml` dans IntelliJ, ou la racine du dépôt dans VS Code.

## Backend

```text
backend/src/main/java/com/example/demo/
├── DemoApplication.java
├── config/
│   ├── security/         Configuration Spring Security
│   └── seed/             Comptes et communautés de développement
├── controller/
│   ├── auth/             Connexion, inscription et compte courant
│   ├── community/        Communautés et adhésions
│   └── admin/            Validation des demandes privées
├── dto/
│   ├── auth/             Requêtes de connexion et d’inscription
│   ├── user/             Réponse du compte utilisateur
│   ├── community/        Requêtes et réponses des communautés
│   ├── membership/       Réponses des adhésions
│   └── common/           Format des erreurs API
├── enums/                Rôles, visibilité et statuts
├── exception/            Réponses d’erreur communes
├── model/
│   ├── user/             Entité User
│   └── community/        Entités Community et CommunityMembership
├── repository/
│   ├── user/             Requêtes JPA des utilisateurs
│   └── community/        Requêtes JPA des communautés et adhésions
└── service/
    ├── user/             Comptes et chargement des utilisateurs
    └── community/        Règles des communautés et adhésions
```

Une requête suit le parcours `controller → service → repository → MySQL`.

- Le controller reçoit les DTO et renvoie une réponse HTTP.
- Le service applique les règles avec des conditions simples et gère les transactions.
- Le repository accède aux données avec Spring Data JPA.
- Les entités représentent les tables ; les DTO limitent les champs exposés.
- La configuration de sécurité gère les sessions, les rôles et la protection CSRF.

Les migrations Flyway restent dans `backend/src/main/resources/db/migration`. Une migration déjà exécutée n’est pas modifiée. Les tests sont classés dans `backend/src/test/java/com/example/demo/auth` et `community` et utilisent une base H2 isolée.

## Frontend

```text
frontend/src/app/
├── core/
│   ├── models/           Types des comptes et du forum
│   ├── services/         Authentification, thème et état de démonstration
│   ├── guards/           Accès aux routes
│   ├── interceptors/     Expiration des sessions HTTP
│   └── demo/             Contenus fictifs du forum
├── layout/               En-tête, navigation et structure des pages
├── features/             Authentification, fil, communautés, publications, profil et administration
└── shared/
    ├── components/       Cartes, icônes, dialogues et notifications
    └── styles/           Styles réutilisés dans les formulaires
```

Chaque composant conserve ses fichiers TypeScript, HTML et CSS. Les couleurs communes sont définies dans `frontend/src/styles.css`. `ThemeService` gère le choix sombre/clair, conservé dans le navigateur. Le logo ISET servi à l’application se trouve dans `frontend/public/assets` ; les références fournies restent dans `frontend/src/app/assets`.

Le thème initial est bleu et blanc. La navigation se limite à Accueil, Communautés et Mon profil, avec Administration selon le rôle. Les ressources sont un onglet de la communauté ; les favoris sont un onglet du profil. Chaque publication possède une route `/forum/publications/:id`, utilisable directement ou après actualisation. Les fenêtres de dialogue servent uniquement à créer une publication ou une communauté.

Les comptes et la page `/forum/administration` sont réellement connectés au backend. `AdminService` utilise `/api/admin/communities` et `/api/admin/membership-requests`. Les écrans utilisateur du forum restent en démonstration locale ; leurs données ne sont pas mélangées avec celles de l’administration.

Le sprint 3 ajoute le domaine `publication` aux couches `model`, `repository`, `dto`, `service` et `controller`. `CommunityAccessService` centralise les contrôles simples de lecture, d’adhésion active, d’auteur et d’administrateur. La migration V3 ajoute `publication` et `publication_comment`. Les suppressions des enfants puis des parents sont explicites et transactionnelles. Voir [Sprint 3](sprint-3.md).
