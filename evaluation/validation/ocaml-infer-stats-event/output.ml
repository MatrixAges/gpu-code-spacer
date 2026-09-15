let add_count sample value =
  StatsSample.add_int sample ~name:"value" ~value

let add_message sample message =
  StatsSample.add_normal sample ~name:"message" ~value:message
