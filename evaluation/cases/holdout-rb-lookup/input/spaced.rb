def lookup(entries, key, logger)
  record = entries[key]


  unless record
    return nil
  end


  message = "Found #{key}"


  logger.write(message)


  return record
end
