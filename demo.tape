# VHS Demo Tape for git-ai
# Install VHS: https://github.com/charmbracelet/vhs
# Run: vhs demo.tape

Output demo.gif
Set Shell powershell
Set FontSize 16
Set Width 900
Set Height 550
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 50ms

# Title
Type "# git-ai — AI that lives inside your Git workflow"
Enter
Sleep 1s

# Show help
Type "git-ai --help"
Enter
Sleep 2s

# Setup wizard demo
Type "git-ai setup"
Enter
Sleep 1.5s

# Select Claude
Down 0
Enter
Sleep 1s

# Enter API key
Type "sk-ant-xxxxxxxxxxxxxxxxxxxx"
Enter
Sleep 1s

# Select Haiku model
Enter
Sleep 1s

# Select auto-detect style
Enter
Sleep 1s

# Skip hooks
Type "n"
Enter
Sleep 2s

# Stage files
Type "git add -A"
Enter
Sleep 500ms

# Generate commit message
Type "git-ai commit"
Enter
Sleep 3s

# Show the generated message
Sleep 2s

# Commit
Enter
Sleep 1.5s

# Done
Type "# Done! Zero friction AI commits."
Enter
Sleep 2s
