# Assets

Dépose ici les images servies telles quelles par Vite, à la racine du site.

## `logo_blank.png`

Le logo du jeu. Il est utilisé dans la barre du haut et sur la page d'accueil.

**Tant que le fichier n'est pas là, rien ne casse** : le composant `BrandMark`
retombe automatiquement sur la marque pixel dessinée en SVG. Dépose simplement
`logo_blank.png` dans ce dossier et il apparaît au prochain rechargement.

Format conseillé : PNG à fond transparent, carré ou légèrement large, au moins
128 px de côté. Il est affiché en `image-rendering: pixelated`, donc une image
de petite taille reste nette plutôt que d'être lissée.
