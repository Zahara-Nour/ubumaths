# Google avatar CDN — known trap

Loading user avatars from `https://lh3.googleusercontent.com/...` requires two
attributes on the `<img>` tag that look optional but **are load-bearing**:

```svelte
<img src={avatar_url} referrerpolicy="no-referrer" loading="lazy" onerror={handleImgError} />
```

Both live in `src/lib/components/UserAvatar.svelte` and **must stay** unless
you have explicit evidence Google has changed its behaviour.

## What goes wrong without them

### Without `referrerpolicy="no-referrer"`

Google's avatar CDN refuses cross-origin loads that carry a `Referer` header
pointing at a third-party origin (i.e. anything other than google.com). On
the browser side this surfaces as:

- 429 Too Many Requests
- 403 Forbidden
- occasionally a `net::ERR_FAILED` with no status

The behaviour is sometimes URL-dependent and sometimes per-batch — a single
avatar may load while the next ten fail, depending on Google's current rate
budget for the source IP. The `Referer` header is what they key off.

`referrerpolicy="no-referrer"` strips the header from the request entirely.
The CDN then treats it as an anonymous fetch and serves the image normally.

### Without `loading="lazy"`

When a page mounts many `UserAvatar` instances at once (kanban assignee
picker, class roster, friends list, leaderboard…), the browser fires N
parallel requests to the CDN. Even with `referrerpolicy="no-referrer"` the
sheer volume can trip Google's per-second limit.

Each failure permanently caches the URL in the `failedUrls` `SvelteSet`
(module-level, persists for the whole session). From then on, every
`UserAvatar` referencing that URL renders the role-based default instead of
the real photo, until a full page reload reinitialises the module.

`loading="lazy"` makes the browser defer images outside the viewport. The
batch effectively self-throttles as the user scrolls.

## Symptoms when something is off

> "Most students have a real avatar normally, but in the kanban / class
> roster / friends list, only one or two real photos load and everyone else
> shows the role default."

That is the canonical signature. If you see it after editing
`UserAvatar.svelte` or any consumer:

1. Check `referrerpolicy="no-referrer"` is still on the `<img>`.
2. Check `loading` defaults to `'lazy'` and consumers haven't explicitly
   passed `'eager'` on a high-volume surface.
3. Open the browser's network panel, filter on `googleusercontent.com`,
   look for 429 / 403 responses.
4. Do a **hard reload** (Cmd+Shift+R) to wipe the in-session `failedUrls`
   cache — a previous bug may have populated it and subsequent fixes won't
   take effect without a fresh module evaluation.

## Where this matters

Every `UserAvatar` consumer benefits transparently. The high-volume surfaces
to watch when adding new code:

- `src/routes/(protected)/organisation/kanban/[boardId]/AssigneeAvatars.svelte`
  (assignee picker can render 25+ avatars on a class board)
- `src/lib/components/FriendsList.svelte`
- `src/routes/(protected)/dashboard/teacher/...` (class roster views)
- `src/routes/(protected)/messages/inbox/+page.svelte`

If you ever need to render avatars OUTSIDE `UserAvatar` (e.g. in a Typst /
LaTeX pipeline), remember to apply the same `Referer`-stripping logic on
the server side — `fetch(url, { headers: { Referer: '' } })` or similar.

## History

- Symptom first surfaced when shipping the kanban assignee feature
  (v1.4 — `f6c0a8aa6`, board owner saw default avatars for most class
  members despite the column being populated correctly).
- Fix is `c7a07c925` (lazy loading) + `b16ae2e1a` (referrerpolicy).
