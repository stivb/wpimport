-- curation.sql — editorial decisions for "Family Days Out in Herts"
--
-- Persona (see persona.md): an international student who wants affordable
-- outdoor activities, local parks and walks, and relevant fitness/wellness
-- information. Keep the content focused and quick to browse.

-- WordPress's default About page is boilerplate, not local activity content.
UPDATE posts SET isPublic = 0 WHERE LOWER(post_name) = 'about';

-- These site2 entries are generic WordPress demo posts, not local fitness,
-- wellness, or outdoor information.
UPDATE posts SET isPublic = 0
WHERE site_id = 'site2'
  AND post_name IN ('the-art-of-connection', 'beyond-the-obstacle',
                    'growth-unlocked', 'collaboration-magic');

-- These pages only contained WordPress "page list" / "latest posts" blocks
-- (categories/navigation widgets that only work inside WordPress itself);
-- outside WordPress they render as blank cards, so they're hidden here
-- rather than shown empty. The real posts they were meant to list are kept.
UPDATE posts SET isPublic = 0
WHERE post_type = 'page'
  AND post_name IN ('social-groups', 'by-region', 'walking', 'welwyn-and-hatfield',
                     'st-albans', 'tring', 'parks', 'gyms', 'outdoors', 'free');

-- Hide explicit food recommendations, restaurant reviews, and indoor dining
-- without excluding general health or nutrition advice that may be useful.
UPDATE posts SET isPublic = 0
WHERE LOWER(title) LIKE '%restaurant%'
   OR LOWER(title) LIKE '%cafe%'
   OR LOWER(title) LIKE '%café%'
   OR LOWER(title) LIKE '%dining%'
   OR LOWER(title) LIKE '%food recommendation%'
   OR LOWER(title) LIKE '%food review%'
   OR LOWER(title) LIKE '%places to eat%'
   OR LOWER(title) LIKE '%where to eat%'
   OR LOWER(content) LIKE '%restaurant review%'
   OR LOWER(content) LIKE '%restaurant recommendation%'
   OR LOWER(content) LIKE '%cafe review%'
   OR LOWER(content) LIKE '%food recommendation%'
   OR LOWER(content) LIKE '%food review%'
   OR LOWER(content) LIKE '%indoor dining%'
   OR LOWER(content) LIKE '%dining out%'
   OR LOWER(content) LIKE '%places to eat%'
   OR LOWER(content) LIKE '%where to eat%';
