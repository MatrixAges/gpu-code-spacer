function notify(send, name) {
  const title = "Hello";


  const message = `${title}, ${name}`;


  send(message);


  send("Goodbye");
}
