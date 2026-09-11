package sample

func broadcast(send func(string), channel string) {
    prefix := "channel: " + channel

    send(prefix)
    send("ready")
}
