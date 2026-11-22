# Messages

One file per part of the site, each exporting the same text in every language:

```ts
const en = { title: "Send anything." };
const nl: typeof en = { title: "Verstuur alles." };
export const homeMessages: Record<Locale, typeof en> = { en, nl };
```

`nl: typeof en` makes a missing or extra Dutch line a type error, so
`bun run check` fails until every language has every line. Text that takes
values is a function: `sentCount: (n: number) => ...`.

Which language to show:

- Public pages: from the address, `localeFromPath(page.url.pathname)`.
- Pages after sign-in: the account's choice, `appLocale()` in `$lib/i18n/app.svelte.ts`.

To translate a public page, add its address pair to `../routes.js` and give it
its text here.
