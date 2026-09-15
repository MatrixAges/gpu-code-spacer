let resolve_path ~root fname =
  if Filename.is_relative fname then
    Filename.concat root fname
  else
    fname

let path_basename fname =
  Filename.basename fname
