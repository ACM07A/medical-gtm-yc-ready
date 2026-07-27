# Canopus Care visual restyle

## Implemented

1. `style: tokens` (`3e951be`)
   - Added the Canopus Care colour, type, spacing, radius, shadow, and motion tokens.
   - Preserved compatibility aliases so the token pass was independently deployable.
2. `style: typography` (`f14a6cb`)
   - Applied the responsive display/body hierarchy, balanced headings, readable measures, and monospace metadata treatment.
3. `style: controls and status treatments` (`3310975`)
   - Standardized primary, secondary, status, eyebrow, focus, and touch-target treatments.
4. `style: cards and grid rhythm` (`137d941`)
   - Standardized section rhythm, shared containers, 24px card padding, symmetric card rows, and bottom-aligned card status elements.
5. `style: navigation and page shell` (`a9a184c`)
   - Restyled the sticky navigation, mobile menu, CTA band, and footer as calm operational surfaces.
6. `style: signature product components` (`1e8f8d4`)
   - Converted the existing dashboard preview into the dark console treatment and applied restrained semantic lane colours.
7. `style: motion and accessibility` (`5f97af6`)
   - Completed reduced-motion behavior and added intrinsic dimensions, lazy loading, and async decoding to existing below-the-fold portraits.

## Verification

- The unchanged `npm run build` command passed after every step.
- Original `href` values and element IDs are byte-for-byte equivalent to the pre-restyle DOM contract.
- Every internal anchor resolves to its original section.
- Browser layout checks passed at `360`, `390`, `768`, `1024`, `1280`, `1440`, and `1920` px with no page-level horizontal overflow.
- The four workflow cards have equal heights at every tested width.
- The mobile navigation opens inside the viewport, remains scrollable, and is dismissible.
- CSS size: `4,134` bytes gzipped before; `5,231` bytes gzipped after; delta `+1,097` bytes.
- Lighthouse, measured before and after through the same static server and mobile throttling:
  - Performance: `55` before, `55` after.
  - Accessibility: `95` before, `95` after.
  - Cumulative Layout Shift: `0` before, `0` after.
- No image was added or enlarged. Existing portrait assets retain their original byte sizes.

## Deliberately skipped

- No standalone logo asset was supplied with the task. The existing inline Canopus Care mark, accessible label, and home link were preserved and sized to `28px` desktop / `24px` mobile. A separate light/knockout brand asset still needs brand-team approval if one is required.
- The requested product portal restyle was not applied because those styles live in `server/canopus_ui.mjs`; editing that file would violate the explicit no-server-code guardrail.
- Announcement strip, comparison table, lane-card section, YC band, new photographs, and new console copy were not invented because the task explicitly forbids adding sections, cards, CTAs, or copy.
- The existing Google Fonts URL was not changed because all link targets were required to remain intact. The active stack uses stable system display, text, and monospace fonts to avoid font-swap layout shift.
- No scroll-reveal observer or animation library was added. Existing motion is CSS-only and disabled under `prefers-reduced-motion`.

## Proposed - needs approval

- Supply approved full-colour and knockout Canopus Care logo files to replace the current inline mark.
- Authorize a separate portal-only visual pass if `server/canopus_ui.mjs` may be changed without affecting routes, data, or deployment behavior.
- Authorize new content sections before adding any comparison table, YC-specific band, or additional reviewer walkthrough content.
