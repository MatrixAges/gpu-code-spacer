let read_process_output filename =
  Utils.with_file_in filename ~f:In_channel.input_all

let close_input_channel channel =
  In_channel.close channel

let close_process_input descriptor =
  Unix.close descriptor
