def record(sink, readings):
    report = ",".join(str(value) for value in readings)


    sink.write(report)


    sink.flush()
