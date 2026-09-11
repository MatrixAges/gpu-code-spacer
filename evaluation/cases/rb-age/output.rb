def contains_negative?(values)
  predicate = ->(value) { value < 0 }

  for value in values
    return true if predicate.call(value)
  end

  return false
end
