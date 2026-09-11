def tally(words)
  counts = Hash.new(0)


  words.each do |word|
    key = word.downcase


    if key.empty?
      next
    end


    counts[key] += 1
  end


  return counts
end
