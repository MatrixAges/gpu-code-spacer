let parse_directives directives =


  let rec aux ~d ~lines ~line_ptr ~pred_is_old =


    (* O does not move the line-pointer *)


    (* N moves the line-pointer and marks the line as affected *)


    (* U moves the line-pointer, and marks the line as affected ONLY if it is preceded by O *)


    match d with


    | [] ->


        List.rev lines


    | UnixDiff.Old :: ds ->


        aux ~d:ds ~lines ~line_ptr ~pred_is_old:true


    | UnixDiff.New :: ds ->


        aux ~d:ds ~lines:(line_ptr :: lines) ~line_ptr:(line_ptr + 1) ~pred_is_old:false


    | UnixDiff.Unchanged :: ds ->


        let lines' = if pred_is_old then line_ptr :: lines else lines in


        aux ~d:ds ~lines:lines' ~line_ptr:(line_ptr + 1) ~pred_is_old:false


  in


  if List.is_empty directives then (* handle the case where both files are empty *)


    []


  else if


    (* handle the case where the new-file is empty *)


    List.for_all ~f:(UnixDiff.equal UnixDiff.Old) directives


  then [1]


  else


    let pred_is_old, directives' =


      match directives with UnixDiff.Old :: ds -> (true, ds) | _ -> (false, directives)


    in


    aux ~d:directives' ~lines:[] ~line_ptr:1 ~pred_is_old
