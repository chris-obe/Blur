<div align="center">

# blur

### A gallery, kit planner, and optics translator for photographers who want to understand the look of a frame.

[Open the app](https://compareblur.pages.dev) · [Compare systems](#compare-the-look) · [Use the gallery](#gallery-as-reference) · [Self-host](#self-hosting)

</div>

---

## The Short Version

blur answers a deceptively practical question:

> "If this photograph was made on that camera and lens, what would I need on my own system to get the same field of view and depth-of-field feel?"

It is part calculator, part reference gallery, part kit notebook. Upload or open a photograph, inspect the real shot metadata, switch target formats, and see what focal length and aperture would create the closest equivalent look elsewhere.

| What you can do | What blur gives back |
| --- | --- |
| Compare a 4x5, XPan, medium-format, full-frame, APS-C, Micro Four Thirds, compact, or phone shot | Equivalent focal length, equivalent aperture, field of view, crop factor, and blur behaviour |
| Save your own cameras and lenses | A practical verdict on whether your kit can already make the look |
| Browse a moderated photo gallery | Real examples with camera, lens, format, aperture, shutter, ISO, and framing context |
| Upload and organise your own photos | Private albums, EXIF extraction, compressed Cloudflare storage, and optional promotion into the public gallery |
| Embed photographs in a blog | Rich photo frames that carry the image, metadata, target-format selector, and a path back into blur |

---

## Why It Exists

The original howmuchblur calculator was a small, useful thing: a visual way to compare background blur between formats. blur keeps that spirit, but turns it into a working photographic tool.

The problem is no longer just "what is the crop factor?"

The more useful questions are:

- "I like this 6x7 portrait. What lens would make this feel similar on full frame?"
- "Does my kit already cover this look, or am I inventing an excuse to buy a lens?"
- "If this frame was made with a 35mm f/1.4 on a D810, what does that become on GFX, Micro Four Thirds, or 4x5?"
- "Can my gallery images carry the actual optical context instead of becoming anonymous JPEGs in a blog post?"

blur is built around those questions. It treats photographs as references, not just files.

---

## Compare The Look

The comparison engine works from the photographic properties that actually shape the image:

| Signal | Why it matters |
| --- | --- |
| Format size and aspect | Field of view changes by axis, which matters for panoramic formats like XPan and 6x17 |
| Focal length | Controls angle of view and perspective framing for a given subject distance |
| Aperture | Controls the effective blur relationship when translated across formats |
| Framing preset | Face, half-body, full-body, group, and landscape presets give blur calculations a more realistic subject scale |
| Kit inventory | The app can tell you whether your saved bodies and lenses cover the look already |

The core idea is simple: two systems feel similar when their field of view and background blur line up. blur handles the awkward bits around sensor dimensions, aspect ratios, focal distance assumptions, and real kit coverage.

---

## Gallery As Reference

The gallery is not just decoration. It is the evidence layer.

Each approved image can carry curated metadata:

| Metadata | Used for |
| --- | --- |
| Camera, lens, and format | Understanding the source system |
| Focal length and aperture | Calculating equivalence |
| Shutter, ISO, and capture date | Reading the photograph as a real exposure |
| Framing distance preset | Making compare defaults smarter |
| Tags and albums | Turning uploads into useful sets of references |

Admin uploads and user uploads are processed before storage, so new images do not require a rebuild. Metadata lives in Cloudflare D1. Image objects live in Cloudflare R2. Approved gallery photos become public references; account-owned albums stay private unless intentionally published.

---

## For Your Own Work

blur is being built as a personal photo-hosting and reference system as much as a calculator.

You can use it to:

- keep a private visual notebook of lens tests and references;
- build albums around projects, trips, cameras, or looks;
- compare possible purchases against the photos you actually want to make;
- publish selected images into a public gallery after the required details are complete;
- embed rich interactive frames in blog posts, with the image and optical context travelling together.

The best version of this is not a sterile benchmark. It is a living gallery of photographs that can explain themselves.

---

## Product Shape

| Surface | Purpose |
| --- | --- |
| `Gallery` | Public approved reference images with shared lightbox and optics panel |
| `Compare` | Build one or more systems and compare field of view, blur, and equivalent settings |
| `My Kit` | Save bodies and lenses so suggestions are grounded in what you own |
| `Suggestions` | See what lenses or systems would cover a desired look |
| `Albums` | Private account-owned galleries, bulk upload, edit, and publish workflows |
| `Settings` | Theme, account, album display preferences, and blog embed controls |
| `Admin` | Catalog refresh, gallery moderation, storage checks, uploads, tags, albums, and embed settings |

The interface is deliberately restrained: monochrome, hard-edged, dense where it needs to be, and focused on the photograph rather than decorative UI.

---

## Back Story

blur began as a ground-up revamp of the classic [howmuchblur](https://github.com/maakbaas/how-much-blur) background-blur calculator.

The original calculator made one idea approachable: different camera formats can be compared by the blur they produce, not only by the crop factor printed in a spec sheet. This project keeps that idea and adds the missing workflow around it: real images, real EXIF, real camera and lens catalogues, saved kits, Cloudflare-backed uploads, albums, moderation, and embeddable photo frames.

The result is no longer only a graph. It is a small photographic operating system for asking: "what made this look, and what would I need to make it?"

---

<a id="self-hosting"></a>
<details>
<summary><strong>Self Hosting</strong></summary>

### Requirements

- Bun or npm for local development.
- A Cloudflare Pages project for static hosting.
- Optional Cloudflare D1/R2/Workers resources for gallery, catalog refresh, albums, admin, and uploads.
- Optional Auth0 configuration for accounts and admin roles.

### Local Development

```bash
bun run setup
bun run dev
```

The app runs at the Vite dev URL configured in `app/`.

### Production Build

```bash
bun run build
```

Cloudflare Pages should use:

| Setting | Value |
| --- | --- |
| Root directory | repository root |
| Build command | `cd app && npm ci && npm run build` |
| Build output directory | `app/dist` |

### Useful Commands

```bash
bun run catalog:build
bun run catalog:check
bun run catalog:worker:deploy
bun run gallery:migrate-seed
```

### Repository Map

| Path | Role |
| --- | --- |
| `app/` | Vite, React, TypeScript frontend |
| `engine/` | Framework-agnostic optics engine |
| `catalog/` | Source adapters, transforms, validation, curated overrides |
| `functions/` | Cloudflare Pages Functions |
| `workers/` | Catalog refresh Worker |
| `migrations/` | D1 schema migrations |
| `docs/` | Design and catalog architecture notes |

</details>

<details>
<summary><strong>Licensing And Attribution</strong></summary>

Project code authored for the blur revamp is licensed under the MIT License. See [LICENSE.md](LICENSE.md).

Important boundaries:

- The original howmuchblur concept and repository history are credited to [maakbaas](https://github.com/maakbaas/how-much-blur).
- Lens data from [LensDB](https://github.com/Luminoid/lens-db) is licensed under CC BY-NC-SA 4.0 and remains under that license in generated catalog exports.
- CameraDatabase-derived records are MIT-licensed by their source.
- Lensfun-derived references remain subject to Lensfun/LGPL database terms.
- Gallery photographs, uploaded images, and personal content remain owned by their respective creators unless a separate license is stated.

</details>
