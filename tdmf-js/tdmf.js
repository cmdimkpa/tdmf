/*
  A Test Driven Modular Application Framework - by Monty Dimkpa

  building blocks: unit_tests, package_tests, test modules, test_driven atomic functions, pipelines,
  workflows, context switches and flags (global mutable state) based routing

  Version: 0.5
*/

class MutableState {
  /*
      Mutable state for message-passing between functions, pipelines
      and workflows.
  */
  constructor (){
    this.state = { };
  }
  update (key, value) {
    this.state[key] = value;
  }
  fetch (key) {
    return this.state[key];
  }
}

flags = new MutableState();

class fetch_flag_inline {
  // dynamic flag extraction
  constructor (item){
    this.item = item;
    this.output = flags.fetch(this.item);
  }
}

let now = () => Date.now() // get the current time

let elapsed_secs = (t) => (now() - t)/1000 // get the total seconds elapsed since time t

let pt_string_only = (package) => {
  // package test: check only string items in package
  return package.length === package.map(u => typeof(u) === 'string').reduce((a,b) => a+b, 0)
}

let pt_number_only = (package) => {
  // package test: check only number items in package
  return package.length === package.map(u => typeof(u) === 'number').reduce((a,b) => a+b, 0)
}

let pt_object_only = (package) => {
  // package test: check only number items in package
  return package.length === package.map(u => typeof(u) === 'object').reduce((a,b) => a+b, 0)
}

const array_equals = (arr, ref_arr) => {
  let ok = 0
  if (arr.length === ref_arr.length){
    for (var i=0;i<ref_arr.length;i++){
      if (ref_arr[i] === arr[i]){
        ok++
      }
    }
    return arr.length === ok
  } else {
    return false
  }
}

class TestRegister {
  // Allows you to register and de-register tests for functions
  constructor (){
    this.register = { }
    this.last_register_status = -1
  }

  add_test ( test_category, fx, test_name, test_package=null, test_output=null ){
    if ( ["package", "unit"].indexOf( test_category ) !== -1 ){
      var obj = test_name;
      if ( test_package ){ obj = [ test_name, test_package, test_output ] }
      if (Object.keys(this.register).indexOf(fx) !== -1){
        if (Object.keys(this.register[fx]).indexOf(test_category) !== -1){
          if (this.register[fx][test_category].indexOf(test_name) === -1){
            this.register[fx][test_category].push(obj)
          }
        } else {
          this.register[ fx ][ test_category ] = [ obj ]
        }
      } else {
        this.register[ fx ] = { }
        this.register[ fx ][ test_category ] = [ obj ]
      }
      this.last_register_status = 1
    } else {
      this.last_register_status = 0
    }
  }

  remove_test (test_category, fx, test_name){
    this.last_register_status = 0
    if (Object.keys(this.register).indexOf(fx) !== -1){
      if (Object.keys(this.register[fx]).indexOf(test_category) !== -1){
        for (var i=0;i<this.register[fx][test_category].length;i++){
          let sample = this.register[fx][test_category][i]
          var index = sample.indexOf(test_name);
          if (index !== -1){
            this.register[fx][test_category].splice(index, 1)
            this.last_register_status = 1
            break
          }
        }
      }
    }
  }

  lookup_tests (fx){
    if (Object.keys(this.register).indexOf(fx) !== -1){
      return this.register[fx]
    } else {
      return { package : [], unit : [] }
    }
  }
}

class TestModule extends TestRegister {
  constructor (){
    super()
    this.test_status = { }
    this.last_test_output = null
  }

  report (fx) {
    var template = `
        function: ${fx}

        ---- PACKAGE TESTS ----

        PASSED: ${this.test_status[fx].package.passed.length} tests
        FAILED: ${this.test_status[fx].package.failed.length} tests: ${this.test_status[fx].package.failed}
        NOT_FOUND: ${this.test_status[fx].package.not_found.length} tests: ${this.test_status[fx].package.not_found}
        duration: ${this.test_status[fx].package.runtime} secs.

        ---- UNIT TESTS ----

        PASSED: ${this.test_status[fx].unit.passed.length} tests
        FAILED: ${this.test_status[fx].unit.failed.length} tests: ${this.test_status[fx].unit.failed}
        NOT_FOUND: ${this.test_status[fx].unit.not_found.length} tests: ${this.test_status[fx].unit.not_found}
        duration: ${this.test_status[fx].unit.runtime} secs.

        `
    console.log(template)
  }

