# Design Brief — Blueprint

The design reference for **Blueprint**, the product that turns an idea into a build-ready pack a coding agent can build in a few hours. It describes **what to design and how it should feel**. Behavior and data rules live in `docs/11-ui-ux-specification.md`. This brief adds the look.

## The product in one line

Paste your idea, your ChatGPT or Claude chat, files or a Figma link into one big prompt box. Blueprint asks the few questions that matter, then hands you a complete build pack that any AI coding agent can turn into a working app.

## The feeling

- **An AI prompt box first, not a dashboard.** Like ChatGPT, Lovable or v0: one big, friendly input in the middle of the screen. Everything else is secondary.
- **Bright, colorful, optimistic.** A vivid violet → pink → amber gradient, white space, soft glowing shapes. It should feel creative and fun, not corporate.
- **Few pages.** Six screens in total. Most of the work happens on one project page.
- **Calm when it's busy.** While the AI works, show friendly progress instead of spinners and tables.

## Colors

| Token | Hex | Use |
|---|---|---|
| Background | `#FFFDF8` | page (warm white) |
| Surface | `#FFFFFF` | cards, prompt box |
| Primary | `#7C3AED` | main buttons, links, focus ring (hover `#6D28D9`) |
| Pink | `#EC4899` | gradient middle, highlights |
| Amber | `#F59E0B` | gradient end, "assumed" badges |
| **Brand gradient** | `#7C3AED → #EC4899 → #F59E0B`, 120° | decoration only: the prompt box's glowing border, progress bars, background blobs |
| **Text gradient** | `#7C3AED → #DB2777 → #EA580C`, 120° | gradient-filled headlines (ends in orange, not amber, so it stays readable) |
| **Button gradient** | `#7C3AED → #C026D3`, 120° | primary buttons with white text |
| Teal | `#14B8A6` | success, "ready", confirmed decisions |
| Sky | `#0EA5E9` | info, links in docs |
| Red | `#EF4444` | blockers, errors |
| Text | `#1E1B4B` | body text (deep indigo, not black) |
| Muted text | `#6B7280` | hints, timestamps |
| Border | `#EDE9FE` | light violet hairlines |

Background decoration: two or three large, blurred gradient blobs (violet, pink, amber at 15–25% opacity) behind the hero and the prompt box.

Accessibility: body text is always `#1E1B4B` on white or the warm background. White text is allowed only on the button gradient, never on pink or amber. Amber is never used for text on white; amber badges use dark text `#92400E` on `#FEF3C7`. Focus ring: 3 px `#7C3AED` with a 2 px white offset.

## Type

| Role | Font | Size and weight |
|---|---|---|
| Display (hero) | Plus Jakarta Sans | 56 / 64 px, 800, gradient-filled |
| H1 / H2 / H3 | Plus Jakarta Sans | 32 / 24 / 18 px, 700 |
| Body | Inter | 16 px, 400, line height 1.6 |
| Small / labels | Inter | 13 px, 500 |
| Code / file paths | JetBrains Mono | 13 px |

## Shape and motion

- Radius: 24 px for the prompt box, 16 px for cards, 12 px for inputs and buttons, full pills for badges and chips.
- Shadows: soft and colored, e.g. `0 20px 60px -20px rgba(124,58,237,.35)` under the prompt box.
- Motion: the prompt box border shimmers slowly (gradient rotation, 6 s) while focused. New documents slide in as they finish. Respect reduced-motion.

## The prompt box (hero component)

This is the most important thing to get right.

- A large white card, about 760 px wide on desktop and full width on mobile, with a 2 px **gradient border** and a soft violet glow.
- A multi-line text area, auto-growing from 3 to 12 lines. Placeholder: *"Describe your app idea, or paste a whole ChatGPT / Claude conversation…"*
- Attachment chips appear above the text as items are added. Each shows an icon, the name and size, and an ✕:
  - 📄 file (`.md .txt .json .pdf .docx`)
  - 💬 chat export
  - 🎨 Figma link
- A bottom toolbar inside the box:
  - left: **＋ Attach** (opens the file picker; the whole box also accepts drag-and-drop, with a gradient dashed overlay "Drop files here") and **🎨 Figma** (a small popover with URL + token fields and the note "Your token is used once and never stored")
  - middle: a Founder / Expert segmented toggle, with the tooltip "Founder asks fewer questions"
  - right: the round gradient **send** button (arrow icon), labelled "Build my blueprint" on wider screens
