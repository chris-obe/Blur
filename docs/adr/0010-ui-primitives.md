# ADR-0010: Base controls come from `components/ui/`, never raw JSX

## Decision
The hard-edged base controls are implemented once in `app/src/components/ui/`
— Button, Select, TextField/TextArea, NumberField, Modal, IconButton, Panel,
ToggleRow, ErrorBanner, Chip, Dropdown, SearchSelect, FreeTextComboBox,
TagPicker, ReactionBar — plus `hooks/useCopyToClipboard`. Feature code
composes these; it does not restyle `<select>`/`<input>`/overlay divs inline
or define local lookalike components.

## Why
An audit found 17 raw selects, 27 raw inputs, 3 hand-rolled modals (one
without Escape handling), 3 copy-to-clipboard implementations, and 11 local
duplicate components — the same hairline styling drifting per file.

## Consequences
- A missing control means extending `components/ui/`, not inlining classes.
- Deliberate one-off variants (e.g. the optics panel's inline equivalent
  select, the album action bar's tooltip icon button) are allowed but should
  say so in a comment.
- `Select`/`TextField` expose `onValueChange` conveniences; sizes are
  `md` (h-9) and `sm` (h-8) only.
