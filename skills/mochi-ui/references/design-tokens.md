# Mochi Design Tokens — Full Reference

All CSS variables defined in `src/index.css`. Use these everywhere — never hardcode hex.

## Color Tokens

### Neutral / Base
| Token | Hex | Use |
|-------|-----|-----|
| `--mochi-cream` | `#FFF8F0` | Page background |
| `--mochi-surface` | `#FFFBF8` | Card and panel backgrounds |
| `--mochi-border` | `#F0E4EC` | All borders |

### Text
| Token | Hex | Use |
|-------|-----|-----|
| `--mochi-text` | `#3D2C35` | Primary text |
| `--mochi-text-soft` | `#7A5F6A` | Secondary / supporting text |
| `--mochi-text-muted` | `#B8A0A8` | Placeholders, timestamps, labels |

### Pink (global accents, active/selected states)
| Token | Hex | Use |
|-------|-----|-----|
| `--mochi-pink` | `#FFD6E0` | Fill |
| `--mochi-pink-mid` | `#FFB3C6` | Border |
| `--mochi-pink-dark` | `#E8789A` | Text on pink, icons |

### Lavender (Notes section)
| Token | Hex | Use |
|-------|-----|-----|
| `--mochi-lavender` | `#E8DEFF` | Fill |
| `--mochi-lavender-mid` | `#C9B8F5` | Border |
| `--mochi-lavender-dark` | `#9B7FD4` | Text on lavender, icons |

### Mint (To-Do section)
| Token | Hex | Use |
|-------|-----|-----|
| `--mochi-mint` | `#D4F5E9` | Fill |
| `--mochi-mint-mid` | `#A8E6CF` | Border |
| `--mochi-mint-dark` | `#5BB98B` | Text on mint, icons |

### Peach (Schedule section)
| Token | Hex | Use |
|-------|-----|-----|
| `--mochi-peach` | `#FFE5CC` | Fill |
| `--mochi-peach-mid` | `#FFCBA4` | Border |
| `--mochi-peach-dark` | `#E8935A` | Text on peach, icons |

### Sky (Study Plan section)
| Token | Hex | Use |
|-------|-----|-----|
| `--mochi-sky` | `#D6EEFF` | Fill |
| `--mochi-sky-mid` | `#A8D4F5` | Border |
| `--mochi-sky-dark` | `#5B9FD4` | Text on sky, icons |

## Typography Tokens

| Property | Value |
|----------|-------|
| Body font | `'Nunito', sans-serif` |
| Heading font | `'Fraunces', serif` |
| Base size | `15px` |
| Line height | `1.8` |

## Spacing Scale (Tailwind classes)

| Purpose | Class |
|---------|-------|
| Tight gap (icon + label) | `gap-1.5` (6px) |
| Item gap | `gap-2` (8px) |
| Section gap | `gap-3` (12px) |
| Panel padding | `px-4 py-3` |
| Header padding | `px-5 py-4` |

## Border Radius Scale

| Element | Class | px |
|---------|-------|----|
| Cards, large panels | `rounded-2xl` | 16px |
| Buttons, inputs, dropdowns | `rounded-xl` | 12px |
| Small tags, toolbar buttons | `rounded-lg` | 8px |
| Pills, avatars | `rounded-full` | 9999px |

## Subject Color Options

These are the 6 colors users can pick for subjects:

| Name | Hex | Text color |
|------|-----|-----------|
| Pink | `#FFB3C6` | `#9B3A5A` |
| Lavender | `#C9B8F5` | `#5B3A9B` |
| Mint | `#A8E6CF` | `#2D7A5A` |
| Peach | `#FFCBA4` | `#9B5A2D` |
| Sky | `#A8D4F5` | `#2D5A9B` |
| Yellow | `#FFE899` | `#7A6200` |