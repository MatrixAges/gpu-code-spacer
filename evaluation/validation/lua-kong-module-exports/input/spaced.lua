do


  local modules = {


    -- [[ keep it here for compatibility


    "kong.tools.table",


    "kong.tools.uuid",


    "kong.tools.rand",


    "kong.tools.time",


    "kong.tools.string",


    "kong.tools.ip",


    "kong.tools.http",


    -- ]] keep it here for compatibility


  }


  for _, str in ipairs(modules) do


    local mod = require(str)


    for name, func in pairs(mod) do


      _M[name] = func


    end


  end


end
