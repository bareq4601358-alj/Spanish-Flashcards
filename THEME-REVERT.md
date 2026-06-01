# Theme switching

## Current: premium (original size)
`style.css` — navy + gold at the original layout (scrolls naturally; no viewport lock).

## Revert to purple dark theme
```bash
cp style-classic.css style.css
```

## Backups
| File | What it is |
|------|------------|
| `style-standard.css` | Premium theme at **original** size (same as current `style.css` after restore) |
| `style-premium-large.css` | Large-scale layout test (rejected) |
| `style-premium.css` | Older premium backup (may differ from standard) |
| `style-classic.css` | Purple dark theme |

## Restore original premium size
```bash
cp style-standard.css style.css
```
