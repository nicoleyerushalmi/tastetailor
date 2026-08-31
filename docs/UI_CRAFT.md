# TasteTailor UI craft

Grounded in Refero-style editorial / gallery / split-media patterns. Identity is warm and culinary — cream paper, terracotta accent — not purple SaaS.

## Primary references (patterns borrowed)

1. **Editorial journal / gallery** — large display type, generous section padding, numbered steps without icon-card grids, citation rails.
2. **Split media auth** — full-height photo panel + form on paper; mobile stacks photo band then form.

## Tokens

| Role | Value |
| --- | --- |
| Paper (background) | `#F9F6F0` |
| Surface | `#F4F5F0` |
| Ink | `#141814` |
| Muted | `#5A635A` |
| Accent | `#C84C09` |
| Accent hover | `#A43E07` |
| Accent soft | `#FDE7C3` |
| Border | `#C9CFC2` |
| Danger | `#B42318` |
| Display (headings) | Syne |
| Body | DM Sans |
| Logo / wordmark only | Playfair Display |
| Control radius | 6px |
| Input background | `#FFFFFF` |
| Input border | `#E7DED0` |
| Input radius | 16px (rounder/softer than the general control radius — inputs specifically) |
| Input shadow | `0 2px 8px rgba(120, 72, 33, 0.06)` |
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

`prefers-reduced-motion` is respected via `MotionConfig reducedMotion="user"`, which suppresses transform-based animation (position, scale). The generate button's pending pulse and the nav drawer backdrop animate opacity, which this setting does not cover — those two elements still animate for reduced-motion users.
