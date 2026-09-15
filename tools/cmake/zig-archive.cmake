# Use Zig's archiver for target objects instead of the host platform's archiver.
set(CMAKE_AR "${CMAKE_C_COMPILER}")

foreach(language C CXX)
    set(CMAKE_${language}_ARCHIVE_CREATE "<CMAKE_AR> ar qc <TARGET> <LINK_FLAGS> <OBJECTS>")
    set(CMAKE_${language}_ARCHIVE_APPEND "<CMAKE_AR> ar q <TARGET> <LINK_FLAGS> <OBJECTS>")
    set(CMAKE_${language}_ARCHIVE_FINISH "<CMAKE_AR> ranlib <TARGET>")
endforeach()
