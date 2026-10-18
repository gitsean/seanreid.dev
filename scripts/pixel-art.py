"""Generates the pixel-art SVGs in public/ from the maps below. Run: python3 scripts/pixel-art.py"""

from pathlib import Path

# W cream, P pink, B blue, M mint, Y yellow, N saddle brown, O tire brown, H hub blue,
# C blinking cursor (yellow), . empty
COLORS = {
    "W": "#fffdf4",
    "P": "#f06fae",
    "B": "#6cb8f0",
    "M": "#5fcfa4",
    "Y": "#ffd23f",
    "N": "#a0703f",
    "O": "#5a3e2b",
    "H": "#6cb8f0",
    "C": "#ffd23f",
}
OUTLINE = "#5a3e2b"

SPRITES = {
    # outline=True adds a one-pixel brown border, which keeps the pale ship visible on a light background.
    "pixel-ship": (
        True,
        """
.......W.......
.......W.......
......WWW......
......BBB......
......BBB......
.P....WWW....P.
.P...WWWWW...P.
.W..PWWWWWP..W.
.W.PWWWWWWWP.W.
WWPWWWMMMWWWPWW
WWWWPWWWWWPWWWW
PWW.PPWWWPP.WWP
P...P.WWW.P...P
......PYP......
.......Y.......
""",
    ),
    # A beach cruiser. No outline: it would fill in the wheels.
    "pixel-bike": (
        False,
        """
..............NNP........
.....NNNN........P.......
.......P.........P.......
..MMMMMPPPPPPPPPPPMMMMM..
..OOOOP.P.......PPOOOOO..
.O....PO.P.....P.OP....O.
O....P..OP...PP.O.P.....O
O....P..O.P.P...O..P....O
O...HPPPPPPY....O...H...O
O.......O...N...O.......O
O.......O.......O.......O
.O.....O.........O.....O.
..OOOOO...........OOOOO..
""",
    ),
    # A retro computer with code on the screen and a blinking cursor.
    "pixel-computer": (
        True,
        """
..WWWWWWWWWWWWWW..
..WBBBBBBBBBBBBW..
..WBMMMBMMBBBBBW..
..WBBBBBBBBBBBBW..
..WBBMMMMBMMMBBW..
..WBBBBBBBBBBBBW..
..WBMMBCBBBBBBBW..
..WBBBBBBBBBBBBW..
..WWWWWWWWWWWWWW..
..WWWWWWWWOOWWPW..
......WWWWWW......
....WWWWWWWWWW....
..................
WWWWWWWWWWWWWWWWWW
WPWMWBWYWPWMWBWYWW
WWMWBWYWPWMWBWYWWW
WWWWNNNNNNNNNNWWWW
WWWWWWWWWWWWWWWWWW
""",
    ),
    # A quill pen dipped in an inkwell.
    "pixel-quill": (
        True,
        """
............PPP.
..........PPPPP.
.........PPPPWP.
........PPPPWPP.
........PPPWPPP.
......PPPPWPP...
......PPPWPPP...
.....PPPWPPP....
....PPPWPP......
....PPWPP.......
....PWPP........
....WP..........
...W............
..N.............
.BBNBB..........
BBBBBBBB........
BYYYYYYB........
BBBBBBBB........
""",
    ),
}

# The cursor blinks with CSS so it can respect the visitor's reduced-motion setting.
BLINK_STYLE = (
    "<style>.blink{animation:blink 1s steps(1) infinite}"
    "@keyframes blink{50%{opacity:0}}"
    "@media (prefers-reduced-motion:reduce){.blink{animation:none}}</style>"
)


def pixel(x, y, color, cls=None):
    attr = f' class="{cls}"' if cls else ""
    return f'<rect x="{x + 1}" y="{y + 1}" width="1" height="1" fill="{color}"{attr}/>'


def render(rows, outline):
    width, height = len(rows[0]), len(rows)
    assert all(len(r) == width for r in rows), "every row must be the same width"
    filled = {(x, y) for y, r in enumerate(rows) for x, c in enumerate(r) if c != "."}
    rects = []
    if outline:
        border = {
            (x + dx, y + dy)
            for x, y in filled
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
        } - filled
        rects += [pixel(x, y, OUTLINE) for x, y in sorted(border)]
    for x, y in sorted(filled, key=lambda p: (p[1], p[0])):
        c = rows[y][x]
        rects.append(pixel(x, y, COLORS[c], "blink" if c == "C" else None))
    style = [BLINK_STYLE] if any("C" in r for r in rows) else []
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width + 2} {height + 2}" '
        f'shape-rendering="crispEdges">\n' + "\n".join(style + rects) + "\n</svg>\n"
    )


public = Path(__file__).resolve().parent.parent / "public"
for name, (outline, art) in SPRITES.items():
    rows = art.strip().splitlines()
    out = public / f"{name}.svg"
    out.write_text(render(rows, outline))
    print(f"wrote {out} ({len(rows[0])}x{len(rows)} pixels)")
