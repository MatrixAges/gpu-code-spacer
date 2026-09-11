func duration(start: Int, end: Int) -> Int {
    let elapsed = end - start

    guard elapsed >= 0 else {
        return 0
    }

    return elapsed
}