  run_tests (fx, pkg){
    this.test_status[fx] = {
            package : {
                passed : [],
                failed : [],
                not_found : [],
                runtime : 0
            },
            unit : {
                passed : [],
                failed : [],
                not_found : [],
                runtime : 0
            },
            approved : false
        }

    var package_tests = [ ]
    var unit_tests = [ ]

    let tests = this.lookup_tests(fx);

    try {
      if (tests.package){ package_tests = tests.package }
    } catch(err){}
    try {
      if (tests.unit){ unit_tests = tests.unit }
    } catch(err){}

    // run package tests
    let started = now()
    for (var i=0;i<package_tests.length;i++){
      let test = `pt_${ package_tests[i] }`
      try {
        let passed = eval(test)(pkg);
        if (passed){
          this.test_status[fx].package.passed.push(test)
        } else {
          this.test_status[fx].package.failed.push(test)
        }
      } catch(err){
        this.test_status[fx].package.not_found.push(test)
      }
    }
    this.test_status[fx].package.runtime = elapsed_secs(started)

    // run unit tests
    started = now()
    for (var i=0;i<unit_tests.length;i++){
      let [test, test_package, test_output] = unit_tests[i]
      try {
        if (array_equals(test_output, eval(fx)(test_package))){
          this.test_status[fx].unit.passed.push(test)
          this.last_test_output = test_output
        } else {
          this.test_status[fx].unit.failed.push(test)
        }
      } catch(err){
        this.test_status[fx].unit.not_found.push(test)
      }
    }
    this.test_status[fx].unit.runtime = elapsed_secs(started)

    // check test approval and report
    if (this.test_status[fx].unit.passed.length + this.test_status[fx].unit.not_found.length + this.test_status[fx].package.passed.length + this.test_status[fx].package.not_found.length === tests.unit.length + tests.package.length){
      this.test_status[fx].approved = true;
    }
    this.report(fx)
  }
}

testEngine = new TestModule()

class Pipeline {
  /*
      Group related functions sequentially by piping the output of a preceding function
      to the input of the current function
  */
  constructor ( process ) {
    this.process = process
    this.executed = false
    this.started = null
    this.output = null
    this.can_run = false
  }

  build (){
    this.started = now()
    try {
      let [primer, curr_package] = this.process[0]
      try {
        let curr_package_ = eval(curr_package).output;
        if (curr_package_){ curr_package = curr_package_ }
      } catch(err){}
      var functions = this.process.slice(1,).reduce((a,b) => { a.push(b); return a }, [ primer ])
      var failed = false
      for (var i=0;i<functions.length;i++){
        let fx = functions[i]
        testEngine.run_tests(fx, curr_package)
        if (testEngine.test_status[fx].approved){
          curr_package = testEngine.last_test_output
        } else {
          failed = true
          console.log(`BuildError: pipeline build failed at function: ${fx}. Duration: ${elapsed_secs(this.started)} secs.`)
          break
        }
      }
      if (!failed){
        this.can_run = true;
        this.run()
      }
    } catch(err){
      console.log(`BuildError: pipeline not properly constructed. Duration: ${elapsed_secs(this.started)} secs.`)
    }
  }

  run (){
    this.started = now()
    if (this.can_run){
      var curr_package,
          curr_package_,
          fx,
          no_errors = true
      for (var index=0;index<this.process.length;index++){
        let step = this.process[index];
        if (index === 0){
          [fx, curr_package] = step
          try {
            curr_package_ = eval(curr_package).output;
            if (curr_package_){ curr_package = curr_package_ }
          } catch(err){ }
        } else {
          fx = step
        }
        curr_package = eval(fx)(curr_package);
        if (!curr_package){
          no_errors = false
          break
        }
      }
      if (no_errors){
        this.output = curr_package
        this.executed = true
        this.can_run = false
        console.log(`Pipeline executed successfully (check trace for function-specific errors). Duration: ${elapsed_secs(this.started)} secs.`)
      }
    } else {
      console.log(`RuntimeError: please build this pipeline first. Duration: ${elapsed_secs(this.started)} secs.`)
    }
  }
}

