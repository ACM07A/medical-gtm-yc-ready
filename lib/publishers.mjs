// Content DELIVERY adapters — post a draft to each platform. Every adapter is wired to the correct API
// shape and is OFF until its key is set: "just add the API key". DOUBLE human gate: publish() is a DRY-RUN
// (returns what WOULD post) unless BOTH opts.confirm===true AND env POST_LIVE=1. Health content stays
// human-approved by design. No key => available() false => the pipeline keeps the draft queued.
//
// Image note: Instagram/Facebook require a PUBLIC image URL (they fetch it) — so generated images must be
// hosted (ties to the public site). Text platforms don't need that.

const need = (...keys) => keys.every((k) => !!process.env[k]);

export const publishers = {
  // --- Instagram (Meta Graph API · Content Publishing) --------------------------------------------
  instagram: {
    channel: "instagram",
    envKeys: ["IG_USER_ID", "IG_ACCESS_TOKEN"],
    requirements: "IG Business/Creator account + linked FB Page + Meta app + long-lived token; images must be public URLs",
    available: () => need("IG_USER_ID", "IG_ACCESS_TOKEN"),
    // Single image or carousel. imageUrls must be PUBLIC https URLs. Two-step: create container -> publish.
    async publish({ caption, imageUrls = [] }, { confirm = false } = {}) {
      const igId = process.env.IG_USER_ID, tok = process.env.IG_ACCESS_TOKEN, base = "https://graph.facebook.com/v21.0";
      const live = confirm && process.env.POST_LIVE === "1";
      if (!live) return { dryRun: true, would: `IG post: ${imageUrls.length || 0} image(s), caption ${(caption || "").length} chars` };
      const post = async (path, body) => {
        const r = await fetch(`${base}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, access_token: tok }) });
        if (!r.ok) throw new Error(`IG ${path} ${r.status}: ${(await r.text()).slice(0, 120)}`); return r.json();
      };
      let creationId;
      if (imageUrls.length > 1) { // carousel
        const children = [];
        for (const u of imageUrls) children.push((await post(`${igId}/media`, { image_url: u, is_carousel_item: true })).id);
        creationId = (await post(`${igId}/media`, { media_type: "CAROUSEL", children, caption })).id;
      } else {
        creationId = (await post(`${igId}/media`, { image_url: imageUrls[0], caption })).id;
      }
      const res = await post(`${igId}/media_publish`, { creation_id: creationId });
      return { posted: true, id: res.id };
    },
  },

  // --- LinkedIn (UGC / Posts API) ----------------------------------------------------------------
  linkedin: {
    channel: "linkedin",
    envKeys: ["LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"],
    requirements: "LinkedIn app + OAuth token with w_member_social/w_organization_social; author URN (person or org)",
    available: () => need("LINKEDIN_ACCESS_TOKEN", "LINKEDIN_AUTHOR_URN"),
    async publish({ text }, { confirm = false } = {}) {
      const tok = process.env.LINKEDIN_ACCESS_TOKEN, author = process.env.LINKEDIN_AUTHOR_URN;
      if (!(confirm && process.env.POST_LIVE === "1")) return { dryRun: true, would: `LinkedIn post ${(text || "").length} chars` };
      const r = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
        body: JSON.stringify({ author, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: "NONE" } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } }),
      });
      if (!r.ok) throw new Error(`LinkedIn ${r.status}: ${(await r.text()).slice(0, 120)}`);
      return { posted: true, id: r.headers.get("x-restli-id") };
    },
  },

  // --- X / Twitter (v2) --------------------------------------------------------------------------
  x: {
    channel: "x",
    envKeys: ["X_ACCESS_TOKEN"],
    requirements: "X developer app (Basic tier for write) + OAuth2 user-context token with tweet.write",
    available: () => need("X_ACCESS_TOKEN"),
    async publish({ text }, { confirm = false } = {}) {
      const tok = process.env.X_ACCESS_TOKEN;
      if (!(confirm && process.env.POST_LIVE === "1")) return { dryRun: true, would: `Tweet ${(text || "").length} chars` };
      const r = await fetch("https://api.twitter.com/2/tweets", { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!r.ok) throw new Error(`X ${r.status}: ${(await r.text()).slice(0, 120)}`);
      return { posted: true, id: (await r.json()).data?.id };
    },
  },

  // --- Reddit (submit) ---------------------------------------------------------------------------
  reddit: {
    channel: "reddit",
    envKeys: ["REDDIT_ACCESS_TOKEN", "REDDIT_SUBREDDIT"],
    requirements: "Reddit app (script) + OAuth token with submit; target subreddit; respect each sub's self-promo rules",
    available: () => need("REDDIT_ACCESS_TOKEN", "REDDIT_SUBREDDIT"),
    async publish({ title, text }, { confirm = false } = {}) {
      const tok = process.env.REDDIT_ACCESS_TOKEN, sr = process.env.REDDIT_SUBREDDIT;
      if (!(confirm && process.env.POST_LIVE === "1")) return { dryRun: true, would: `Reddit self-post to r/${sr}: "${(title || "").slice(0, 40)}"` };
      const form = new URLSearchParams({ sr, kind: "self", title: title || "", text: text || "", api_type: "json" });
      const r = await fetch("https://oauth.reddit.com/api/submit", { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Canopus Care/1.0" }, body: form });
      if (!r.ok) throw new Error(`Reddit ${r.status}: ${(await r.text()).slice(0, 120)}`);
      return { posted: true };
    },
  },

  // --- WhatsApp (Meta Cloud API · template/broadcast) --------------------------------------------
  whatsapp: {
    channel: "whatsapp",
    envKeys: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"],
    requirements: "Meta WhatsApp Business (Cloud API) phone number + token; broadcasts use pre-approved templates",
    available: () => need("WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"),
    async publish({ to, text }, { confirm = false } = {}) {
      const tok = process.env.WHATSAPP_TOKEN, pid = process.env.WHATSAPP_PHONE_ID;
      if (!(confirm && process.env.POST_LIVE === "1")) return { dryRun: true, would: `WhatsApp session message to ${to || "<opt-in list>"}` };
      const r = await fetch(`https://graph.facebook.com/v21.0/${pid}/messages`, { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }) });
      if (!r.ok) throw new Error(`WhatsApp ${r.status}: ${(await r.text()).slice(0, 120)}`);
      return { posted: true };
    },
    // Send an APPROVED template (opens/re-opens outside the 24h window). imageUrl = PUBLIC url of the header
    // infographic; bodyVars fills {{1}},{{2}}… Human-gated. Template must already be approved in Meta.
    async sendTemplate({ to, template, language = "en", imageUrl, bodyVars = [] }, { confirm = false } = {}) {
      const tok = process.env.WHATSAPP_TOKEN, pid = process.env.WHATSAPP_PHONE_ID;
      if (!(confirm && process.env.POST_LIVE === "1")) return { dryRun: true, would: `WhatsApp template '${template}' to ${to} (${imageUrl ? "image header + " : ""}${bodyVars.length} vars)` };
      const components = [];
      if (imageUrl) components.push({ type: "header", parameters: [{ type: "image", image: { link: imageUrl } }] });
      if (bodyVars.length) components.push({ type: "body", parameters: bodyVars.map((t) => ({ type: "text", text: String(t) })) });
      const r = await fetch(`https://graph.facebook.com/v21.0/${pid}/messages`, {
        method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: template, language: { code: language }, components } }),
      });
      if (!r.ok) throw new Error(`WhatsApp template ${r.status}: ${(await r.text()).slice(0, 120)}`);
      return { posted: true, id: (await r.json()).messages?.[0]?.id };
    },
  },
};

export function publisherFor(channel) { return publishers[channel] || null; }
