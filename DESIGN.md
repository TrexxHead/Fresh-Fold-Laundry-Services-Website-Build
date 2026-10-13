# FreshFold design system — Clear Day

FreshFold needs to make a personal handoff feel orderly and trustworthy. The system uses a bright Kingston-sky palette, crisp white laundry-card surfaces, deep ink text, and a small mint accent for completion states. It deliberately avoids stock-photo testimonials, sterile medical whites, and generic purple SaaS gradients.

## Direction

- **Voice:** direct, friendly Jamaican English; practical before promotional.
- **Primary visual idea:** folded layers and a breezy clothesline rhythm, rendered in CSS so no unauthorised people or brand photography are implied.
- **Typography:** editorial serif headings add warmth; a highly legible sans-serif handles forms, prices, and operations.
- **Motion:** Motion for React provides route continuity, viewport reveals, tactile cards and the mobile navigation transition. CSS handles booking-step and control-state feedback. Every effect uses opacity or transforms, avoids layout shifts, and follows the user’s reduced-motion preference through `MotionConfig` plus a CSS fallback.
- **Logo:** no logo file was supplied. The UI uses an explicitly temporary text treatment, not an invented logo. Replace it with the approved mark before launch.

## Competitive cues used carefully

Three current laundry-service patterns informed the hierarchy: Laundr puts scheduling and price clarity first; TapWash separates regular service from individually priced bulky items; LaundryToGo explains that weighing precedes invoicing. FreshFold adopts that clarity without copying their claims, service guarantees, unattended-pickup language, or pricing.

## Tokens

The canonical machine-readable values live in `design-tokens.json` and are mirrored in `src/app/globals.css`. Never add an arbitrary brand colour in a component. Use spacing increments from the 4px-based scale and one of four radii.

## Components

- `Button`: solid ink primary, white/outline secondary, minimum 44px high.
- `Card`: white surface with a 1px sky border and restrained radius.
- `Notice`: icon + text, never colour-only; semantic info/warning/success variants.
- `PriceTable`: semantic table with a scroll affordance on small screens.
- `FormField`: visible label, hint/error relationship, 44px minimum control height.
- `StatusPill`: friendly label plus icon/text; internal statuses remain in the data layer.
- `RouteTransition`: a short enter/exit cue that preserves navigation context without delaying the task.
- `Reveal` / `MotionCard`: once-only viewport hierarchy and restrained hover/press feedback; never an infinite decorative loop.

The `/design-system` route and `public/design-preview.html` are the living visual references.
