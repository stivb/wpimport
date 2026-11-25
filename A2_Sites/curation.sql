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
-- UPDATE posts SET isPublic = 0
-- WHERE site_id = 'site2'
-- AND post_name IN ('the-art-of-connection', 'beyond-the-obstacle', 'growth-unlocked', 'collaboration-magic');

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
--UPDATE posts SET title = 'Home page highlights' WHERE site_id = 'site1' AND id = 88;

-- Hide posts or pages whose title or body indicates food-related content.
UPDATE posts SET isPublic = 0
WHERE LOWER(title) LIKE '%food%'
;

-- Term IDs are local to each site. A category and tag with the same ID
-- on one site share the same group.
CREATE TABLE term_group (
  tag_group_name TEXT NOT NULL,
  site_id TEXT NOT NULL,
  term_id INTEGER NOT NULL,
  PRIMARY KEY (site_id, term_id)
);

-- Five suggested browsing groups. Keep every exported term in this list;
-- an unmapped term causes curation to fail rather than being misclassified.
WITH group_names (tag_group_name, term_name) AS (
  VALUES
    ('Outdoor Activities', 'adventures'),
    ('Outdoor Activities', 'cycling'),
    ('Outdoor Activities', 'lakeside walk'),
    ('Outdoor Activities', 'outdoors'),
    ('Outdoor Activities', 'park'),
    ('Outdoor Activities', 'parks'),
    ('Outdoor Activities', 'parks and natures'),
    ('Outdoor Activities', 'parks and walking'),
    ('Outdoor Activities', 'parks and wellbeing'),
    ('Outdoor Activities', 'walking routes'),
    ('Outdoor Activities', 'walking trails'),
    ('Outdoor Activities', 'walks and hikes'),
    ('Outdoor Activities', 'woodland walks'),
    ('Fitness and Sport', '3g pitch'),
    ('Fitness and Sport', 'badminton'),
    ('Fitness and Sport', 'bodyweight'),
    ('Fitness and Sport', 'climbing'),
    ('Fitness and Sport', 'club sport'),
    ('Fitness and Sport', 'comets badminton'),
    ('Fitness and Sport', 'fitness'),
    ('Fitness and Sport', 'fitness classes'),
    ('Fitness and Sport', 'five-a-side'),
    ('Fitness and Sport', 'free fitness'),
    ('Fitness and Sport', 'group exercise'),
    ('Fitness and Sport', 'gym'),
    ('Fitness and Sport', 'gym and fitness'),
    ('Fitness and Sport', 'gym tips'),
    ('Fitness and Sport', 'herts football'),
    ('Fitness and Sport', 'home workouts'),
    ('Fitness and Sport', 'muga'),
    ('Fitness and Sport', 'parkrun'),
    ('Fitness and Sport', 'running'),
    ('Fitness and Sport', 'sports'),
    ('Fitness and Sport', 'sports and activities'),
    ('Fitness and Sport', 'squash'),
    ('Fitness and Sport', 'student fitness'),
    ('Fitness and Sport', 'student gyms'),
    ('Fitness and Sport', 'swimming'),
    ('Fitness and Sport', 'team sports'),
    ('Fitness and Sport', 'yoga and pilates'),
    ('Places and Venues', 'alban way'),
    ('Places and Venues', 'ellenbrook fields'),
    ('Places and Venues', 'gosling sports park'),
    ('Places and Venues', 'hatfield'),
    ('Places and Venues', 'hatfield leisure centre'),
    ('Places and Venues', 'hatfield swim centre'),
    ('Places and Venues', 'heartwood forest'),
    ('Places and Venues', 'hemel hempstead'),
    ('Places and Venues', 'hertford'),
    ('Places and Venues', 'hertfordshire sports village'),
    ('Places and Venues', 'oval gym'),
    ('Places and Venues', 'panshanger park'),
    ('Places and Venues', 'places to visit'),
    ('Places and Venues', 'puregym'),
    ('Places and Venues', 'sherrardspark wood'),
    ('Places and Venues', 'sports village'),
    ('Places and Venues', 'sports village pool'),
    ('Places and Venues', 'st albans'),
    ('Places and Venues', 'stanborough'),
    ('Places and Venues', 'stanborough park'),
    ('Places and Venues', 'town and villages'),
    ('Places and Venues', 'verulamium park'),
    ('Places and Venues', 'watford'),
    ('Places and Venues', 'welwyn garden city'),
    ('Places and Venues', 'westminster lodge leisure centre'),
    ('Health and Wellbeing', 'classes and wellbeing'),
    ('Health and Wellbeing', 'counselling'),
    ('Health and Wellbeing', 'exam stress'),
    ('Health and Wellbeing', 'food and drink'),
    ('Health and Wellbeing', 'healthy eating'),
    ('Health and Wellbeing', 'healthy habbits'),
    ('Health and Wellbeing', 'healthy habits'),
    ('Health and Wellbeing', 'mental health and mindfulness'),
    ('Health and Wellbeing', 'outdoor wellbeing'),
    ('Health and Wellbeing', 'sleep'),
    ('Health and Wellbeing', 'social wellbeing'),
    ('Health and Wellbeing', 'student mental health'),
    ('Health and Wellbeing', 'student wellbeing'),
    ('Health and Wellbeing', 'uh student wellbeing'),
    ('Health and Wellbeing', 'wellbeing'),
    ('Community and Practical Info', 'access'),
    ('Community and Practical Info', 'active students'),
    ('Community and Practical Info', 'ask herts'),
    ('Community and Practical Info', 'beginner'),
    ('Community and Practical Info', 'beginners'),
    ('Community and Practical Info', 'family fun'),
    ('Community and Practical Info', 'free activities'),
    ('Community and Practical Info', 'herts su'),
    ('Community and Practical Info', 'home'),
    ('Community and Practical Info', 'intense'),
    ('Community and Practical Info', 'making friends'),
    ('Community and Practical Info', 'moderate'),
    ('Community and Practical Info', 'pay as you go'),
    ('Community and Practical Info', 'student budget'),
    ('Community and Practical Info', 'student clubs'),
    ('Community and Practical Info', 'student deals'),
    ('Community and Practical Info', 'student discounts'),
    ('Community and Practical Info', 'student halls'),
    ('Community and Practical Info', 'student life'),
    ('Community and Practical Info', 'student memberships'),
    ('Community and Practical Info', 'student routine'),
    ('Community and Practical Info', 'uncategorized'),
    ('Community and Practical Info', 'whats on')
)
INSERT INTO term_group (tag_group_name, site_id, term_id)
SELECT DISTINCT g.tag_group_name, t.site_id, t.term_id
FROM terms t
LEFT JOIN group_names g ON g.term_name = LOWER(t.name);
