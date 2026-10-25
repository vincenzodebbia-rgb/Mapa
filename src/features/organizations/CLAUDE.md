This block owns `organizations` (the public profile) and the Storage bucket `org-logos`.
Pages import only data.ts, types.ts and components/ (OrganizationProfile renders its own JSON-LD; OrganizationList for barrio pages).
Public reads use createSupabasePublicClient() (anon, no cookies) inside `'use cache'` + cacheLife("minutes") + cacheTag(ORGANIZATIONS_TAG): the profile page is fully static and answers a real 404. Any write to a profile (session 7, "Mi ficha") must call updateTag(ORGANIZATIONS_TAG).
Upcoming events on the profile come from the events block as a slot (`upcoming`) composed by the page: never import src/features/events.
"Gente que hace cosas" (professional): no address, no point, no "Nuestra historia" on the page; `indexable = false` means noindex and out of the sitemap.
Logo: one WebP per organization at `{organization_id}/logo.webp` (the database checks the path). Always pass uploads through reencode-logo.ts (WebP, max 256×256, no metadata) before Storage. Delete the file before deleting the organization.
Contact links: only http/https (toSafeHttpUrl), external links with rel="noopener noreferrer nofollow ugc". Text from the database is rendered as text, never as HTML.
