let from_abs_path ?(warn_on_error = true) fname =
  if Filename.is_relative fname then
    L.(die InternalError) "Path '%s' is relative, when absolute path was expected." fname ;

  (* A compiler-generated sentinel (see [compiler_generated]) has no on-disk file by
     construction, so don't warn when [realpath] fails to resolve it. *)
  let warn_on_error =
    warn_on_error && not (String.is_suffix fname ~suffix:compiler_generated_suffix) in

  (* try to get realpath of source file. Use original if it fails *)
  let fname_real = try Utils.realpath ~warn_on_error fname with Unix.Unix_error _ -> fname in

  match
    Utils.filename_to_relative ~backtrack:Config.relative_path_backtrack ~root:project_root_real
      fname_real
  with
  | None when Config.buck_cache_mode && Filename.check_suffix fname_real "java" ->
      L.die InternalError "%s is not relative to %s" fname_real project_root_real
  | None ->
      (* fname_real is absolute already *)
      Absolute fname_real
  | Some rel_path -> (
    match sanitise_buck_out_gen_hashed_path rel_path with
    | Some sanitised_path ->
        HashedBuckOut sanitised_path
    | None -> (
      match workspace_rel_root_opt with
      | Some workspace_rel_root ->
          RelativeProjectRootAndWorkspace {workspace_rel_root; rel_path}
      | None ->
          RelativeProjectRoot rel_path ) )
