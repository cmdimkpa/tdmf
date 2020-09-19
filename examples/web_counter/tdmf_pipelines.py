#  applicable tests

testEngine.add_test("package", "download_webpage", "string_only")
testEngine.add_test("unit", "download_webpage", ("download_test", ["https://cmdimkpa.github.io/test.txt"], ["test\n"]))

# initiate application flags

flags.set("byte_counter", 0)

# pipelines

download_web_page = Pipeline([
    ( "download_webpage", [ "https://en.wikipedia.org/wiki/History_of_Africa" ] )
])
