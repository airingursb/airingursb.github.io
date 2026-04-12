package internal

import (
	"fmt"
	"os"

	"golang.org/x/term"
)

// MultiSelect displays an interactive multi-select prompt.
// Returns the indices of selected items, or error if cancelled.
func MultiSelect(label string, items []string, defaults []bool) ([]int, error) {
	fd := int(os.Stdin.Fd())
	if !term.IsTerminal(fd) {
		// Non-interactive: return defaults
		var selected []int
		for i, d := range defaults {
			if d {
				selected = append(selected, i)
			}
		}
		return selected, nil
	}

	oldState, err := term.MakeRaw(fd)
	if err != nil {
		return nil, fmt.Errorf("failed to set raw terminal: %w", err)
	}
	defer term.Restore(fd, oldState)

	checked := make([]bool, len(items))
	copy(checked, defaults)
	cursor := 0

	render := func() {
		// Move cursor up to overwrite previous render (except first time)
		fmt.Fprintf(os.Stderr, "\r\033[J") // clear from cursor to end
		for i, item := range items {
			mark := "[ ]"
			if checked[i] {
				mark = "[✓]"
			}
			prefix := "  "
			if i == cursor {
				prefix = "> "
			}
			fmt.Fprintf(os.Stderr, "%s%s %s\n", prefix, mark, item)
		}
		// Move cursor back up
		fmt.Fprintf(os.Stderr, "\033[%dA", len(items))
	}

	fmt.Fprintln(os.Stderr, label)
	render()

	buf := make([]byte, 3)
	for {
		n, err := os.Stdin.Read(buf)
		if err != nil {
			break
		}
		if n == 1 {
			switch buf[0] {
			case ' ':
				checked[cursor] = !checked[cursor]
			case '\r', '\n':
				// Move past the list
				fmt.Fprintf(os.Stderr, "\033[%dB\r\033[J", len(items)-cursor)
				var selected []int
				for i, c := range checked {
					if c {
						selected = append(selected, i)
					}
				}
				return selected, nil
			case 'q', 3: // q or Ctrl-C
				fmt.Fprintf(os.Stderr, "\033[%dB\r\033[J", len(items)-cursor)
				return nil, fmt.Errorf("cancelled")
			case 'j':
				if cursor < len(items)-1 {
					cursor++
				}
			case 'k':
				if cursor > 0 {
					cursor--
				}
			}
		} else if n == 3 && buf[0] == 27 && buf[1] == 91 {
			switch buf[2] {
			case 'A': // up arrow
				if cursor > 0 {
					cursor--
				}
			case 'B': // down arrow
				if cursor < len(items)-1 {
					cursor++
				}
			}
		}
		render()
	}
	return nil, fmt.Errorf("input error")
}
