package validation


func MakePermalink(host, plink string) *url.URL {


	base, err := url.Parse(host)


	if err != nil {


		panic(err)


	}


	p, err := url.Parse(plink)


	if err != nil {


		panic(err)


	}


	if p.Host != "" {


		panic(fmt.Errorf("can't make permalink from absolute link %q", plink))


	}


	base.Path = path.Join(base.Path, p.Path)


	base.Fragment = p.Fragment


	base.RawQuery = p.RawQuery


	// path.Join will strip off the last /, so put it back if it was there.


	hadTrailingSlash := (plink == "" && strings.HasSuffix(host, "/")) || strings.HasSuffix(p.Path, "/")


	if hadTrailingSlash && !strings.HasSuffix(base.Path, "/") {


		base.Path = base.Path + "/"


	}


	return base


}
