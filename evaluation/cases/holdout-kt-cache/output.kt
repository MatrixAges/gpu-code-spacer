fun remember(values: MutableMap<String, String>, key: String, load: () -> String?): Boolean {
    val loaded = load()

    if (loaded == null) {
        return false
    }

    val cleaned = loaded.trim()

    values.put(key, cleaned)

    return true
}
