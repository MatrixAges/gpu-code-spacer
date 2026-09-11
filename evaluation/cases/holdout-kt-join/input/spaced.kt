fun names(entries: Map<String, Int>): String {
    val active = entries.filterValues { it > 0 }


    if (active.isEmpty()) {
        return "none"
    }


    val result = active.keys
        .sorted()


        .joinToString(", ")


    // Present the stable ordering to the caller.
    return result
}
