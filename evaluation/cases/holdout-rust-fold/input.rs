fn lengths(words: &[&str]) -> (usize, usize) {
    let mut count = 0;
    let mut total = 0;
    for word in words {
        let length = word.len();
        count += 1;
        total += length;
    }
    (
        count,
        total,
    )
}
