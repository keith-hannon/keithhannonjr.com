# keithhannonjr.com

Keith Hannon's personal site: a Cape Cod house you can walk through, with beer pong in the basement.

You do not need to know how to code to keep this site up to date. Everything you'd want to change lives in one file, and the site republishes itself whenever that file changes.

---

## How to change a link, your name, or your tagline

1. Go to this project on github.com and click the file **`site.config.js`**.
2. Click the **pencil icon** (top right of the file) to edit.
3. Change the text **between the quotation marks** only. For example, to change the LinkedIn link, replace the address on the `linkedin:` line. Leave the quotes, commas and everything else alone.
4. Click the green **Commit changes…** button, then **Commit changes** again.
5. Wait about a minute and refresh keithhannonjr.com. Done.

What's in that file:

| Line | What it controls |
| --- | --- |
| `name` | Your name in the corner menu, loading screen, page title and simple page |
| `tagline` | The one-line description under your name and in link previews |
| `url` | The site's address (only change if the domain changes) |
| `resume` | The file name of your resume PDF (see below) |
| `linkedin`, `email`, `instagram` | Your links. For email, write just the address |

## How to replace the resume PDF

**Easiest way (keep the same file name):**

1. Name your new resume file exactly **`Keith_Hannon_Resume.pdf`**.
2. On github.com, open the **`public`** folder.
3. Click **Add file → Upload files**, drag the new PDF in, and click **Commit changes**. It replaces the old one.

**If you want a different file name:** upload it to the `public` folder the same way, then edit `site.config.js` and change the `resume:` line to match, keeping the slash in front, like `"/My_New_Resume.pdf"`.

## How to redeploy

You don't have to. Every time you commit a change on GitHub, Netlify rebuilds and publishes the site automatically, usually in under a minute.

If something looks stuck:

1. Log in at app.netlify.com and click the site.
2. Click **Deploys**. The top entry shows whether the last build is running, published, or failed.
3. To force a fresh build: **Trigger deploy → Deploy site**.
4. If a build failed after you edited `site.config.js`, the usual cause is a missing quotation mark or comma. Open the file's **History** on GitHub to see what changed, fix it, and commit again. Your live site stays on the last good version until a build succeeds.

## The social preview image

`public/og.png` is the picture that shows up when the link is texted or posted. To change it, upload a new 1200 × 630 image with the same name to the `public` folder.

---

## For whoever works on the code next

Stack: [Three.js](https://threejs.org) + [Vite](https://vite.dev), plain JavaScript, static output. No backend, no image or model downloads: the house is built from simple shapes and the textures are drawn on canvases at startup.

```
npm install      # once
npm run dev      # local preview at http://localhost:5173
npm run build    # production build into dist/
```

| Path | What it is |
| --- | --- |
| `site.config.js` | All personal info (the only file a non-programmer edits) |
| `index.html`, `src/main.js` | The 3D house: renderer, loop, loading screen |
| `src/world/layout.js` | Room dimensions, spawn point, collision boxes, floor heights |
| `src/world/house.js` | Exterior, walls, roof, stairs, basement shell, lighting |
| `src/world/outdoors.js` | Terrain, bluff, beach, ocean, sky, street, neighbors, deck, and the beach crowd |
| `src/world/wing.js` | The side wing: bunk room and sunroom |
| `src/world/suite.js` | Primary bedroom and the two bathrooms |
| `src/world/horizon.js` | Lighthouse, island, moored boats, ferry, distant trees and rooftops, cupola, pergola |
| `src/fun.js` | Mini fridge and beers, outdoor shower, driveway hoop, kite spot, Boston/Harvard decor |
| `src/games/kite/` | Kite fight on the beach |
| `src/sfx.js` | Sound effects |
| `src/world/textures.js` | Procedural textures (shingles, planks, paneling…) |
| `src/furnish.js` | Furniture and the interactive objects in each room |
| `src/interact.js` | Glow/label/click system and the link card |
| `src/player/controls.js` | Walking: keyboard + mouse, touch joystick, collision |
| `src/games/registry.js` | List of games |
| `src/games/pong/` | Beer pong (physics, UI, sounds) |
| `simple.html` | The fast "skip the tour" page |
| `daily.html`, `src/daily.js` | The Cape Daily (Daily Games placeholder) |
| `netlify.toml` | Build settings for Netlify |

### Tuning and people

- Beer pong difficulty: the four numbers under "Difficulty knobs" at the top of `src/games/pong/index.js` (sweep speeds, forgiveness, how often the house hits).
- People: there are none right now. `PEOPLE` at the top of `src/world/outdoors.js` turns the generic crowd back on; specific people can be placed with `person(x, z, {...})` in that file.

### Adding a game

1. Create `src/games/<name>/index.js` exporting `start(world, done)`. Build the UI inside `#overlay`, set `world.player.enabled = false` while playing, and call `done()` when the player leaves (see `pong/index.js`).
2. Add one entry to `catalog` in `src/games/registry.js`. Set `daily: true` to list it on The Cape Daily.
3. To put an object in the house that starts it, add a line in `src/furnish.js`:
   `ix.add(someObject, { label: "My Game", action: () => games.start("<name>", world) })`.

Objects passed to `ix.add` can also take `animate: (open, time) => {…}`, where `open` goes from 0 to 1 as the visitor walks up (the mailbox door, the newspaper, the laptop lid all use this).

Where the links live in the house: mailbox (email), corkboard (Instagram), laptop (LinkedIn), paper on the den desk (resume), newspaper on the kitchen table (Daily Games), pong table (beer pong).
