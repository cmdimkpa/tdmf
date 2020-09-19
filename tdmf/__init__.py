# Import TDMF

import os
from os import listdir
from os.path import isfile, join
import requests as http

# current version
tdmf_version = 0.5
tdmf_url = "https://raw.githubusercontent.com/cmdimkpa/cmdimkpa.github.io/master/tdmf-{}/tdmf-{}.py".format(tdmf_version, tdmf_version)

# get TDMF_HOME directory
TDMF_HOME = os.getcwd()
if "\\" in TDMF_HOME:
    slash = "\\"
else:
    slash = "/"
TDMF_HOME += slash
tdmf_file = TDMF_HOME + "tdmf-{}.py".format(tdmf_version)

def get_tdmf():
    '''
        return current available version of TDMF
    '''
    tdmf = None
    try:
        with open(tdmf_file, "rb") as handle:
            tdmf = handle.read()
            handle.close()
    except:
        try:
            # attempt to download the current version
            tdmf_ = http.get(tdmf_url).content
            if "404" not in tdmf_.decode():
                tdmf = tdmf_
                # write current version to TDMF_HOME
                with open(tdmf_file, "wb") as handle:
                    handle.write(tdmf)
                    handle.close()
            else:
                # fallback to last version
                versions = [file for file in listdir(TDMF_HOME) if isfile(join(TDMF_HOME, file)) and "tdmf-" in file]
                versions.sort()
                use_version = versions[-1]
                with open(use_version, "rb") as handle:
                    tdmf = handle.read()
                    handle.close()
        except:
            pass
    if tdmf:
        # add TDMF components, pipelines and workflows
        targets = ["components", "pipelines", "workflows"]
        for target in targets:
            file = TDMF_HOME + "tdmf_{}.py".format(target)
            try:
                with open(file, "rb") as handle:
                    tdmf += handle.read()
                    handle.close()
            except:
                pass
    return tdmf

# install and run TDMF
try:
    exec(get_tdmf())
except:
    pass
