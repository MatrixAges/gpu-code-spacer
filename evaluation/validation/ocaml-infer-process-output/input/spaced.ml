let create_process_and_wait_with_output ~prog ~args ?(env = `Extend []) action =


  let redirected_fd_name, redirect_spec =


    match action with ReadStderr -> ("stderr", "2>") | ReadStdout -> ("stdout", ">")


  in


  let output_file =


    IFilename.temp_file ~in_dir:(ResultsDir.get_path Temporary) prog redirected_fd_name


  in


  let escaped_cmd = List.map ~f:Escape.escape_shell (prog :: args) |> String.concat ~sep:" " in


  let redirected_cmd = Printf.sprintf "exec %s %s'%s'" escaped_cmd redirect_spec output_file in


  let {IUnix.Process_info.stdin; stdout; stderr; pid} =


    IUnix.create_process_env ~prog:"sh" ~args:["-c"; redirected_cmd] ~env


  in


  let fd_to_log, redirected_fd =


    match action with ReadStderr -> (stdout, stderr) | ReadStdout -> (stderr, stdout)


  in


  let channel_to_log = Unix.in_channel_of_descr fd_to_log in


  Utils.with_channel_in channel_to_log ~f:(L.progress "%s-%s: %s@." prog redirected_fd_name) ;


  In_channel.close channel_to_log ;


  Unix.close redirected_fd ;


  Unix.close stdin ;


  match IUnix.waitpid pid with


  | Ok () ->


      Utils.with_file_in output_file ~f:In_channel.input_all


  | Error _ as status ->


      L.die ExternalError "Error executing: %a@\n%s@\n" Pp.cli_args (prog :: args)


        (IUnix.Exit_or_signal.to_string_hum status)
