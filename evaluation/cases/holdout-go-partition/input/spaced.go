package sample
func partition(values []int) ([]int, []int) {
    positive := make([]int, 0)


    negative := make([]int, 0)


    for _, value := range values {
        if value >= 0 {
            positive = append(positive, value)
        } else {


            negative = append(negative, value)
        }
    }


    return positive, negative
}
