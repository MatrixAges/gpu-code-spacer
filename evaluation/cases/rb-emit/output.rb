def emit(stream, rows)
  body = rows.join("\n")

  stream.write(body)
  stream.flush
end
