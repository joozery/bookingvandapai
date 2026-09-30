# Website theme audit — 2026-10-01

Reference refinement: inspected `../ref.png` supplied by the user. Updated central action gradients to vivid blue/violet, ink to deep navy, chrome to pink/lavender, and footer to deep indigo. Home trip cards now use purple shadows and permanent gradient booking buttons over a pale pink/lavender background. The user subsequently approved a banner while preserving content. The existing invitation block was moved above the trip cards, reusing its exact settings-driven copy, contact link and benefits. The banner reuses the site's scenic artwork instead of replacing trip photos. Desktop and mobile home screens were checked again after this move: no horizontal overflow or page errors; production build passed.

Purple Pastel + Blue/Purple Gradient is shared through `src/app/theme.css` and `src/app/globals.css`. Existing Tailwind palette names resolve to central tokens so nested components, portals and status controls share the palette. Buttons, headers, footers, cards, forms, badges, tables, calendars and tickets use these tokens. Status colors retain their meaning with softer shades. Original images, ticket artwork and LINE branding remain intact.

## Existing route coverage

| Route | Screens checked on desktop and mobile |
| --- | --- |
| `/` | Home, trip selection, van selection, seat selection, booking form, account dropdown, registration modal, review login and review form |
| `/tickets` | Logged out, empty account, digital ticket |
| `/scanner` | Scanner entry screen |
| `/trips/[id]/reviews` | Public trip reviews |
| `/privacy-policy` | Privacy policy |
| `/terms-of-service` | Terms of service |
| `/admin/[[...tab]]` | Login, dashboard, trips, completed-trips, vans, bookings, pending, users, checkin, staff, insurance, reviews, leaderboard, settings, profile and trip form |

Trip booking, registration and review entry are existing states of the home route. The project has no standalone contact, about, login or registration pages; no new pages were created.

## Validation

- `npm run build`: production compilation and TypeScript checks passed.
- `node scripts/verify-theme-scope.cjs`: 39 TSX files compared with a snapshot taken before theme edits; no content-token differences detected by the scope audit (the approved invitation-block move is compared independently of order).
- `scripts/audit-theme.cjs`: Chrome at 1440 × 1000 and 390 × 844, using isolated sample API responses and simulated signed-in roles. Screenshots and measurements are saved under `%TEMP%/dapai-theme-browser-audit` with `results.json`.
- Final browser run: 64 screen captures, 0 horizontal overflows, 0 captured page errors. Selected desktop and mobile screenshots were also visually inspected.
- These checks exercise presentation, navigation and opening forms. Real LINE authentication, camera permission/check-in, payment and submitting changes to the database are outside this visual audit.
- Existing text, data, trip images and business flows were preserved; the invitation block was repositioned as explicitly approved. No push or deployment was performed.

The scope script uses the temporary baseline recorded in `%TEMP%/dapai-theme-baseline-path.txt`. Browser screenshots use sample customer records, not real customer information.
