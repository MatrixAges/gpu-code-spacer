local function split_words(value)
  local words = {}

  for word in string.gmatch(value, "%S+") do
    table.insert(words, word)
  end

  return words, #words
end
