# Quizz — the standings page for adversaire.ca/saisons/quizz

A self-contained dashboard that reads the quizz results spreadsheet and shows the
standings, a per-team breakdown, and a per-night breakdown. It lives in the
**Code** box of the site page; nothing is hosted from this repo.

| File | What it is |
|---|---|
| `quizz-embed.html` | The whole thing. Paste it into the site's Code box. |
| `quizz-bridge.gs` | Apps Script web app that hands the sheet over as JSON. |
| `quizz-preview.html` | Local harness with sample data, to check changes before pasting. |

## The sheet it expects

One tab per season. Row 1 is `Équipes` then one column per quizz night. Under
that, one block per team: the row carrying the team name is **round 1**, and the
unnamed rows below it are rounds 2, 3, 4…

```
        │ 08-07-2026 │ 15-07-2026 │ 22-07-2026 │
Équipes │            │            │            │
A       │     15     │      6     │     25     │   ← manche 1
        │     30     │     21     │      2     │   ← manche 2
        │     20     │     27     │      8     │   ← manche 3
        │     26     │     27     │      5     │   ← manche 4
B       │      5     │      7     │     13     │
        │     …
```

Nothing is hard-coded: 4 rounds or 6, 6 teams or 12, any number of nights. A
**blank** cell means "didn't play" and is left out of the scoring — which is not
the same as a **0**, a real score that counts. Dates are shown exactly as the
sheet displays them, and `dd-mm-yyyy` / `yyyy-mm-dd` are understood well enough
to print "mercredi 8 juillet 2026".

## Scoring

Per night: **1 point to the best team of each round**, plus **1 point to the best
total of the night**. With 4 rounds that's 5 points a night. On a tie, *everyone*
tied takes the point. Teams level on points are ordered by total pointage.

The rules live in the page (`compute()` in `quizz-embed.html`), not in the Apps
Script — so changing them is an edit + re-paste, with no redeploy.

## Setup (once)

1. **Apps Script.** Open script.google.com signed in as the account that owns the
   quizz sheet → new project → paste `quizz-bridge.gs` → put the spreadsheet ID
   in `SHEET_ID` → Deploy → New deployment → Web app, *Execute as: Me*, *Who has
   access: **Anyone*** → copy the `/exec` URL.
   The sheet stays private; the script reads it as you and only ever hands out
   the cells.
2. **The page.** Open `quizz-embed.html`, put that `/exec` URL in `ENDPOINT` at
   the top.
3. **Paste.** Copy the whole file into the Code box on `/saisons/quizz` and
   stretch the box to the full content width. If the box only accepts bare
   JavaScript, leave off the first `<script>` line and the last `</script>` line.

## Seasons

**A season is a tab, and the tab's name is the season's name** — there can be
several a year (`Hiver 2026`, `Été 2026`…). That name is what the page shows: in
the season picker, above each group of dates in the "Par soirée" picker, and
under the charts in the cumulative view. So name the tab the way you want it read
on the site — `Feuille 1` will be displayed as `Feuille 1`.

Adding a season is just adding a tab. The page picks it up, adds it to the
picker, and keeps a "Toutes les saisons" cumulative view. With a single tab there
is no picker, just the season's name.

`NEWEST_SEASON` says which end of the workbook the current season sits at, and
that's the one the page opens on: `"last"` if you add new tabs at the **right**
(the usual), `"first"` if you add them at the **left**.

## Checking changes locally

`quizz-embed.html` contains no test data and no test switch — its only source of
data is `ENDPOINT`. So `quizz-preview.html` fakes **the network** instead: it
stubs `fetch`, points the endpoint at a URL that doesn't exist, and answers with
sample rows. The dashboard runs its normal load path and can't tell the
difference, which is the point — and nothing about sample data can ever ride
along into the copy you paste on the site.

It needs to be served over HTTP (the browser blocks the file read on `file://`):

```bash
python -m http.server 8765
```

then open `http://localhost:8765/quizz/quizz-preview.html` from the repo root.

## Design notes

- **Chrome is black and white; colour appears only in the bars.** The site is
  monochrome (`#070606`, Anton headings, white 2px outlines, 25px pills) and the
  dashboard keeps that, so the data is the only loud thing on the page.
- **Team colours are fixed to the team, not to its rank** — a team keeps its
  colour across every view and every season, so filtering never repaints anyone.
  Past 8 teams the extras go grey rather than reusing a hue: two bars of the same
  colour would be a lie, and the team name is written beside every bar anyway.
- **The palettes were validated, not eyeballed** — the 8 team hues and the blue
  round-ramp both clear the lightness, chroma, colourblind-separation and
  contrast gates against this site's black. Re-run
  `validate_palette.js "<hexes>" --mode dark --surface "#070606"` if you change
  them.
- **One deliberate deviation**: the big numbers use Anton, the site's display
  face. The usual advice is to keep hero figures in the body sans because a
  display face reads as off-brand — here Anton *is* the brand, and the system
  sans would be the thing that looks foreign.
- Every chart has a table beside it carrying the same values, so nothing is
  reachable only by hovering.

## If it doesn't load

The page says what went wrong under the tabs. Most likely:

- *"L'adresse du script Google n'est pas encore renseignée"* — `ENDPOINT` is still
  the placeholder.
- **HTTP 401/403** — the deployment isn't set to *Anyone*, or it was redeployed as
  a new deployment (new URL) instead of a new version of the existing one.
- **Nothing but "La feuille ne contient pas encore de résultats"** — the tab's
  first row isn't a header row, or column A has no team names.
- **Seasons on the page that don't exist in the sheet** — a leftover block from
  `quizz-preview.html` got pasted into the site as well. `quizz-embed.html` has
  no notion of sample data (its only source is `ENDPOINT`), so anything else on
  screen came from a second code block: delete it.

Add `?fresh=1` to the `/exec` URL in a browser to bypass the script's 60-second
cache and see the raw JSON it's serving.
