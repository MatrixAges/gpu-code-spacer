public func writeEncodedData(to fileURL: URL) throws {
    if let bodyPartError {
        throw bodyPartError
    }

    if fileManager.fileExists(atPath: fileURL.path) {
        throw AFError.multipartEncodingFailed(reason: .outputStreamFileAlreadyExists(at: fileURL))
    } else if !fileURL.isFileURL {
        throw AFError.multipartEncodingFailed(reason: .outputStreamURLInvalid(url: fileURL))
    }

    guard let outputStream = OutputStream(url: fileURL, append: false) else {
        throw AFError.multipartEncodingFailed(reason: .outputStreamCreationFailed(for: fileURL))
    }

    outputStream.open()

    defer { outputStream.close() }

    bodyParts.first?.hasInitialBoundary = true
    bodyParts.last?.hasFinalBoundary = true

    for bodyPart in bodyParts {
        try write(bodyPart, to: outputStream)
    }
}

private func encodeBodyStream(for bodyPart: BodyPart) throws -> Data {
    let inputStream = bodyPart.bodyStream

    inputStream.open()

    defer { inputStream.close() }

    var encoded = Data()

    while inputStream.hasBytesAvailable {
        var buffer = [UInt8](repeating: 0, count: streamBufferSize)
        let bytesRead = inputStream.read(&buffer, maxLength: streamBufferSize)

        if let error = inputStream.streamError {
            throw AFError.multipartEncodingFailed(reason: .inputStreamReadFailed(error: error))
        }

        if bytesRead > 0 {
            encoded.append(buffer, count: bytesRead)
        } else {
            break
        }
    }

    guard UInt64(encoded.count) == bodyPart.bodyContentLength else {
        let error = AFError.UnexpectedInputStreamLength(bytesExpected: bodyPart.bodyContentLength,
                                                        bytesRead: UInt64(encoded.count))

        throw AFError.multipartEncodingFailed(reason: .inputStreamReadFailed(error: error))
    }

    return encoded
}

private func writeBodyStream(for bodyPart: BodyPart, to outputStream: OutputStream) throws {
    let inputStream = bodyPart.bodyStream

    inputStream.open()

    defer { inputStream.close() }

    var bytesLeftToRead = bodyPart.bodyContentLength

    while inputStream.hasBytesAvailable && bytesLeftToRead > 0 {
        let bufferSize = min(streamBufferSize, Int(bytesLeftToRead))
        var buffer = [UInt8](repeating: 0, count: bufferSize)
        let bytesRead = inputStream.read(&buffer, maxLength: bufferSize)

        if let streamError = inputStream.streamError {
            throw AFError.multipartEncodingFailed(reason: .inputStreamReadFailed(error: streamError))
        }

        if bytesRead > 0 {
            if buffer.count != bytesRead {
                buffer = Array(buffer[0..<bytesRead])
            }

            try write(&buffer, to: outputStream)

            bytesLeftToRead -= UInt64(bytesRead)
        } else {
            break
        }
    }
}
