"""
Generate demo.gif for git-ai using Pillow.
Simulates the terminal session described in demo.tape.
Renders at 2x then downscales for crisp text.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# --- Configuration (matches demo.tape) ---
# Final output size
OUT_WIDTH = 900
OUT_HEIGHT = 520
# Render at 2x for sharp text
SCALE = 2
WIDTH = OUT_WIDTH * SCALE
HEIGHT = OUT_HEIGHT * SCALE
PADDING = 24 * SCALE
FONT_SIZE = 15 * SCALE
BG_COLOR = (8, 8, 16)        # #080810
FG_COLOR = (238, 238, 248)   # #eeeef8
CURSOR_COLOR = (34, 197, 94) # #22c55e
CYAN_ACTUAL = (45, 212, 191) # #2dd4bf
GREEN = (34, 197, 94)        # #22c55e
YELLOW = (245, 158, 11)      # #f59e0b
RED = (247, 89, 151)         # #f75997
DIM = (110, 110, 146)        # #6e6e92
WHITE = (238, 238, 248)      # #eeeef8
PURPLE = (155, 89, 247)      # #9b59f7
BLUE = (79, 142, 247)        # #4f8ef7

# Header bar
HEADER_HEIGHT = 36 * SCALE
HEADER_BG = (20, 20, 35)
HEADER_BORDER = (40, 40, 60)
DOT_RED = (255, 95, 86)
DOT_YELLOW = (255, 189, 46)
DOT_GREEN = (39, 201, 63)
DOT_RADIUS = 6 * SCALE
DOT_SPACING = 20 * SCALE
DOT_Y = HEADER_HEIGHT // 2
DOT_START_X = 18 * SCALE
HEADER_TITLE_COLOR = (140, 140, 170)

# Terminal body area
BODY_TOP = HEADER_HEIGHT
CORNER_RADIUS = 10 * SCALE

LINE_HEIGHT = 22 * SCALE
TYPING_DELAY_MS = 55
FPS = 15
FRAME_MS = 1000 // FPS


def get_font(size):
    font_paths = [
        "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/lucon.ttf",
        "C:/Windows/Fonts/cour.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


FONT = get_font(FONT_SIZE)
FONT_SMALL = get_font(13 * SCALE)


def draw_header(draw):
    """Draw the terminal window header bar with traffic light dots."""
    # Header background with rounded top corners
    draw.rounded_rectangle(
        [0, 0, WIDTH - 1, HEADER_HEIGHT + CORNER_RADIUS],
        radius=CORNER_RADIUS,
        fill=HEADER_BG,
    )
    # Fill the bottom portion to make it flat at the bottom of header
    draw.rectangle([0, CORNER_RADIUS, WIDTH - 1, HEADER_HEIGHT], fill=HEADER_BG)

    # Bottom border line
    draw.line([(0, HEADER_HEIGHT - 1), (WIDTH, HEADER_HEIGHT - 1)], fill=HEADER_BORDER, width=1)

    # Traffic light dots
    for i, color in enumerate([DOT_RED, DOT_YELLOW, DOT_GREEN]):
        cx = DOT_START_X + i * DOT_SPACING
        cy = DOT_Y
        draw.ellipse(
            [cx - DOT_RADIUS, cy - DOT_RADIUS, cx + DOT_RADIUS, cy + DOT_RADIUS],
            fill=color,
        )

    # Title text centered
    title = "git-ai demo"
    bbox = FONT_SMALL.getbbox(title)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(((WIDTH - tw) // 2, (HEADER_HEIGHT - th) // 2), title, fill=HEADER_TITLE_COLOR, font=FONT_SMALL)


class TerminalRenderer:
    def __init__(self):
        self.lines = []

    def clear(self):
        self.lines = []

    def add_line(self, segments=None):
        if segments is None:
            self.lines.append([])
        else:
            self.lines.append(segments)

    def render(self, show_cursor=False, cursor_line=None, cursor_col=None):
        img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
        draw = ImageDraw.Draw(img)

        # Draw header bar
        draw_header(draw)

        # Draw terminal body
        y = BODY_TOP + PADDING
        for i, line in enumerate(self.lines):
            x = PADDING
            for text, color in line:
                draw.text((x, y), text, fill=color, font=FONT)
                bbox = FONT.getbbox(text)
                x += bbox[2] - bbox[0]
            if show_cursor and cursor_line == i:
                if cursor_col is not None:
                    cx = PADDING
                    full_text = "".join(t for t, _ in line)
                    if cursor_col <= len(full_text):
                        prefix = full_text[:cursor_col]
                        bbox = FONT.getbbox(prefix) if prefix else (0, 0, 0, 0)
                        cx = PADDING + (bbox[2] - bbox[0] if prefix else 0)
                    draw.rectangle([cx, y, cx + 9 * SCALE, y + LINE_HEIGHT - 2], fill=CURSOR_COLOR)
            y += LINE_HEIGHT
            if y > HEIGHT - PADDING:
                break
        # Downscale to output size with high-quality resampling
        return img.resize((OUT_WIDTH, OUT_HEIGHT), Image.LANCZOS)


def make_frames():
    """Generate all frames for the demo GIF."""
    frames = []
    term = TerminalRenderer()

    def snapshot(duration_ms=FRAME_MS, show_cursor=False, cursor_line=None, cursor_col=None):
        img = term.render(show_cursor, cursor_line, cursor_col)
        count = max(1, duration_ms // FRAME_MS)
        for _ in range(count):
            frames.append(img)

    def type_command(cmd, prompt_segments):
        """Animate typing a command character by character."""
        line_idx = len(term.lines)
        term.add_line(prompt_segments)
        snapshot(200, show_cursor=True, cursor_line=line_idx, cursor_col=len("".join(t for t, _ in prompt_segments)))

        for i, ch in enumerate(cmd):
            term.lines[line_idx] = prompt_segments + [(cmd[:i + 1], FG_COLOR)]
            col = len("".join(t for t, _ in prompt_segments)) + i + 1
            snapshot(TYPING_DELAY_MS, show_cursor=True, cursor_line=line_idx, cursor_col=col)

    def run_spinner(label, cycles=14):
        spinner_chars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        idx = len(term.lines)
        term.add_line([("⠋", CYAN_ACTUAL), (f" {label}...", CYAN_ACTUAL)])
        for cycle in range(cycles):
            ch = spinner_chars[cycle % len(spinner_chars)]
            term.lines[idx] = [(ch, CYAN_ACTUAL), (f" {label}...", CYAN_ACTUAL)]
            snapshot(150)
        term.lines[idx] = [("✓", GREEN), (" Done!", GREEN)]
        snapshot(400)

    PS_PROMPT = [("PS ", BLUE), ("D:\\git-ai", YELLOW), ("> ", FG_COLOR)]
    SEP = "─" * 50

    # ── Initial blank terminal ──────────────────────────────────────────────
    snapshot(500)

    # ── git-ai review (first run) ────────────────────────────────────────────
    type_command("git-ai review", PS_PROMPT)
    snapshot(200)
    term.add_line()
    term.add_line([("  git-ai review", CYAN_ACTUAL)])
    term.add_line()
    snapshot(500)

    run_spinner("Reviewing code...", 16)

    term.add_line()
    term.add_line([("  Code Review", CYAN_ACTUAL)])
    term.add_line()
    # Summary header
    term.add_line([("  🔴 1 critical   🟡 1 warning   🟢 1 suggestion", FG_COLOR)])
    term.add_line()
    # Findings
    term.add_line([("  🔴 ", RED), ("[CRITICAL]", RED),
                   ("  Unhandled promise rejection may crash server", WHITE)])
    term.add_line([("       ", DIM), ("— src/api/users.ts:42", DIM)])
    term.add_line()
    term.add_line([("  🟡 ", YELLOW), ("[WARNING]", YELLOW),
                   ("  Missing error boundary in async middleware", WHITE)])
    term.add_line()
    term.add_line([("  🟢 ", GREEN), ("[SUGGESTION]", GREEN),
                   ("  Extract repeated validation logic into helper", WHITE)])
    term.add_line([("       ", DIM), ("— src/middleware/validate.ts:88", DIM)])
    snapshot(3000)

    # ── git-ai review (second run — dedup) ──────────────────────────────────
    type_command("git-ai review", PS_PROMPT)
    snapshot(200)
    term.add_line()
    term.add_line([("  git-ai review", CYAN_ACTUAL)])
    term.add_line()
    snapshot(500)

    run_spinner("Reviewing code...", 12)

    term.add_line()
    term.add_line([("  Code Review", CYAN_ACTUAL)])
    term.add_line()
    # Only one new finding this time
    term.add_line([("  🟡 1 warning", FG_COLOR)])
    term.add_line()
    term.add_line([("  🟡 ", YELLOW), ("[WARNING]", YELLOW),
                   ("  New dependency has known CVE-2026-1234", WHITE)])
    term.add_line([("       ", DIM), ("— package.json:15", DIM)])
    term.add_line()
    # Suppression count
    term.add_line([("  (2 duplicate findings suppressed)", DIM)])
    snapshot(3000)

    # ── git-ai findings ─────────────────────────────────────────────────────
    type_command("git-ai findings", PS_PROMPT)
    snapshot(200)
    term.add_line()
    term.add_line([("  git-ai findings", CYAN_ACTUAL)])
    term.add_line()
    snapshot(400)

    term.add_line([("  Findings (3 total, 0 acknowledged)", CYAN_ACTUAL)])
    term.add_line()
    term.add_line([("  a1b2c3d4  ", GREEN), ("CRITICAL", RED),
                   ("  Unhandled promise rejection may crash server", WHITE)])
    term.add_line([("            ", DIM), ("— src/api/users.ts:42", DIM)])
    term.add_line()
    term.add_line([("  9f8e7d6c  ", GREEN), ("WARNING", YELLOW),
                   ("  Missing error boundary in async middleware", WHITE)])
    term.add_line()
    term.add_line([("  5e4f3a2b  ", GREEN), ("SUGGESTION", GREEN),
                   ("  Extract repeated validation logic into helper", WHITE)])
    term.add_line([("            ", DIM), ("— src/middleware/validate.ts:88", DIM)])
    snapshot(3000)

    # ── Final prompt ────────────────────────────────────────────────────────
    term.add_line()
    term.add_line(PS_PROMPT)
    snapshot(2000, show_cursor=True, cursor_line=len(term.lines) - 1,
             cursor_col=len("PS D:\\git-ai> "))

    return frames


def main():
    print("Generating frames...")
    frames = make_frames()
    print(f"  {len(frames)} frames generated")

    print("Saving demo.gif...")
    output_path = os.path.join(os.path.dirname(__file__), "demo.gif")

    # Convert frames to palette mode without dithering for crisp text
    palette_frames = []
    for f in frames:
        pf = f.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        palette_frames.append(pf)

    palette_frames[0].save(
        output_path,
        save_all=True,
        append_images=palette_frames[1:],
        duration=FRAME_MS,
        loop=0,
        optimize=True,
    )

    size_kb = os.path.getsize(output_path) / 1024
    print(f"  Saved to {output_path} ({size_kb:.0f} KB, {len(frames)} frames)")


if __name__ == "__main__":
    main()
