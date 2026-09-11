func total(records: [String: Int]) -> (Int, Int) {
    var count = 0


    var sum = 0


    for (_, value) in records {
        count += 1


        sum += value
    }


    return (


        count,


        sum


    )
}
