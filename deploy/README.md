# Shared n8n instance (for team testing)

A ready-to-run, self-hosted n8n with automatic HTTPS, so non-technical
colleagues can test the Mindbaz node from their browser — no local install,
and webhook triggers work out of the box (real public domain).

## Prerequisites

1. **A server** with Docker + Docker Compose (any small cloud VM works, e.g.
   Hetzner / DigitalOcean / Scaleway, ~5 €/month). Mindbaz has no servers of its
   own, so you'll rent a small VPS for this.
2. **A domain or subdomain** with a DNS **A record** pointing to the server's
   public IP (e.g. `n8n.mindbaz.com → 203.0.113.10`).
3. **Ports 80 and 443 open** on the server firewall.

## Setup

```bash
# on the server, in this deploy/ folder
cp .env.example .env
# edit .env → set DOMAIN to your (sub)domain
docker compose up -d
```

Caddy fetches a Let's Encrypt certificate automatically (allow ~1 min on first
start). Then open `https://<DOMAIN>`:

1. Create the **owner account** (this is local to the instance).
2. **Settings → Community Nodes → Install a community node** → type
   `n8n-nodes-mindbaz` → Install.
3. Invite your colleagues (**Settings → Users**) or share the login.

## Using it

- The **Mindbaz** and **Mindbaz Trigger** nodes are now available to everyone on
  the instance.
- For a trigger, the node's **Production URL** is already public
  (`https://<DOMAIN>/webhook/...`) — paste it straight into Mindbaz's webhook
  screen, pick the event, enable. No tunnel needed.

## Maintenance

```bash
docker compose pull && docker compose up -d   # update n8n
docker compose logs -f n8n                    # view logs
docker compose down                           # stop (data kept in the volume)
```

Data (workflows, credentials, the encryption key) lives in the `n8n_data`
Docker volume and persists across restarts/updates.

## Updating the Mindbaz node

Once a new version is published to npm, update it in the UI:
**Settings → Community Nodes →** the package **→ Update**.
