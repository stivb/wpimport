-- curation.sql — editorial decisions for "Family Days Out in Herts"
--
-- Persona (see persona.md): a Hertfordshire parent looking for free,
-- family-friendly things to do outdoors, plus the odd fitness class.
-- They don't care about WordPress's own boilerplate, empty navigation
-- pages, or duplicate/near-duplicate entries — so those are hidden below.

-- WordPress adds the exact same instructional "About" text to every new
-- site by default; it isn't real content for either site here.
UPDATE posts SET isPublic = 0 WHERE post_name = 'about';

-- These four site2 posts are WordPress's own demo content (left over from
-- "Get Fit In Herts" being newly created) — not about fitness or Herts at
-- all, so they'd confuse a visitor looking for real activities.
UPDATE posts SET isPublic = 0
WHERE site_id = 'site2'
  AND post_name IN ('the-art-of-connection', 'beyond-the-obstacle', 'growth-unlocked', 'collaboration-magic');

-- These pages only contained WordPress "page list" / "latest posts" blocks
-- (categories/navigation widgets that only work inside WordPress itself);
-- outside WordPress they render as blank cards, so they're hidden here
-- rather than shown empty. The real posts they were meant to list are kept.
UPDATE posts SET isPublic = 0
WHERE post_type = 'page'
  AND post_name IN ('social-groups', 'by-region', 'walking', 'welwyn-and-hatfield',
                     'st-albans', 'tring', 'parks', 'gyms', 'outdoors', 'free');

-- The homepage slideshow post had no title at all — give it one so it
-- reads sensibly as a card instead of showing a blank heading.
UPDATE posts SET title = 'Home page highlights' WHERE site_id = 'site1' AND id = 88;
