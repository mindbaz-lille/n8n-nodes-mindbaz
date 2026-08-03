# n8n-nodes-mindbaz

This is an n8n community node. It lets you use [Mindbaz](https://www.mindbaz.com) in your n8n workflows.

Mindbaz is a marketing automation and campaign management platform. This package mirrors the official Mindbaz Zapier integration: manage subscribers, send OneShot campaigns, and react to subscriber / tracking events through webhooks.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Development](#development)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/), then install `n8n-nodes-mindbaz`.

## Credentials

**Mindbaz API** — authenticate with:

- **Site ID**: the id of your database.
- **API Key**: sent in the `X-API-Key` header on every request.

The credential test calls `GET /api/{siteId}/thematics`.

## Operations

### Mindbaz (action node)

**Subscriber**

- **Create** — add a subscriber with static and custom fields (field ids loaded from `/fields/list`).
- **Update** — edit a subscriber by its id (field 0) plus any editable fields.
- **Unsubscribe** — set a subscriber's state to unsubscribed (fields `0` + `7=1`).
- **Search** — look up a subscriber by email; `fields` are flattened into `fld_<id>` keys.

**Mail**

- **Send (Simple)** — OneShot send with only `campaignId` + `subscriberId`.
- **Send (Full Options)** — OneShot send overriding subject, HTML/text message, sender alias, field ids, hashes, and up to 3 PDF attachments (Base64, 2MB max each).

### Mindbaz Trigger (webhook node)

Starts a workflow when a Mindbaz event occurs. **One event per node**: add a
node, pick the event, and each node exposes its own webhook URL that you
register in Mindbaz (same as the Make setup).

1. Add a **Mindbaz Trigger** node and select the **Event** (Mail Opened, Link Clicked, Contact Added, Unsubscribe, Bounce, …).
2. Activate the workflow (or use the Test URL while listening) and copy the node's **Production URL**.
3. In the Mindbaz back office → **Webhooks → add a webhook**, paste that URL, choose the **same event**, and enable it.

Your n8n instance must be reachable from the internet for Mindbaz to deliver the
events. Each event outputs the raw payload, e.g.:

```json
{
  "event": "email.opened",
  "event_id": "d883a52e-dab4-404c-bae7-d9acba75a058",
  "id_site": 100,
  "type": "Mindbaz",
  "data": { "event_date": "…", "id_sent": 0, "id_subscriber": 0, "ip": "…", "user_agent": "…", "email": "…" }
}
```

## Development

```bash
npm install
npm run build      # tsc + copy icons into dist/
npm run lint       # eslint (n8n-nodes-base ruleset)
npm run dev        # tsc --watch
```

To test locally, link the package into your n8n custom nodes folder — see the [n8n node development docs](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/).

## Compatibility

Requires n8n with `n8nNodesApiVersion` 1 and Node.js >= 22.
