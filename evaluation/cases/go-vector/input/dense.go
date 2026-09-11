package sample
func vector(x int) []int {
    duplicate := func(value int) []int {
        return []int{value, value}
    }
    println(x)
    return duplicate(
        x,
    )
}