- Under the box, three suggestion pills: "A booking app for salons", "A marketplace for local farmers", "An AI tutor for kids". Clicking one fills the box.

## Screens

### 1. Sign in / Sign up
Split layout. On the left, the gradient blob art with the tagline **"From idea to build-ready in one afternoon."** On the right, a clean card with name (sign-up only), email, password, a primary gradient button, and a switch link. Error states: wrong credentials, too many attempts, email taken.

### 2. Home: the prompt page (main screen)
- Top bar: Blueprint logo (a gradient "B" mark plus the wordmark), with Projects, Settings and the avatar on the right.
- Hero: the gradient display headline **"What do you want to build?"**, a one-line subtitle, then **the prompt box**, then the suggestion pills.
- Below: **Recent projects** as cards in a row. Each card shows the name, a status pill (Draft, Needs answers, Building, Ready ✓, Needs review), "updated 2h ago", and a mini progress ring.
- Empty state: no recent row; instead, a small 3-step illustration strip: *Paste → Answer → Build*.

### 3. Project: Questions (the interview)
A chat-like column that makes answering feel like talking to an AI:
- At the top, a compact project header with the name, the mode badge, and a **5-dot progress stepper**: Sources · Questions · Decisions · Building · Ready.
- A collapsible "What I understood" card listing the extracted facts as short bullet chips grouped by color-coded category, each with a tiny quote tooltip.
- **Question cards**, one per open question:
  - the question in bold, then "Why this matters" in muted text
  - 2–4 answer options as large selectable tiles, the recommended one with a gradient "Recommended" ribbon
  - an "Other…" text field, then Save and Skip
- A sticky bottom bar: "6 questions left", a **"Accept all recommended"** gradient button, and a secondary "Review decisions".

### 4. Project: Decisions and building
Two panels:
- **Left: Decisions.** A clean list grouped by category (Business, Users, Tech, Security…). Each row shows the label, the value (inline editable), and a status badge: Confirmed in teal, Assumed in amber, Deferred in grey. Required items without a value are highlighted with a red left border and "Needed".
- **Right: Build.**
  - Before generating: an estimate card ("≈ 40 AI steps · about 20 minutes") and a big gradient **Generate pack** button.
  - While generating: a gradient progress bar, "Writing 12 of 31 documents…", and a live list of document names with a check, a writing shimmer, or a waiting dot.
  - After a decision change: an amber banner "3 documents are out of date — Regenerate".

### 5. Project: Ready (documents, checks, download)
- A celebration header: gradient confetti accent, **"Your blueprint is ready"**, a big **Download pack (.zip)** button and a secondary **"Open in Claude Code"** (shows the MCP connect hint).
- A **Checks** strip: "All 11 quality checks passed ✓" in teal. Or, when blocked: a red "2 issues need your attention" with expandable findings, each with "Fix in decisions" and "Accept with reason".
- **Document viewer**: a file tree on the left (Start here, docs, build tasks) and rendered markdown on the right, with nice tables and code blocks and a Copy button.
- A usage chip: "Used 1.2M tokens · $1.84".

### 6. Settings: connect your AI
- **Access tokens:** a list with name, `bp_xxxx…` prefix, created, last used, and Revoke. A "New token" button opens a dialog that shows the token once in a mono field, with Copy and the warning "You won't see this again".
- **Connect** cards with logos as simple shapes: Claude Code (a terminal command with Copy) and Cursor / other MCP clients (a JSON snippet with Copy). A friendly line: *"Then just ask Claude: 'send this chat to my Blueprint project'."*

## States to show

For at least one screen each: loading (soft gradient skeletons), empty, error (a red banner with Retry), and the busy banner ("Analyzing your sources… 3/5").

## Responsive

Desktop at 1440 px wide, plus mobile at 390 px for the Home and Questions screens. On mobile the prompt box goes full-width with its toolbar wrapping, and the Decisions and Build panels stack.

## Don'ts

- No dark, heavy enterprise dashboard look. No dense data tables on the main screens.
- No pure black text or flat grey buttons.
- No stock photos. Use abstract gradient shapes and simple line icons (Lucide style).

## What to deliver

Six screens at 1440 px desktop, plus Home and Questions at 390 px mobile, using the colors, type and components above. Include a small component sheet: the prompt box (empty, typing, with attachments, drag-over), buttons, badges, question card, decision row, and document list item.
