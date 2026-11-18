"""Editable portfolio diagrams. Run with Python 3; render SVGs using Sharp."""

from html import escape
from pathlib import Path

OUT = Path(__file__).parent
INK = "#182b32"
MUTED = "#54666b"
LINE = "#cbd4cf"
ACCENT = "#006b60"


def text(x, y, value, size=25, fill=INK, weight=400, mono=False):
    family = "Menlo, monospace" if mono else "Helvetica Neue, Arial, sans-serif"
    return f'<text x="{x}" y="{y}" xml:space="preserve" font-family="{family}" font-size="{size}" font-weight="{weight}" fill="{fill}">{escape(value)}</text>'


def rect(x, y, w, h, fill="#ffffff", stroke=LINE, radius=18):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}"/>'


def path(d, color=ACCENT, arrow=False, dash=False):
    marker = 'marker-end="url(#arrow)"' if arrow else ""
    pattern = 'stroke-dasharray="8 7"' if dash else ""
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="3" {marker} {pattern}/>'


def lines(x, y, values, size=25, fill=MUTED, step=36, mono=False):
    return "".join(text(x, y + i * step, v, size, fill, mono=mono) for i, v in enumerate(values))


def card(x, y, w, h, title, body, number=None, dark=False):
    color = "#ffffff" if dark else INK
    s = rect(x, y, w, h, INK if dark else "#ffffff", INK if dark else LINE)
    if number:
        s += text(x + 26, y + 42, number, 19, "#95ddc9" if dark else ACCENT, 600, True)
    s += text(x + 26, y + (86 if number else 48), title, 29, color, 600)
    s += lines(x + 26, y + (127 if number else 94), body, 23, "#c5dbd6" if dark else MUTED, 34)
    return s


