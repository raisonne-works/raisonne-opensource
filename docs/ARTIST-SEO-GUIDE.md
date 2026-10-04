# Artist SEO: ten publishing checks

10/10 means all ten checks have been verified for a page. It is an internal publishing standard, not a Google score or ranking prediction. Unverified checks remain pending.

1. **Intent:** assign one purpose: biography, artwork, series, exhibition, writing, commissioning or collecting. Describe the actual content. Never invent credentials, prices, counts, availability, shipping or certificates.
2. **Heading:** a visible H1 identifies the artist, work or subject. Use a logical heading hierarchy. A metadata heading tag does not replace an HTML H1.
3. **Search title:** write a unique title using the artist/work name and medium or purpose. Append the artist once. Roughly 50–60 characters is guidance; inspect truncation rather than enforcing a hard limit.
4. **Description:** summarize the actual page in one or two sentences with a reason to visit. Roughly 140–160 characters is guidance. Google may choose another snippet.
5. **Focus phrases:** use 1–8 specific related phrases naturally in headings, introduction and body. Prefer artist + artwork/series + medium and verified venues. Google ignores meta keywords; do not score repetition or keyword density.
6. **Share image:** select a relevant existing artwork, still, installation view or portrait. Open Graph and Twitter use stable public HTTPS URLs and descriptive alt text. Verify an unauthenticated GET and decoding. A compressed 1200×630 composition is useful; never distort artwork or require a wallet or expiring URL.
7. **Route and canonical:** the public page returns 200 with its own production canonical. Redirect old paths to genuine successors. Do not map an unrelated page just to give an old SEO record a destination.
8. **Discovery:** public pages are indexable, linked internally and included in the canonical sitemap. Control, account, preview and staging pages stay out of search. Verify rendered HTML, not only fields.
9. **Context and schema:** document artwork title, artist, date, medium, series and confirmed exhibitions/provenance. Use accurate Person/ProfilePage, VisualArtwork, Article and BreadcrumbList data as applicable. Validate rendered JSON-LD. Never invent Product prices or availability; not every schema type earns a rich result.
10. **Mobile and images:** verify mobile layout, descriptive alt text, responsive compressed images and dimensions. Measure PageSpeed and monitor real Core Web Vitals in Search Console. Metadata alone cannot establish these checks.

## Research

Refik Anadol’s [official works archive](https://refikanadol.com/works/) identifies specific projects, exhibitions, installations and public art. Its named-project structure is useful for artist catalogues; rankings cannot be inferred from this observation.

Google’s [starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) explains descriptive titles, useful content, links and ignored meta keywords. Its [title guidance](https://developers.google.com/search/docs/appearance/title-link) supports unique titles and avoiding repeated boilerplate. Its [snippet guidance](https://developers.google.com/search/docs/appearance/snippet) emphasizes page-specific summaries. Its [image guidance](https://developers.google.com/search/docs/appearance/google-images) covers accessible images, context and alt text.

## Platform rules

Read artist identity and production origin from site settings. Preserve explicit SEO overrides, falling back to actual page content and the current artist’s card. Treat blank strings as missing. Static page metadata must read the same record the editor modifies. Keep canonicals, sitemap entries and social URLs consistent.

The CMS checklist exposes six field checks and four public-page checks. It does not award 10/10 merely for populated fields. `PUBLIC_MEDIA_ORIGIN` identifies an existing public media/CDN origin and applies only to the already-public media collection. It does not change bucket permissions or private-file handling.

Current verified origin: `https://orkhan-media.fsn1.your-objectstorage.com`. All 11 selected image objects under `media/` return 200. CMS `/api/media/file/...` URLs returned 404. Configure this origin at runtime when deploying the public-media hook.

## September 30, 2026 audit

25 CMS records inspected; 21 active-page records updated and verified in the database with headings, search titles, descriptions, related phrases and selected images. Drops now points to `/catalog/drops`. `/contact`, `/publications`, `/updates` and `/temp` records were retained for route/content decisions. Contact redirects; the other three returned 404.

Other findings: `/collabs` bypassed CMS SEO; some titles repeated the brand; metadata cache lasted a day despite a five-minute fetch cache. Catalogue headings/content need rendered-browser verification. Some requests timed out. These pages cannot yet be certified 10/10.

## Release and verification

Preserve unrelated edits. Artist-site changes release through staging → master PRs; CMS releases use main. The Control editor is a separate container with source at `/opt/raisonne-control/editor`; an ordinary CMS deployment does not rebuild it. Update that editor through its existing process as well. Verify deployed revisions, public HTML, image GETs and the protected editor after release. See [deployment source of truth](../deployment/CURRENT-DEPLOYMENT.md).

Use Search Console to monitor indexing, queries, impressions and clicks per page against a dated baseline. Checklist scores do not guarantee ranking or traffic.
