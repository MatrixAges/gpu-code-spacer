func save(value: String?, store: (String) -> Void) -> Bool {
    let missing = value == nil

    if missing {
        return false
    }

    if let text = value {
        let wrapped = "[" + text + "]"

        store(wrapped)
    }

    return true
}
