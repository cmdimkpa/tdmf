# A Test Driven Modular Application Framework - by Monty Dimkpa
#
# building blocks: unit_tests, test modules, test_driven atomic functions, pipelines, workflows & context switches
#
# Version: 0.5

import datetime

def now():
    # get the current time
    return datetime.datetime.today()

def elapsed_secs(t):
    # get the total seconds elapsed since time t
    return (now() - t).total_seconds()

def ut_string_only(package):
    # unit test: check only string items in package
    return sum([isinstance(item, str) for item in package]) == len(package)

def ut_int_only(package):
    # unit test: check only integer items in package
    return sum([isinstance(item, int) for item in package]) == len(package)

def ut_real_only(package):
    # unit test: check only real items in package
    return sum([bool(isinstance(item, int) or isinstance(item, float)) for item in package]) == len(package)

class TestModule:
    '''
        Allows you to run required tests inside your functions
    '''
    def __init__(self, required_tests, package, func_name):
        self.func_name = func_name
        self.required_tests = required_tests
        self.package = package
        self.approved = False
        self.passed = []
        self.failed = []
        self.not_found = []
        self.started = None
    def report(self):
        template = '''
        function: {}
        PASSED: {} tests
        FAILED: {} tests: {}
        NOT_FOUND: {} tests: {}
        duration: {} secs.
        '''
        print(template.format(self.func_name, len(self.passed), len(self.failed), self.failed, len(self.not_found), self.not_found, elapsed_secs(self.started)))
    def run_tests(self):
        self.started = now()
        for test in self.required_tests:
            test = "ut_{}".format(test)
            if test in globals():
                passed = globals()[test](self.package)
                if passed:
                    self.passed.append(test)
                else:
                    self.failed.append(test)
            else:
                self.not_found.append(test)
        if len(self.passed) + len(self.not_found) == len(self.required_tests):
            self.approved = True
        self.report()

class Pipeline:
    '''
        Group related functions sequentially by piping the output of a preceding function
        to the input of the current function
    '''
    def __init__(self, process):
        self.process = process
        self.executed = False
        self.started = None
        self.output = None
    def run(self):
        self.started = now()
        curr_package = None
        function = None
        no_errors = True
        index = 0
        for step in self.process:
            index += 1
            if index == 1:
                function, curr_package = step
                try:
                    curr_package = globals()[curr_package].output
                except:
                    pass
            else:
                function = step
            curr_package = globals()[function](curr_package)
            if not curr_package:
                no_errors = False
                break
        if no_errors:
            self.output = curr_package
            self.executed = True
            print("Pipeline executed successfully (check trace for function-specific errors). Duration: {} secs.".format(elapsed_secs(self.started)))
        else:
            print("Pipeline failed at step {} of {} [function: {}]. Duration: {} secs.".format(index, len(self.process), function, elapsed_secs(self.started)))


class Workflow:
    '''
        Sequential pipeline execution model. Also supports workflow piping.
    '''
    def __init__(self, pipelines):
        self.pipelines = pipelines
        self.output = None
        self.executed = False
        self.started = None
    def run(self):
        if self.pipelines:
            self.started = now()
            n_executed = 0
            no_errors = True
            curr_pipeline = None
            index = -1
            while n_executed < len(self.pipelines) and no_errors:
                index += 1
                curr_pipeline = globals()[self.pipelines[index]]
                curr_pipeline.run()
                if curr_pipeline.executed:
                    n_executed += 1
                else:
                    no_errors = False
            if no_errors:
                print("Workflow executed successfully in {} secs.".format(elapsed_secs(self.started)))
                self.output = curr_pipeline.output
                self.executed = True
            else:
                print("Workflow halted due to failed pipeline: {} ({} of {}). Duration: {} secs.".format(self.pipelines[index], index+1, len(self.pipelines), elapsed_secs(self.started)))
        else:
            pass

def context_switch(conditionals, default):
    '''
        A context switch will constrain flow routing to a function, pipeline or workflow
        depending on the first boolean expression text in the "conditionals" array (of tuples) to evaluate to True.
        If none evaluate, the default object is assigned.
    '''
    selected = None
    for conditional in conditionals:
        expression, object_name = conditional
        if eval(expression):
            selected = object_name
            break
    if selected:
        return selected
    else:
        return default

def sample_function(package):
    '''
        A test-driven atomic function example
    '''
    func_name = "sample_function"
    test_module = TestModule([
    # list applicable tests - drop 'ut_' prefix

    ], package, func_name)
    test_module.run_tests()
    if test_module.approved:
        try:
            # function code goes here
            pass
        except Exception as error:
            print("error at function: {} --> {}".format(func_name, str(error)))
        output = None
        return [output] # output must always be an array
    else:
        return None


# A sample pipeline
sample_pipeline = Pipeline([
    ("sample_function", []),
    "sample_function"
])

# A sample pipeline with context switching
sample_pipeline_with_context_switching = Pipeline([
    ("sample_function", []),
    context_switch([
        ("1 < 0", "sample_function1") # write boolean expressions inside string
    ], "sample_function")
])

# Pipeline chaining example
sample_pipeline_chaining = Pipeline([
    ("sample_function", "sample_pipeline_with_context_switching"),
])

# A workflow example
sample_workflow = Workflow([
    "sample_pipeline",
    "sample_pipeline_chaining",
    "sample_pipeline_with_context_switching"
])

# Workflow chaining example
sample_workflow_chaining = Pipeline([
    ("sample_function", "sample_workflow"),
])

# complex workflow example
sample_complex_workflow = Workflow([
    "sample_workflow",
    "sample_workflow_chaining"
])

# running a complex workflow
sample_complex_workflow.run()
print(sample_complex_workflow.output)
