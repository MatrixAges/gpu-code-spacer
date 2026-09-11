local function splitn_common(value, pattern, n, plain)
  local limit = n or huge
  if limit < 1 or value == nil then
    return {}, 0
  elseif limit == 1 or pattern == nil then
    return { value }, 1
  elseif pattern == "" then
    if value == "" then
      return { "", "" }, 2
    end
    local size = #value
    if size == 1 then
      if limit == 2 then
        return { "", value }, 2
      else
        return { "", value, "" }, 3
      end
    end
    size = limit >= size + 2 and size + 2 or limit
    local t = new_tab(size, 0)
    t[1] = ""
    for i = 2, size do
      t[i] = sub(value, i - 1, i < size and i - 1 or nil)
    end
    return t, size
  elseif value == "" then
    return { "" }, 1
  end
  local p = 1
  local i = 1
  local t = new_tab(n or 10, 0)
  ::again::
  if i < limit then
    local s, e = find(value, pattern, p, plain)
    if s then
      t[i] = sub(value, p, s - 1)
      i = i + 1
      p = e + 1
      goto again
    end
  end
  t[i] = sub(value, p)
  return t, i
end
