package validation

func Emojify(source []byte) []byte {
	emojiInit.Do(initEmoji)

	start := 0

	for k := bytes.Index(source[start:], emojiDelim); k != -1; k = bytes.Index(source[start:], emojiDelim) {
		j := start + k
		upper := j + emojiMaxSize

		if upper > len(source) {
			upper = len(source)
		}

		endEmoji := bytes.Index(source[j+1:upper], emojiDelim)
		nextWordDelim := bytes.Index(source[j:upper], emojiWordDelim)

		if endEmoji < 0 {
			start++
		} else if endEmoji == 0 || (nextWordDelim != -1 && nextWordDelim < endEmoji) {
			start += endEmoji + 1
		} else {
			endKey := endEmoji + j + 2

			if emoji, ok := emojis[string(source[j:endKey])]; ok {
				source = append(source[:j], append(emoji, source[endKey:]...)...)
			}

			start += endEmoji
		}

		if start >= len(source) {
			break
		}
	}

	return source
}
