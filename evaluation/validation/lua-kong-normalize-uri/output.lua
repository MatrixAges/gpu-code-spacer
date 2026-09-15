local function merge_path_slashes(path, merge_slashes)
  local normalized = path

  if merge_slashes then
    normalized = string.gsub(normalized, "/+", "/")
  end

  if normalized == "" then
    return "/"
  end

  return normalized
end
