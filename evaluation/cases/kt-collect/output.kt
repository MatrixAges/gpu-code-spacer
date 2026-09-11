fun collect(items: MutableList<String>, name: String, publish: (List<String>) -> Unit) {
    val normalized = name.lowercase()

    items.add(normalized)
    items.sort()
    publish(items)
}
