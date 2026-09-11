fn enqueue(queue: &mut Vec<String>, value: &str) {
    let owned = value.to_owned();

    queue.push(owned);
    queue.shrink_to_fit();
}
