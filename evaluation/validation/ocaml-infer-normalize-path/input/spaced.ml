let normalize_path_from ~root fname =


  let add_entry (rev_done, rev_root) entry =


    match (entry, rev_done, rev_root) with


    | ".", _, _ ->


        (* path/. --> path *)


        (rev_done, rev_root)


    | "..", [], ["/"] | "..", ["/"], _ ->


        (* /.. -> / *)


        (rev_done, rev_root)


    | "..", [], ("." | "..") :: _ | "..", ("." | "..") :: _, _ ->


        (* id on {.,..}/.. *)


        (entry :: rev_done, rev_root)


    | "..", [], _ :: rev_root_parent ->


        (* eat from the root part if it's not / *)


        ([], rev_root_parent)


    | "..", _ :: rev_done_parent, _ ->


        (* path/dir/.. --> path *)


        (rev_done_parent, rev_root)


    | _ ->


        (entry :: rev_done, rev_root)


  in


  let rev_root =


    (* Remove the leading "." inserted by [Filename.parts] on relative paths. We don't need to do
       that for [Filename.parts fname] because the "." will go away during normalization in
       [add_entry]. *)


    let root_without_leading_dot =


      match Filename.parts root with "." :: (_ :: _ as rest) -> rest | parts -> parts


    in


    List.rev root_without_leading_dot


  in


  let rev_result, rev_root = Filename.parts fname |> List.fold ~init:([], rev_root) ~f:add_entry in


  (* don't use [Filename.of_parts] because it doesn't like empty lists and produces relative paths
     "./like/this" instead of "like/this" *)


  let filename_of_rev_parts = function


    | [] ->


        "."


    | _ :: _ as rev_parts ->


        let parts = List.rev rev_parts in


        if String.equal (List.hd_exn parts) "/" then


          "/" ^ String.concat ~sep:Filename.dir_sep (List.tl_exn parts)


        else String.concat ~sep:Filename.dir_sep parts


  in


  (filename_of_rev_parts rev_result, filename_of_rev_parts rev_root)
