# IsetForum

L’interface reprend la structure d’un index de discussions de l’ISET Radès. Un bandeau bleu identifie le forum. Un filet ocre signale le titre du fil. Le titre de chaque discussion reste l’élément le plus visible de sa ligne.

## Typographie et couleurs

- Source Serif 4 pour le nom du forum et les titres. Source Sans 3 pour la navigation, les extraits et les métadonnées. Les deux familles sont hébergées avec le projet.
- En clair, les fonds `#f5f7fa` et `#ffffff` soutiennent le texte `#263a53` et les actions bleues `#234f89`. En sombre, les fonds `#141e2a` et `#1a2736` soutiennent le texte `#dae5f3` et les liens `#a1c9ff`.
- Les couleurs des panneaux, actions et séparateurs du forum sont définies dans `forum-layout.component.css`. Les écrans d’authentification ont leurs propres styles.

## Composition

- Sur grand écran, la navigation, le fil et l’index des communautés forment trois colonnes dans un cadre centré. L’index disparaît quand la largeur manque. Sur mobile, la navigation passe au-dessus du contenu.
- Une liste de discussions partage un fond et une bordure. Chaque ligne présente la communauté, le titre lié, un extrait court, l’auteur et la date. Les séparateurs fins permettent de parcourir les discussions rapidement.
- Donner un emplacement clair à l’action principale. Employer des libellés français courts. Réserver les panneaux séparés aux contenus qui en ont besoin, comme l’en-tête d’une communauté ou un état d’accès.
- Garder le fil et les lignes stables lors du survol et du changement de filtre. Les changements de couleur et l’ouverture des dialogues utilisent des transitions courtes. Respecter `prefers-reduced-motion`.
- Afficher la sélection et le focus clavier. Les libellés Public ou Privé accompagnent les icônes de visibilité.
