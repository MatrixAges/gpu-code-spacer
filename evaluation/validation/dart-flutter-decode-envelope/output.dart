class ValidationSample {
  dynamic decodeEnvelope(ByteData envelope) {
    // First byte is zero in success case, and non-zero otherwise.
    if (envelope.lengthInBytes == 0) {
      throw const FormatException('Expected envelope, got nothing');
    }

    final buffer = ReadBuffer(envelope);

    if (buffer.getUint8() == 0) {
      return messageCodec.readValue(buffer);
    }

    final Object? errorCode = messageCodec.readValue(buffer);
    final Object? errorMessage = messageCodec.readValue(buffer);
    final Object? errorDetails = messageCodec.readValue(buffer);

    final String? errorStacktrace = buffer.hasRemaining
        ? messageCodec.readValue(buffer) as String?
        : null;

    if (errorCode is String &&
        (errorMessage == null || errorMessage is String) &&
        !buffer.hasRemaining) {
      throw PlatformException(
        code: errorCode,
        message: errorMessage as String?,
        details: errorDetails,
        stacktrace: errorStacktrace,
      );
    } else {
      throw const FormatException('Invalid envelope');
    }
  }
}
