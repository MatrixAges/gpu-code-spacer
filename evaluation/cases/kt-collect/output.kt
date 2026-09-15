fun MutableList<String>.collect(name: String, publish: (List<String>) -> Unit) {
    val normalized = name.lowercase()

    add(normalized)
    sort()
    publish(this)
}
