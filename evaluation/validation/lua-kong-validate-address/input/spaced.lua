local function validate(input, f1, f2, prefixes)


  if type(input) ~= "string" then


    return false


  end


  if prefixes then


    local ip, prefix = split_cidr(input, prefixes)


    if not ip or not prefix then


      return false


    end


    input = ip


  end


  if f1(input) then


    return true


  end


  if f2 and f2(input) then


    return true


  end


  return false


end
