func events(send: (String) -> Void, topic: String) {
    let message = "Topic: " + topic
    send(message)
    send("done")
}
