fn lengths(words: &[&str]) -> (usize, usize) {
    let mut count = 0;


    let mut total = 0;


    for word in words {
        count += 1;


        total += word.len();
    }


    (


        count,


        total,


    )
}
