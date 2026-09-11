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


	switch t := in.(type) {


	case hashstructure.Hashable:


		// Let hashstructure handle it.


		return v, nil


	case keyer:


		return reflect.ValueOf(t.Key()), nil


	case identity.IdentityProvider:


		return reflect.ValueOf(t.GetIdentity()), nil


	}


	return v, nil


}
