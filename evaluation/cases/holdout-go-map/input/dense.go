package sample
func lookup(values map[string]int, name string, save func(int)) bool {
    amount, found := values[name]
    if !found {
        return false
    }
    doubled := amount * 2
    save(doubled)
    return true
}
