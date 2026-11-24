# Hereditary Spherocytosis — 3D Interactive Atlas

An interactive, static 3D web atlas exploring red blood cell mechanics, genetics, and clinical context in hereditary spherocytosis (HS).

Live custom domain target: **https://hs.geri.io**

## Highlights

- **Full-screen photorealistic 3D red blood cell** powered by a parametric Evans–Fung biconcave geometry and Beer–Lambert hemoglobin optical shader.
- **Continuous zoom dive (`7.5 μm` → `500 nm` → `40 nm`)** directly through the living cell surface into a conformal Cryo-EM-inspired phospholipid bilayer, Band 3, Ankyrin-1, Protein 4.2, and braided coiled-coil Spectrin cutaway.
- **Isolate Membrane mode** to inspect the curved bilayer cross-section from all angles, including underneath.
- **Plain Language | Clinical** reading-depth switch across 3D annotations and editorial chapters.

## Local Development

```bash
npm install
npm run dev
```

## Production Build & GitHub Pages (`hs.geri.io`)

```bash
npm run build
```

Pushing to `main` automatically builds and deploys `./dist` (including `CNAME` for `hs.geri.io`) to GitHub Pages via `.github/workflows/deploy.yml`.

### DNS Setup
Point a **CNAME** record on `geri.io`:
- **Host / Name:** `hs`
- **Target / Value:** `<your-github-username>.github.io`
