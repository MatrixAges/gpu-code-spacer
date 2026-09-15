package validation
func openFile(filename string, fs afero.Fs) (afero.File, string, error) {
	realFilename := filename
	// We want the most specific filename possible in the error message.
	if fi, err2 := fs.Stat(filename); err2 == nil {
		if s, ok := fi.(interface {
			Filename() string
		}); ok {
			realFilename = s.Filename()
		}
	}
	f, err2 := fs.Open(filename)
	if err2 != nil {
		return nil, realFilename, err2
	}
	return f, realFilename, nil
}
