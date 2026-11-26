# Design review draft — orbital material journal

This remains a review checkpoint. The animation and control treatment should be judged in the local preview before they are locked.

## Visual concept

The site opens as a three-part journey and then settles into an editorial portfolio. The supplied video edits provide the three phases:

1. **Ignition:** a rear view of the red craft with pre-flight telemetry and engine ignition.
2. **Flight:** orbital acceleration and cockpit/space-travel views, framed independently for landscape and portrait displays.
3. **Arrival:** the craft approaches the orbital station; during the final second the video softens and dissolves into the live homepage introduction.

The site after the intro remains calm enough for recruiting use, but it now keeps the same world through a quiet animated space background.

## Colour and atmosphere

Dark mode uses deep navy, warm cream, teal-blue illumination and burnt-orange controls. Light mode keeps the warm cream base and uses the same orange and teal at lower opacity.

public/atmosphere.js draws semi-transparent nebulae, depth-separated drifting stars, a moving planet horizon and orbital band, and two intermittent flight trails. It responds to scroll and pointer position. The Motion control freezes it into a static composition, and system reduced-motion does the same.

## Typography and layout

- Georgia carries large editorial headings and project titles.
- Segoe UI carries body copy.
- Consolas is limited to small labels, dates, indices and player states.
- Homepage order: introduction, music, selected work, contact.
- Professional experience lives below the narrative and credentials on About.
- Work remains an editorial index instead of becoming a wall of cards.

## Tactile control system

The action language is based on small retro-futurist console keys:

- raised face with a darker physical edge;
- warm highlight along the top surface;
- orange or teal glow on hover;
- two-pixel lift on hover and a three-pixel press on activation;
- the same easing and depth across theme, motion, music, navigation tabs, prompts and contact actions;
- editorial case-study rows keep their open layout, but use the same accent and directional motion.

## Motion language

- flight easing: cubic-bezier(.22,.75,.24,1);
- touch easing: cubic-bezier(.2,.8,.2,1);
- intro: 10 seconds at the supplied 24 FPS; one H.264 source loads per visit;
- atmosphere: capped near 24 FPS;
- skip, wheel or touch exits immediately;
- completion hides the intro from both the visual and accessibility trees and resets the page to the homepage introduction;
- Motion off and reduced-motion remove nonessential movement.

## Responsive direction

At runtime, the intro compares the viewport with the 16:9 and 9:16 source ratios and loads whichever preserves more of the authored frame. `object-fit: cover` handles the remaining crop. The homepage and About timeline collapse to one column. Tactile controls retain a 44-pixel minimum target, and the floating chat stays in the lower-right without covering the music player.
