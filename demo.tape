# VHS Demo Tape for git-ai v1.2
# Install VHS: https://github.com/charmbracelet/vhs
# Run: vhs demo.tape

Output demo.gif

Set Shell powershell
Set FontSize 15
Set Width 900
Set Height 520
Set Padding 24
Set TypingSpeed 65ms

Set Theme {
  "name": "git-ai",
  "black":      "#030306",
  "red":        "#f75997",
  "green":      "#22c55e",
  "yellow":     "#f59e0b",
  "blue":       "#4f8ef7",
  "purple":     "#9b59f7",
  "cyan":       "#2dd4bf",
  "white":      "#eeeef8",
  "brightBlack":  "#6e6e92",
  "brightRed":    "#f75997",
  "brightGreen":  "#22c55e",
  "brightYellow": "#f59e0b",
  "brightBlue":   "#4f8ef7",
  "brightPurple": "#9b59f7",
  "brightCyan":   "#2dd4bf",
  "brightWhite":  "#eeeef8",
  "background": "#080810",
  "foreground": "#eeeef8",
  "cursor":     "#22c55e",
  "selection":  "#1a1a2e"
}

# --- git-ai review ---
Type "git-ai review"
Enter
Sleep 4s

# Show the review output
Sleep 3s

# --- git-ai review again (dedup) ---
Type "git-ai review"
Enter
Sleep 3500ms

# Show suppression message
Sleep 2s

# --- git-ai findings ---
Type "git-ai findings"
Enter
Sleep 1500ms

# --- Done ---
Sleep 2s
