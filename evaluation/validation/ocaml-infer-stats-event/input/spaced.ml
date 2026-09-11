let sample_from_event ~loc ({label; created_at_ts; data} : LogEntry.t) =


  let open StatsSample in


  let create_sample_with_label label =


    new_sample ~time:(Some created_at_ts)


    |> set_common_fields


    |> add_normal ~name:"event" ~value:label


    |> maybe_add_normal ~name:"location" ~value:loc


  in


  match data with


  | Count {value} ->


      create_sample_with_label (Printf.sprintf "count.%s" label)


      |> StatsSample.add_int ~name:"value" ~value


  | Time {duration_us} ->


      create_sample_with_label (Printf.sprintf "time.%s" label)


      |> StatsSample.add_int ~name:"value" ~value:duration_us


  | String {message} ->


      create_sample_with_label (Printf.sprintf "msg.%s" label)


      |> StatsSample.add_normal ~name:"message" ~value:message
