# Persona: who is this site for?

## Who is the ideal visitor?

A parent living in Hertfordshire with young children, looking for cheap or
free things to do outdoors at the weekend, and occasionally interested in
local fitness classes for themselves once the kids are at school.

## What are their top 3 goals when they visit this site?

1. Quickly find a free, family-friendly outdoor spot to visit this weekend.
2. See a photo and a short description before deciding whether it's worth
   the drive.
3. Occasionally check what fitness/gym options exist locally, without
   having to dig through unrelated content to find them.

## Which categories, tags, or sites matter most to them?

- The `free` tag (site1) and the `outdoors`/`Parks`/`Wildlife`/`Walking`
  categories are the most important — they map directly to "free family
  day out" goal #1.
- Individual posts about specific places (Stanborough Lakes, Verulamium
  Park, Whipsnade Zoo, Wendover Wood, Hatfield House) are the actual
  content this persona wants to browse.
- Site2's gym/outdoors posts are relevant background but secondary.

## What should be de-prioritised or hidden for this persona?

- WordPress's own default "About" boilerplate text (identical on both
  sites, not written for this audience).
- Site2's leftover demo/sample posts ("The Art of Connection", "Beyond the
  Obstacle", "Growth Unlocked", "Collaboration Magic") — generic business
  filler text, not about fitness or Hertfordshire.
- Empty "page list"/"latest posts" navigation pages that only worked
  inside WordPress itself and render as blank cards here.

See `curation.sql` for exactly how each of these is hidden.

## Content model sketch

- Home → all visible posts, newest first, each shown as a photo card with
  a site badge (Outdoors In Herts / Get Fit In Herts).
- Filter by site → narrow to one source blog.
- Filter by category → narrow to a specific activity type (Parks, Walking,
  Wildlife, gym, outdoors).

