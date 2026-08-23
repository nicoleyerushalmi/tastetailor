# TasteTailor UI craft

Grounded in Refero-style editorial / gallery / split-media patterns. Identity stays atelier — not cream farmhouse, not purple SaaS.

## Primary references (patterns borrowed)

1. **Editorial journal / gallery** — large display type, generous section padding, numbered steps without icon-card grids, citation rails.
2. **Split media auth** — full-height photo panel + form on paper; mobile stacks photo band then form.

## Tokens (atelier)

| Role | Value |
| --- | --- |
| Paper | `#E7E9E2` |
| Surface | `#F4F5F0` |
| Ink | `#141814` |
| Muted | `#5A635A` |
| Accent | `#D97706` |
| Accent hover | `#B45309` |
| Accent soft | `#FDE7C3` |
| Border | `#C9CFC2` |
| Danger | `#B42318` |
| Display | Syne |
| Body | DM Sans |
| Control radius | 6px |
| Soft shadow | `0 12px 40px rgba(20, 24, 20, 0.08)` |

## Layout rules

- **Hero budget:** first viewport = brand + one line + CTA group + full-bleed photo. No cards/badges/stats on the photo.
- **Section rhythm:** one purpose per section; `py-20`–`py-28` marketing; app pages `py-10`–`py-14`.
- **Content width:** marketing fluid / `max-w-6xl`; forms & recipe `max-w-3xl`–`max-w-5xl`.
- **Cards:** only for interaction (forms, list rows, drawer). Prefer borders + surface over multi-shadow stacks.
- **Photo on text:** `.photo-veil` dark gradient so type stays readable.
- **Nav:** sticky; desktop underline active; mobile drawer (not wrapping link soup).
- **Recipe detail:** masthead → two-column ingredients | steps (md+); tools quiet; refine secondary.

## Motion (intentional)

1. Landing hero enter  
2. Generate button pending pulse  
3. Recipe masthead / columns enter  
4. Nav drawer open/close  

Respect `prefers-reduced-motion`.
