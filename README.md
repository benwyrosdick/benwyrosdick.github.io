# benwyrosdick.com

Personal blog built with [Astro](https://astro.build/) and managed with [Bun](https://bun.sh/). Deployed to GitHub Pages on every push to `master`.

## Development

```sh
bun install
bun run dev      # local dev server at http://localhost:4321
bun run build    # produce static site in dist/
bun run preview  # preview the production build
```

## Project layout

```
public/                  # static assets copied verbatim to the site root
src/
  components/            # shared Astro components (Head, Header, Footer, Scripts)
  content/blog/          # markdown posts (Astro content collection)
  layouts/               # page / post / base layouts
  pages/                 # routes
    index.astro          # paginated home (5 posts/page)
    page/[page].astro    # /page/2/, /page/3/, ...
    posts/[slug].astro   # individual post pages
    about.astro          # static about page
    feed.xml.ts          # RSS feed
    404.astro
  styles/                # SCSS
  site.config.ts         # site-wide config (title, social, etc.)
astro.config.mjs
```

## Writing a post

Drop a markdown file in `src/content/blog/`. Frontmatter:

```yaml
---
title: My Post Title
date: 2026-01-02T10:00:00-05:00
tags: [foo, bar]   # optional
image: /assets/article_images/.../cover.jpg  # optional
draft: false       # set true to exclude from build & feed
---
```

## Deployment

The `.github/workflows/deploy.yml` workflow installs deps with Bun, runs `bun run build`, and publishes `dist/` to GitHub Pages. The `public/CNAME` file keeps the custom domain pointing at `benwyrosdick.com`.
