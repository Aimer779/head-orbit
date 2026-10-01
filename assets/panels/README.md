# Panel images

Drop PNG / JPG / WebP here. Then list them in `../content.json`:

```json
"panels": [
  { "src": "assets/panels/01.png", "transparent": false, "weight": 2 },
  { "src": "assets/panels/sticker.png", "transparent": true, "weight": 3 }
]
```

`transparent: true` letterboxes the image on the cylinder (stickers, emoji). Leave it false to fill the panel.

An empty `panels` array keeps the placeholder frames so the orbit still reads while you hunt for pictures.