class Workflow {
  // Sequential pipeline execution model. Also supports workflow piping.
  constructor (pipelines) {
    this.pipelines = pipelines
    this.output = null
    this.executed = false
    this.started = null
  }

  build (){
    this.run()
  }

  run() {
    if (this.pipelines){
      this.started = now()
      var n_executed = 0,
          no_errors = true,
          curr_pipeline = null,
          index = -1
      while ( n_executed < this.pipelines.length && no_errors ){
        index++;
        curr_pipeline = eval(this.pipelines[index]);
        curr_pipeline.build()
        if (curr_pipeline.executed){
          n_executed++
        } else {
          no_errors = false
        }
      }
      if (no_errors){
        console.log(`Workflow executed successfully in ${elapsed_secs(this.started)} secs.`)
        this.output = curr_pipeline.output
        this.executed = true
      } else {
        console.log(`Workflow halted due to failed pipeline: ${this.pipelines[index]} (${index+1} of ${this.pipelines.length}). Duration: ${elapsed_secs(this.started)} secs.`)
      }
    }
  }
}

let context_switch = (conditionals, fallback) => {
  /*
      A context switch will constrain flow routing to a function, pipeline or workflow
      depending on the first flag boolean in the "conditionals" array (of tuples) to evaluate to True.
      If no flag booleans evaluate to True, the default object is assigned.
  */
  selected = null
  for (var i=0;i<conditionals;i++){
    let [flag_boolean, object_name] = conditionals[i]
    if (flag_boolean){
      selected = object_name
      break
    }
  }
  if (selected){
    return selected
  } else {
    return fallback
  }
}

/*

// test code to be sure this works

testEngine.add_test("package", "get_sum", "number_only")
testEngine.add_test("unit", "get_sum", ["test1", [1,2,3], [6]])
testEngine.add_test("package", "times_two", "number_only")
testEngine.add_test("unit", "times_two", ["test1", [1,2,3], [2,4,6]])

const get_sum = (package) => {
  output = []
  try {
    output = [ package.reduce((a,b) => a+b, 0) ]
  } catch(err){
    console.log(err)
  }
  return output
}

const times_two = (package) => {
  output = []
  try {
    output = package.map(x => x*2)
    times_two_output = flags.fetch("times_two_output")
    if (times_two_output){
      times_two_output = output.reduce((a,b) => { a.push(b); return a }, times_two_output)
    } else {
      times_two_output = output
    }
    flags.update("times_two_output", times_two_output)
  } catch(err){
    console.log(err)
  }
  return output
}

let sample_pipeline = new Pipeline([
    ["get_sum", [1,2.44,3]],
    "times_two"
])

sample_pipeline2 = new Pipeline([
    ["get_sum", "new fetch_flag_inline('times_two_output')"],
    context_switch([
        [flags.fetch("times_two_output")> 0, "get_sum"],
    ], "times_two")
])

sample_workflow = new Workflow([
   "sample_pipeline",
   "sample_pipeline2"
])

sample_workflow.run()
console.log(sample_workflow)

*/

exports.MutableState = MutableState
exports.flags = flags
exports.fetch_flag_inline = fetch_flag_inline
exports.now = now
exports.elapsed_secs = elapsed_secs
exports.pt_string_only = pt_string_only
exports.pt_number_only = pt_number_only
exports.pt_object_only = pt_object_only
exports.array_equals = array_equals,
exports.TestRegister = TestRegister
exports.TestModule = TestModule
exports.testEngine = testEngine
exports.Pipeline = Pipeline
exports.Workflow = Workflow
exports.context_switch = context_switch
