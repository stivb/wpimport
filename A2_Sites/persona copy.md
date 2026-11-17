# Persona: who is this site for?

## Who is the ideal visitor?

An international student looking to lose weight and get fitter, who is new to the area and wants to explore local outdoor spaces. They are likely to be in their 20s or 30s, tech-savvy, and value convenience and accessibility. They may have limited time due to studies or work commitments, so they appreciate quick, easy-to-digest information.

## What are their top 3 goals when they visit this site?


1. Find free or low-cost outdoor activities in Hertfordshire that they can do alone or with friends.
2. Discover local parks, wildlife areas, and walking trails to explore during their free time.
3. Learn about fitness and wellness tips that are relevant to their lifestyle and environment.

## Which categories, tags, or sites matter most to them?

gyms, fitness, outdoor activities, parks, walking trails, wildlife, wellness, health, local events, community groups.

## What should be de-prioritised or hidden for this persona?

- WordPress's own default "About" boilerplate text (identical on both
  sites, not written for this audience).
- food recommendations, restaurant reviews, and other indoor dining content.
- Empty "page list"/"latest posts" navigation pages that only worked
  inside WordPress itself and render as blank cards here.

See `curation.sql` for exactly how each of these is hidden.

## Content model sketch

- Home → all visible posts, newest first, each shown as a photo card with
  a site badge (Outdoors In Herts / Get Fit In Herts).
- Filter by site → narrow to one source blog.
- Filter by category → narrow to a specific activity type (Parks, Walking,
  Wildlife, gym, outdoors).

