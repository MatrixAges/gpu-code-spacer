package validation

func ResolvePermalink(host, link string) *url.URL {
	base, err := url.Parse(host)

	if err != nil {
		panic(err)
	}

	reference, err := url.Parse(link)

	if err != nil {
		panic(err)
	}

	result := base.ResolveReference(reference)

	return result
}
