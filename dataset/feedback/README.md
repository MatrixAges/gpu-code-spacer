# Reviewed feedback sources

These are manually spaced training excerpts, not regression expectations or
runtime formatting rules. The directory name supplies language metadata to the
offline trainer; the model does not receive the language or file path.

`swift/MultipartFormData.swift` contains three complete functions from Alamofire's
`Source/Features/MultipartFormData.swift` at commit
`bda9ed57d72988a3a2ada33d824583541f86eac6`. They are the same source excerpts used
in the live demo, with manually reviewed blank lines reflecting the user's
September 17 feedback. Code and indentation are unchanged.

Source: https://github.com/Alamofire/Alamofire/blob/bda9ed57d72988a3a2ada33d824583541f86eac6/Source/Features/MultipartFormData.swift

License: MIT, retained in `web/public/examples/swift-LICENSE.txt`.

Because these Swift functions are now training feedback, they must not be
reported as unseen-language generalization evidence. Existing evaluation files
are separate and are not included in this feedback set.
