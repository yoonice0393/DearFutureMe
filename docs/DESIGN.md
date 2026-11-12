# Design system

The feel: **stationery and the postal service**. Warm paper, deep ink, one postal-red accent. Flat colors only: no gradients, glass, glows or blobs. These tokens are mirrored in `tailwind.config.ts`; never hard-code a hex value in a component.

## Color tokens

### Light (default)
| Token | Hex | Use |
|---|---|---|
| `paper` | `#F6F1E7` | Page background |
| `paper-deep` | `#EDE5D3` | Raised surfaces, envelope body, footer |
| `sheet` | `#FBF8F1` | The letter sheet in the editor |
| `ink` | `#1F2A37` | Body text, headings |
| `pencil` | `#5B6472` | Secondary text, captions, metadata |
| `postal` | `#B3261E` | The single accent: primary buttons, links, stamps, postmarks |
| `on-postal` | `#FFFFFF` | Text on postal-red buttons |
| `stamp` | `#2F6B4F` | Success state only ("Sealed", "Delivered") |
| `rule` | `#D9CFBC` | Ruled lines on the sheet, dividers (decorative, not text) |
| `border` | `#8A7F6A` | Form field and control borders |

### Dark ("night writing")
| Token | Hex | Use |
|---|---|---|
| `paper` | `#141B26` | Page background (deep ink, not black) |
| `paper-deep` | `#1C2533` | Raised surfaces |
| `sheet` | `#1A2230` | Letter sheet |
| `ink` | `#EFE6D2` | Cream text |
| `pencil` | `#A8AFBA` | Secondary text |
| `postal` | `#F08A7E` | Accent (lightened for contrast) |
| `on-postal` | `#141B26` | Text on postal buttons |
| `stamp` | `#7CC4A0` | Success |
| `rule` | `#2A3444` | Ruled lines |
| `border` | `#5E6878` | Field borders |

Implemented as CSS variables (`--c-paper` etc.) on `:root` and `.dark`, and referenced from Tailwind as `rgb(var(--c-paper) / <alpha-value>)`.

### Contrast (WCAG 2.1; AA = 4.5 text, 3.0 UI)
| Pair | Ratio | Pass |
|---|---|---|
| ink on paper | 12.91 | AAA |
| ink on paper-deep | 11.59 | AAA |
| pencil on paper | 5.31 | AA |
| pencil on paper-deep | 4.77 | AA |
| postal on paper | 5.81 | AA |
| postal on paper-deep | 5.21 | AA |
| white on postal (button) | 6.54 | AA |
| paper on postal (button) | 5.81 | AA |
| stamp on paper | 5.59 | AA |
| border on paper (UI) | 3.50 | AA (non-text) |
| cream on night | 13.93 | AAA |
| cream on night-raised | 12.42 | AAA |
| pencil-night on night | 7.83 | AAA |
| pencil-night on night-raised | 6.98 | AA |
| postal-night on night | 7.12 | AAA |
| postal-night on night-raised | 6.35 | AA |
| night on postal-night (button) | 7.12 | AAA |
| border-night on night (UI) | 3.07 | AA (non-text) |

`rule` is decorative only and never carries information.

## Typography
- **Headings:** Fraunces (variable, opsz + wght), self-hosted woff2. Weights 400–600; letterforms with a soft "WONK" axis off.
- **UI and body:** IBM Plex Sans, 400 / 500 / 600, self-hosted.
- **Accent (signature only):** Fraunces in italic (`font-hand italic`), used at most once per screen. A separate handwriting font was dropped to save 50 KB on mobile.
- Self-hosted via `@fontsource` packages so no request goes to Google.

### Type scale
| Token | Size / line-height | Use |
|---|---|---|
| `text-xs` | 14 / 20 | Fine print, postmark |
| `text-sm` | 16 / 24 | UI labels, captions |
| `text-base` | **18 / 30 (1.65)** | Body text, letter text |
| `text-lg` | 22 / 32 | Lead paragraph |
| `text-xl` | 28 / 36 | H3 |
| `text-2xl` | 36 / 44 | H2 |
| `text-3xl` | 48 / 56 | H1 (desktop; 36 on mobile) |

Body copy is capped at `max-w-prose` (~65ch). Paragraph spacing is 24px.

## Spacing scale (8px system)
`4, 8, 12, 16, 24, 32, 48, 64, 96` px, mapped to Tailwind `1, 2, 3, 4, 6, 8, 12, 16, 24`. Other values are removed from the config, so you can't use them by accident.

- Sections: 64–96px vertical on desktop, 40–56px on mobile (`py-12 md:py-24`). Tailwind's 40/56 = `py-10` / `py-14` are added as the only exceptions.
- Forms: label above field with an 8px gap, and 24px between fields.
- Touch targets: min 48px tall (`min-h-12`), and 56px in booth mode.

## Shape and detail
- Radius: 2px on fields and buttons (`rounded-sm`), and 0 on sheets/envelopes. No pill buttons.
- Shadows: a single soft "paper edge" shadow (`0 1px 0 rule, 0 8px 24px -16px ink/25%`). No heavy drop shadows.
- Motifs: a circular postmark with date text, a perforated-edge stamp, and an envelope flap (CSS triangle). Use them small and sparingly.
- Focus: 2px `postal` outline with a 2px offset on every interactive element.

## Layout
Mobile-first, left-aligned, editorial. Asymmetric two-column on desktop (content ~7/12, margin notes or postmark ~4/12). Avoid centered hero sections and rows of identical cards.

## Motion
- **Seal animation:** the envelope flap folds down, then a wax seal stamps in. CSS only, ~1s total.
- Every animation is disabled under `prefers-reduced-motion: reduce`, and the final state is shown instead.

## Illustration sizes
The spacing scale is strict, so decorative SVGs (stamps, postmarks) get their own fixed widths: `w-20` (80px), `w-28` (112px), `w-40` (160px) and `w-48` (192px). Never use them for layout spacing.
