fn inspect(key: Option<&str>, output: &mut Vec<String>) -> bool {
    let Some(text) = key else {
        return false;
    };
    if text.is_empty() {
        return false;
    }
    let description = format!("key={}", text);
    output.push(description);
    return true;
}
