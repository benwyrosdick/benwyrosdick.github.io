---
title: "Hosting Rails apps from a 2012 Mac mini with Arch, Docker, and Kamal"
date: 2026-05-17T11:30:00-05:00
tags: [self-hosting, docker, kamal, rails, arch-linux, homelab]
---

I had a 2012 Mac mini sitting in a drawer doing nothing — quad-core i7, 16 GB of RAM, an SSD I dropped in years ago. macOS no longer supports it, but the hardware is more than enough to run a handful of personal apps. So I wiped it, installed Arch Linux, and turned it into a home server. With [Docker](https://www.docker.com/), a self-hosted registry, and [Kamal](https://kamal-deploy.org/), pushing a Rails app to it is now one `git push` away.

This is the setup, end to end.

## Why a 2012 Mac mini

- **Idle hardware.** Already paid for. Already in the closet.
- **Plenty of power for hobby apps.** Ivy Bridge i7, 16 GB RAM, ~30 W under load.
- **Quiet, small, and runs Linux great** once you get past Apple's EFI quirks.
- **24/7 power cost is negligible** at home-electricity rates.

If I were buying hardware fresh I'd probably grab a small N100 mini PC, but the whole point here is that the Mac mini was already there.

## Installing Arch on Apple hardware

A few Apple-specific things to know:

- **Boot from USB**: hold Option at the chime to pick the USB installer.
- **EFI is fine**, but the firmware doesn't always like every bootloader. So you can install [rEFInd](https://www.rodsbooks.com/refind/) on the EFI partition as a safety net so Apple's firmware always finds *something* to boot.
- **Wi-Fi driver** for the Broadcom BCM4331 in the 2012 model is `broadcom-wl` from the AUR. I used ethernet for the install itself and haven't bothered with Wi-Fi yet.
- **Fan control**: install `mbpfan` so it doesn't sit there roasting under load. Out of the box, Linux on Apple hardware can leave the fans at minimum even when the CPU is hot.

Past that, it's a normal Arch install — `archinstall`, set up a user, install `docker` and `docker-compose`, enable the Docker service, add my user to the `docker` group, done.

```shell
pacman -S docker docker-compose
systemctl enable --now docker
usermod -aG docker ben
```

I also moved SSH to a non-standard port (2222), disabled root login and password auth, and pointed a DNS A record at the box (`house.wyrosdick.com`). The home router forwards 80/443/2222 and the registry port to it.

## A self-hosted Docker registry

Kamal needs an OCI registry it can push images to. You can use Docker Hub, GHCR, or any cloud registry — but since the same box serves the apps, I just run the official registry there too.

```shell
docker run -d --restart=always --name registry \
  -p 5555:5000 \
  -v /srv/registry:/var/lib/registry \
  -e REGISTRY_AUTH=htpasswd \
  -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd \
  -e REGISTRY_AUTH_HTPASSWD_REALM=registry \
  -v /srv/registry-auth:/auth \
  registry:2
```

A few notes:

- I expose it on **port 5555** instead of 5000 to keep app ports clean.
- Auth is plain htpasswd — fine for a single-user home setup. Generate the file with `htpasswd -Bc /srv/registry-auth/htpasswd ben`.
- Images live under `/srv/registry` so they survive container restarts.
- Kamal's built-in proxy (Traefik under the hood) handles TLS termination for the apps, but for the registry itself I let it speak plain HTTP and trust that traffic stays inside Tailscale or the LAN. If you expose the registry to the public internet, put a reverse proxy with TLS in front of it.

That's it. A few MB of RAM, no daemon babysitting.

## Kamal, the part that makes this nice

Kamal is the deploy tool that ships with Rails 8. It builds your Docker image, pushes it to a registry, SSHes into your server(s), pulls the new image, and does a zero-downtime swap behind its built-in proxy. There's a `kamal.yml` per app and that's the whole config surface.

The hard parts of self-hosting — SSL, rolling restarts, multi-app routing, secrets — are already solved.

## The actual config

Here's a real example. [`benwyrosdick/dev-tools`](https://github.com/benwyrosdick/dev-tools) is a small web tool I host on the Mac mini. It happens to be a React/Vite SPA (so the runtime is nginx rather than Puma), but the deploy story is identical for a Rails app — only the Dockerfile changes.

`config/deploy.yml`:

```yaml
service: dev-tools
image: benwyrosdick/dev-tools

servers:
  web:
    - house.wyrosdick.com

proxy:
  ssl: true
  host: dev-tools.benwyrosdick.com

registry:
  server: house.wyrosdick.com:5555
  username: ben
  password:
    - KAMAL_REGISTRY_PASSWORD

builder:
  arch: amd64

ssh:
  port: "2222"
```

A few things worth calling out:

- **`registry.server`** points at the self-hosted registry on `house.wyrosdick.com:5555`. Kamal authenticates with the `KAMAL_REGISTRY_PASSWORD` env var (which it reads from `.kamal/secrets`, which is gitignored).
- **`proxy.ssl: true` + `proxy.host`** is all the SSL config you need. Kamal's proxy provisions a Let's Encrypt cert for `dev-tools.benwyrosdick.com` automatically and renews it. Multiple apps can share the same proxy by adding more `proxy.host` entries — the proxy routes by hostname.
- **`builder.arch: amd64`** matters because the 2012 Mac mini is Intel. If you build on Apple Silicon, Kamal will cross-compile automatically as long as Docker BuildKit is available.
- **`ssh.port: "2222"`** matches the non-standard SSH port on the server.

The whole config is under 20 meaningful lines.

## Continuous deploys from GitHub

Two ways I deploy:

1. From my laptop: `kamal deploy`. That's the whole command.
2. From CI: every push to `main` triggers a GitHub Action that runs the same `kamal deploy`.

The `.github/workflows/deploy.yml` from the dev-tools repo:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.2
          bundler-cache: true

      - run: gem install kamal

      - uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

      - name: Trust the server
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -p 2222 house.wyrosdick.com >> ~/.ssh/known_hosts

      - name: Write the registry password
        run: |
          mkdir -p .kamal
          echo "KAMAL_REGISTRY_PASSWORD=$KAMAL_REGISTRY_PASSWORD" > .kamal/secrets
        env:
          KAMAL_REGISTRY_PASSWORD: ${{ secrets.KAMAL_REGISTRY_PASSWORD }}

      - name: Deploy
        run: kamal deploy
        env:
          KAMAL_REGISTRY_PASSWORD: ${{ secrets.KAMAL_REGISTRY_PASSWORD }}
```

Two repo secrets do the heavy lifting:

- `SSH_PRIVATE_KEY` — a deploy key with access to the Mac mini at port 2222.
- `KAMAL_REGISTRY_PASSWORD` — the htpasswd password I set up when starting the registry.

Each push: build the image on the GitHub runner, push it to my home registry, SSH in, pull, swap containers. End-to-end it's about 2 minutes for this small app.

## Adding a Rails app

Same setup. Drop a `Dockerfile` (Rails 8 generates a good one), add `config/deploy.yml` with the same registry block, point a DNS record at the home server, and `kamal deploy`. Kamal's proxy handles per-host routing so you can park as many apps on the box as RAM will tolerate.

For Rails specifically, you'll usually want:

- An `accessories:` block for Postgres or SQLite-with-Litestream.
- A `volumes:` entry for persistent storage (e.g. `/app/storage`).
- `env.secret` entries for `RAILS_MASTER_KEY`, database URL, etc., backed by `.kamal/secrets`.

## Tradeoffs

**What I love**: zero recurring cost, total control, dead-simple deploys, exactly one config file per app, no Kubernetes.

**What's annoying**: my home internet is the single point of failure. If the modem reboots while I'm out, the apps are offline. For anything I genuinely care about, that's an argument for a $5 VPS — but for "tools I use myself and don't mind being briefly offline," a Mac mini in the closet is just delightful.

If you've got idle hardware sitting around, this whole setup is maybe a Saturday afternoon to put together. The Kamal docs are the right next stop: <https://kamal-deploy.org/>.