def base(name, title, subtitle, body, footnote):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-labelledby="title desc">
<title id="title">{escape(name)} — {escape(title)}</title>
<desc id="desc">{escape(subtitle)} Conceptual diagram based on source inspection, not a product screenshot.</desc>
<defs><marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 1 1 L 10 6 L 1 11" fill="none" stroke="{ACCENT}" stroke-width="1.5"/></marker></defs>
<rect width="1600" height="1000" fill="#f2f3eb"/>
<circle cx="1475" cy="65" r="210" fill="#e3e9d9"/>
{text(72, 75, 'ALEXANDER FÜRST  /  PROJECT NOTES', 19, MUTED, 600, True)}
{text(72, 177, name, 77, INK, 600)}
{text(74, 234, title, 31, ACCENT, 500)}
{text(74, 282, subtitle, 25, MUTED)}
{body}
<line x1="72" y1="896" x2="1528" y2="896" stroke="{LINE}"/>
{text(74, 935, 'CONCEPTUAL DIAGRAM · SOURCE-BASED · NOT A PRODUCT SCREENSHOT', 18, ACCENT, 600, True)}
{text(74, 972, footnote, 20, MUTED)}
</svg>'''
    return svg


visuals = {}

b = card(74, 380, 330, 228, "Request", ["Page URL", "Natural-language query", "CLI · HTTP · MCP"], "01")
b += card(478, 380, 365, 228, "Structure check", ["Fetch page", "Compute structural hash", "Find reusable schema"], "02")
b += card(1123, 380, 403, 228, "Structured output", ["Apply extraction rules", "Transform field values", "JSON · JSONL · CSV"], "03", True)
b += path("M 404 494 H 466", arrow=True)
b += path("M 843 494 H 1110", arrow=True)
b += text(879, 472, "cache match", 21, ACCENT)
b += card(545, 692, 525, 141, "Generate / refresh schema", ["AI produces selectors; store for reuse."])
b += path("M 660 608 V 680", arrow=True)
b += text(685, 650, "missing or changed", 21, ACCENT)
b += path("M 1070 762 H 1323 V 622", arrow=True)
visuals["ai-scraper-conceptual-workflow"] = base("AI Scraper", "Describe once. Extract with reusable rules.", "AI-generated schemas and deterministic parsing share the work.", b, "The diagram explains the CLI workflow; current target-site compatibility is unverified.")

b = rect(74, 352, 550, 470)
b += text(110, 401, "SEARCH FORMATS", 18, ACCENT, 600, True)
for i, (title, detail) in enumerate([("Organic", "Titles · links · snippets"), ("News", "Article results"), ("Images", "Image results"), ("Video", "Video results")]):
    y = 437 + i * 87
    b += rect(107, y, 482, 69, "#f2f3eb", "#e0e5dc", 10)
    b += text(130, y + 29, title, 24, INK, 600)
    b += text(130, y + 54, detail, 20, MUTED)
b += card(711, 429, 357, 264, "Source-specific", ["Browser preparation", "Dedicated page parsers", "Pagination helpers", "Consistent API"], "PARSING")
b += card(1154, 429, 372, 264, "Downstream data", ["Structured results", "Tool integration", "Research workflows"], "OUTPUT", True)
b += path("M 624 562 H 698", arrow=True) + path("M 1068 562 H 1141", arrow=True)
b += text(716, 782, "One integration surface, several page structures.", 26, ACCENT, 500)
visuals["serp-api-conceptual-workflow"] = base("SERP API", "Search pages → structured information.", "A historical browser-based API prototype, with dedicated parsers for each format.", b, "Historical implementation. Current search layouts and operational availability are unverified.")

b = rect(74, 350, 566, 475, INK, INK)
b += text(110, 401, "BEFORE", 19, "#95ddc9", 600, True)
b += lines(110, 460, ["src/", "  components/", "    ProjectCard.tsx", "  pages/", "    index.tsx"], 28, "#e5eee9", 48, True)
b += text(110, 752, "import '../components/ProjectCard'", 21, "#d5c5a1", mono=True)
b += rect(960, 350, 566, 475)
b += text(996, 401, "AFTER", 19, ACCENT, 600, True)
b += lines(996, 460, ["src/", "  features/projects/", "    ProjectCard.tsx", "  pages/", "    index.tsx"], 28, INK, 48, True)
b += text(996, 752, "import '../features/projects/ProjectCard'", 19, ACCENT, mono=True)
b += path("M 654 572 H 946", arrow=True)
b += text(687, 520, "AST-backed", 29, ACCENT, 600)
b += text(701, 555, "batch move", 27, ACCENT)
b += lines(680, 638, ["Update paths", "Rewrite imports", "Check conflicts"], 23, MUTED, 37)
visuals["ts-shove-conceptual-refactor"] = base("ts-shove", "Move the files. Keep the references.", "Deterministic TypeScript restructuring for agent-driven development.", b, "Illustrative file paths. The local revision also supports symbol renaming; public versions differ.")

b = card(74, 374, 325, 220, "Search profile", ["Criteria and portal URLs", "Profile-based polling", "Personal search context"], "01")
b += card(467, 374, 325, 220, "Collect listings", ["Browser workers", "Portal-specific extraction", "Details and images"], "02")
b += card(860, 374, 325, 220, "Compare", ["Deduplicate URLs", "Persist discovered offers", "Optional AI scoring"], "03")
b += card(1253, 374, 273, 220, "Surface matches", ["Web interface", "10/10 alerts only", "Listing management"], "04", True)
for x in (399, 792, 1185):
    b += path(f"M {x} 484 H {x + 54}", arrow=True)
b += rect(74, 661, 1452, 164, "#e3e9d9", "#e3e9d9")
b += text(109, 711, "ONE CASE, TWO RELATED CODEBASES", 18, ACCENT, 600, True)
b += text(109, 759, "housing-hunter", 31, INK, 600) + text(760, 759, "apartment-scout-ai", 31, INK, 600)
b += text(109, 796, "Browser worker and polling pipeline", 23, MUTED) + text(760, 796, "Search interface and orchestration", 23, MUTED)
visuals["housing-hunter-conceptual-workflow"] = base("Housing Hunter", "From scattered listings to a focused search.", "A personal search pipeline connecting collection, comparison and selective notifications.", b, "Owner reports continuous background use and a 10/10 alert threshold. No real listings are shown.")

for i, (title, body) in enumerate([("News", ["Selected source feeds"]), ("Calendar", ["Configured calendar fetchers"]), ("Projects", ["Configured work fetchers"])]):
    bpart = card(74, 353 + i * 151, 388, 126, title, body)
    if i == 0:
        b = bpart
    else:
        b += bpart
    b += path(f"M 462 {416 + i * 151} H 520 V 565 H 571", arrow=False)
b += card(585, 441, 380, 248, "Validate & persist", ["Independent refreshes", "Structured source sections", "Explicit failure states", "Saved daily content"], "PIPELINE")
b += path("M 965 565 H 1035", arrow=True)
b += rect(1048, 353, 478, 450, INK, INK)
b += text(1082, 410, "THE DAILY VIEW", 18, "#95ddc9", 600, True)
b += text(1082, 466, "One day, in context.", 34, "#ffffff", 600)
for i, label in enumerate(["News overview", "Calendar context", "Project information"]):
    y = 505 + i * 84
    b += rect(1080, y, 412, 63, "#294047", "#3e565b", 9)
    b += text(1103, y + 40, label, 24, "#e5eee9")
visuals["daily-briefing-conceptual-pipeline"] = base("Daily Briefing", "Bring a day’s information into one place.", "Independent source fetchers feed a persisted, day-based personal dashboard.", b, "Schematic illustration with no personal data. Separate from the Business Hub application.")

for stem, svg in visuals.items():
    source = OUT / f"{stem}.svg"
    source.write_text(svg)
    print(source.name)
