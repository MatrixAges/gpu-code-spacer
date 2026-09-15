function _M.deep_copy(orig, copy_mt)
  local copy = orig
  if type(orig) ~= "table" then
    return copy
  end
  if copy_mt == nil then
    copy_mt = true
  end
  copy = {}
  for orig_key, orig_value in next, orig, nil do
    copy[_M.deep_copy(orig_key)] = _M.deep_copy(orig_value, copy_mt)
  end
  if copy_mt then
    setmetatable(copy, _M.deep_copy(getmetatable(orig)))
  end
  return copy
end
