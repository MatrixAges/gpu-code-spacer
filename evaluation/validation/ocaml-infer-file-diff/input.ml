let added_directive_position directive position =
  match directive with
  | UnixDiff.Old -> None
  | UnixDiff.New -> Some position
  | UnixDiff.Unchanged -> None
let added_directive_positions directives =
  List.filter_mapi directives ~f:(fun index directive ->
      added_directive_position directive (index + 1))
