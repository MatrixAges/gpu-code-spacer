package validation


func Emojify(source []byte) []byte {


	emojiInit.Do(initEmoji)


	start := 0


	k := bytes.Index(source[start:], emojiDelim)


	for k != -1 {


		j := start + k


		upper := min(j+emojiMaxSize, len(source))


		endEmoji := bytes.Index(source[j+1:upper], emojiDelim)


		nextWordDelim := bytes.Index(source[j:upper], emojiWordDelim)


		if endEmoji < 0 {


			start++


		} else if endEmoji == 0 || (nextWordDelim != -1 && nextWordDelim < endEmoji) {


			start += endEmoji + 1


		} else {


			endKey := endEmoji + j + 2


			emojiKey := source[j:endKey]


			if emoji, ok := emojis[string(emojiKey)]; ok {


				source = append(source[:j], append(emoji, source[endKey:]...)...)


			}


			start += endEmoji


		}


		if start >= len(source) {


			break


		}


		k = bytes.Index(source[start:], emojiDelim)


	}


	return source


}
