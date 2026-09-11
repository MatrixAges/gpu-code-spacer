function _M.deep_copy(orig, copy_mt)


  if copy_mt == nil then


    copy_mt = true


  end


  local copy


  if type(orig) == "table" then


    copy = {}


    for orig_key, orig_value in next, orig, nil do


      copy[_M.deep_copy(orig_key)] = _M.deep_copy(orig_value, copy_mt)


    end


    if copy_mt then


      setmetatable(copy, _M.deep_copy(getmetatable(orig)))


    end


  else


    copy = orig


  end


  return copy


end
