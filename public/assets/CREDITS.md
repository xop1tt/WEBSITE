# Asset credits and licenses

Every image in `public/assets/` is listed here with its source, author,
license and the changes made to it. CC BY 2.0 and CC BY-SA 4.0 both require
attribution, so the site footer links to this file's content on `/credits`.
Keep that in sync when adding or replacing assets.

## Drawn for this project

- Fan (`src/components/home/StageArt.tsx`, `FanArt`) — vector, drawn for this
  project; no third-party source. It replaces the removed photograph below:
  in the hero → directions transition the fan grows to cover the whole
  screen (~4× its hero size), where a raster image turns blurry.
- Castanets (`src/components/home/StageArt.tsx`, `CastanetsArt`) — vector,
  drawn for this project (restored from the earlier homepage scene).

## Placeholders in the "О нас" block (`public/assets/about/`)

Temporary stand-ins until real studio photos exist; resized and converted to
WebP, no other changes (the guitar is uncropped). All from Wikimedia Commons:

- `el-jaleo.webp` — [El Jaleo](https://commons.wikimedia.org/wiki/File:John_Singer_Sargent_-_El_Jaleo.jpg),
  John Singer Sargent (1882), public domain.
- `spanish-dancer.webp` — [The Spanish Dancer](https://commons.wikimedia.org/wiki/File:Sargent_John_Singer_Spanish_Dancer.jpg),
  John Singer Sargent, public domain.
- `flamenco-guitar.webp` — [Flamenco Guitar, MET DP-13193-001](https://commons.wikimedia.org/wiki/File:Flamenco_Guitar_MET_DP-13193-001.jpg),
  The Metropolitan Museum of Art, [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## Removed

- `public/Flamenco_GettyImages-173193034.jpg.webp` — removed: the file name
  points to Getty Images and no license for it was found in the repository.
  It remains in git history.
- `backgrounds/stage-haze.webp` ([Incense smoke against a black sky](https://commons.wikimedia.org/wiki/File:Incense_smoke_against_a_black_sky_-_Flickr_-_Vanessa_Pike-Russell.jpg),
  Vanessa Pike-Russell, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0))
  — removed at the user's request to drop the smoke/fire texture from the
  scene. The dark scenes now rely on `.stage-base`'s gradient and
  `.stage-spot`'s glow alone.
- The castanets, rose and petals (previously `src/components/home/StageArt.tsx`,
  drawn for this project, no third-party source) — removed from the homepage
  scene at the user's request to simplify it to the fan alone.
- `objects/fan.webp` ([Abanico.png](https://commons.wikimedia.org/wiki/File:Abanico.png),
  Kbemcap, [CC0](https://creativecommons.org/publicdomain/zero/1.0/)) —
  removed at the user's request to drop the fan from the homepage scene
  entirely. It was a drawn SVG before being replaced by this photograph;
  now there is no object on the scene at all, only the background layers
  (`.stage-base`, `.stage-spot`, `.stage-tone`).
- Hotlinked Unsplash photos (hero and site backdrop) — replaced, then the
  replacements themselves were removed (see below).
- Photos of a dancer and of dress/skirt fabric (`hero/dancer-body.webp`,
  `objects/skirt-train.webp`, `scenes/dancer-fan.webp`,
  `backgrounds/ruffle-blur.webp`, all CC BY 2.0, photographer Alon) — removed
  at the user's request to drop photos of women and dresses from the
  composition. The site backdrop that used the last of these is now a plain
  CSS gradient.
