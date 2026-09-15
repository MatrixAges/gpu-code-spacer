package validation
func unwrapForHashing(v reflect.Value) (reflect.Value, error) {
	if v.Kind() != reflect.Struct {
		return v, nil
	}
	var in any
	if v.CanAddr() {
		// The common case; pointer receiver methods on a struct
		// reached through a pointer.
		in = v.Addr().Interface()
	} else {
		in = v.Interface()
	}
	if _, ok := in.(hashstructure.Hashable); ok {
		// Let hashstructure handle it.
		return v, nil
	}
	if t, ok := in.(keyer); ok {
		return reflect.ValueOf(t.Key()), nil
	}
	if t, ok := in.(identity.IdentityProvider); ok {
		return reflect.ValueOf(t.GetIdentity()), nil
	}
	return v, nil
}
