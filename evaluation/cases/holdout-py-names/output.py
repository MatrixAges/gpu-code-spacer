def resolve(records, identifier):
    record = records.get(identifier)

    if record is None:
        return "anonymous"

    first = record.get("first", "")
    last = record.get("last", "")

    # Empty components are omitted from the display name.
    return " ".join(
        part for part in (first, last) if part
    )
