# Cloudflare Edge Rules for Private Transfer Links

This project already ships `static/_headers` with a strict robots header for `/d/*`.
If Cloudflare deployment behavior changes or `_headers` is not applied, enforce the rule at the edge.

## Target Behavior

All responses on `/d/*` should return:

`X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`

## Option A: Transform Rule (Recommended)

Use a Cloudflare `HTTP Response Header Modification` rule.

1. Open Cloudflare dashboard for the site.
2. Go to `Rules` -> `Transform Rules`.
3. Create rule type: `Modify Response Header`.
4. Expression:

```txt
http.request.uri.path matches "^/d/.*"
```

5. Header action:
   - Header name: `X-Robots-Tag`
   - Operation: `Set static`
   - Value: `noindex, nofollow, noarchive, nosnippet`
6. Save and deploy.

## Option B: Worker Fallback

Use this only if Transform Rules are unavailable in your plan or architecture.

```js
export default {
  async fetch(request, env, ctx) {
    const response = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    const headers = new Headers(response.headers);

    if (url.pathname.startsWith('/d/')) {
      headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
```

## Verification

Run checks against production after deploy:

```bash
curl -sI https://jtransfer.jimmyverburgt.com/d/test | grep -i x-robots-tag
curl -sI https://jtransfer.jimmyverburgt.com/image-converter | grep -i x-robots-tag
```

Expected:

- First command returns the strict `X-Robots-Tag` value.
- Second command returns no strict noindex header.
