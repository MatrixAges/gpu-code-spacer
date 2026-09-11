package validation
func Slice(args ...any) any {
	if len(args) == 0 {
		return args
	}
	first := args[0]
	firstType := reflect.TypeOf(first)
	if firstType == nil {
		return args
	}
	if g, ok := first.(Slicer); ok {
		v, err := g.Slice(args)
		if err == nil {
			return v
		}
		// If Slice fails, the items are not of the same type and
		// []interface{} is the best we can do.
		return args
	}
	if len(args) > 1 {
		// This can be a mix of types.
		for i := 1; i < len(args); i++ {
			if firstType != reflect.TypeOf(args[i]) {
				// []interface{} is the best we can do
				return args
			}
		}
	}
	slice := reflect.MakeSlice(reflect.SliceOf(firstType), len(args), len(args))
	for i, arg := range args {
		slice.Index(i).Set(reflect.ValueOf(arg))
	}
	return slice.Interface()
}
