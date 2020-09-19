def download_webpage(package):
    '''
        Grab HTML from a webpage
    '''
    func_name = "download_webpage"
    output = []
    try:
        # package is an array with a single url
        url = package[0]

        # grab HTML
        html = http.get(url).content.decode()

        # update byte_counter state
        byte_counter = flags.get("byte_counter")
        byte_counter += len(html)
        flags.set("byte_counter", byte_counter)

        # push HTML to output
        output.append(html)

    except Exception as error:
        print("Error occured at {}: {}".format(func_name, str(error)))
    return output

    
