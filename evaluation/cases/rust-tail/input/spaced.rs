fn upper(names: &[&str]) -> Vec<String> {
    names.iter()


        .map(|name| name.to_uppercase())


        .collect()
}
