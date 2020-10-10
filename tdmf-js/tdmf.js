/*
  A Test Driven Modular Application Framework - by Monty Dimkpa

  building blocks: unit_tests, package_tests, test modules, test_driven atomic functions, pipelines,
  workflows, context switches and flags (global mutable state) based routing

  Version: 0.5.34
*/

fs = require('fs')

const serialize = (handle, json) => {
  // write data to disk
  try {
    file = `./${handle}`;
    data = JSON.stringify(json);
    fs.writeFileSync( file, data )
  } catch(err){}
}

const deserialize = (handle) => {
  // read data from disk
  try {
    file = `./${handle}`;
    return JSON.parse( fs.readFileSync( file ) );
  } catch(err) {
    return undefined
  }
}

const delete_handle = (handle) => {
  // delete cache file
  try {
    file = `./${handle}`;
    fs.unlinkSync( file )
  } catch(err){}
}


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

const _MutableState = () => new MutableState()

flags = _MutableState()

class fetch_flag_inline {
  // dynamic flag extraction
  constructor (item){
    this.item = item;
    this.output = flags.fetch(this.item);
  }
}

const _fetch_flag_inline = (item) => new fetch_flag_inline(item)

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
  // check that two arrays are equal
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

const te_report = async (fx) => {
  // test engine reporter
  var ts = deserialize("ts"),
      template = `
      function: ${fx}

      ---- PACKAGE TESTS ----

      PASSED: ${ts.test_status[fx].package.passed.length} tests
      FAILED: ${ts.test_status[fx].package.failed.length} tests: ${ts.test_status[fx].package.failed}
      NOT_FOUND: ${ts.test_status[fx].package.not_found.length} tests: ${ts.test_status[fx].package.not_found}
      duration: ${ts.test_status[fx].package.runtime} secs.

      ---- UNIT TESTS ----

      PASSED: ${ts.test_status[fx].unit.passed.length} tests
      FAILED: ${ts.test_status[fx].unit.failed.length} tests: ${ts.test_status[fx].unit.failed}
      NOT_FOUND: ${ts.test_status[fx].unit.not_found.length} tests: ${ts.test_status[fx].unit.not_found}
      duration: ${ts.test_status[fx].unit.runtime} secs.

      `
  if (testEngine.options.verbose){
    console.log(template)
  }
}

const te_run_tests = async (fx, pkg) => {
  // test engine : run tests
  var ts = deserialize("ts") || { test_status : { }, last_test_output : null }

  ts.test_status[fx] = {
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

  let tests = testEngine.lookup_tests(fx);

  try {
    if (tests.package){ package_tests = tests.package }
  } catch(err){}
  try {
    if (tests.unit){ unit_tests = tests.unit }
  } catch(err){}

  // run package tests
  let started = now()
  for (var i=0;i<package_tests.length;i++){
    let test = package_tests[i];
    try {
      let passed = await eval(test)(pkg);
      if (passed){
        ts.test_status[fx].package.passed.push(test)
      } else {
        ts.test_status[fx].package.failed.push(test)
      }
    } catch(err){
      ts.test_status[fx].package.not_found.push(test)
    }
  }
  ts.test_status[fx].package.runtime = elapsed_secs(started)

  // run unit tests
  started = now()
  for (var i=0;i<unit_tests.length;i++){
    let [test, test_package, test_output] = unit_tests[i]
    try {
      if (array_equals(test_output, await eval(fx)(test_package))){
        ts.test_status[fx].unit.passed.push(test)
        ts.last_test_output = test_output
      } else {
        ts.test_status[fx].unit.failed.push(test)
      }
    } catch(err){
      ts.test_status[fx].unit.not_found.push(test)
    }
  }
  ts.test_status[fx].unit.runtime = elapsed_secs(started)

  // check test approval and report
  if (ts.test_status[fx].unit.passed.length + ts.test_status[fx].unit.not_found.length + ts.test_status[fx].package.passed.length + ts.test_status[fx].package.not_found.length === unit_tests.length + package_tests.length){
    ts.test_status[fx].approved = true;
  }
  // serialize and report
  serialize('ts', ts)
  await te_report(fx)
}

const build_pipeline = async (pipeline) => {
  // build pipeline asynchronously
  pipeline.started = now()
  try {
    let [primer, curr_package] = pipeline.process[0]
    try {
      let curr_package_ = eval(curr_package).output;
      if (curr_package_){ curr_package = curr_package_ }
    } catch(err){}
    var functions = pipeline.process.slice(1,).reduce((a,b) => { a.push(b); return a }, [ primer ])
    var failed = false
    for (var i=0;i<functions.length;i++){
      let fx = functions[i]
      await te_run_tests(fx, curr_package)
      if (deserialize('ts').test_status[fx].approved){
        curr_package = deserialize('ts').last_test_output
      } else {
        failed = true
        console.log(`BuildError: pipeline build failed at function: ${fx}. Duration: ${elapsed_secs(pipeline.started)} secs.`)
        break
      }
    }
    delete_handle('ts')
    if (!failed){
      pipeline.can_run = true;
      pipeline = await run_pipeline(pipeline);
    }
  } catch(err){
    console.log(`BuildError: pipeline not properly constructed. Duration: ${elapsed_secs(pipeline.started)} secs.`)
  }
  return pipeline
}

const run_pipeline = async (pipeline) => {
  // run pipeline asynchronously
  pipeline.started = now()
  if (pipeline.can_run){
    var curr_package,
        curr_package_,
        fx,
        no_errors = true
    for (var index=0;index<pipeline.process.length;index++){
      let step = pipeline.process[index];
      if (index === 0){
        [fx, curr_package] = step
        try {
          curr_package_ = eval(curr_package).output;
          if (curr_package_){ curr_package = curr_package_ }
        } catch(err){ }
      } else {
        fx = step
      }
      curr_package = await eval(fx)(curr_package);
      if (!curr_package){
        no_errors = false
        break
      }
    }
    if (no_errors){
      pipeline.output = curr_package
      pipeline.executed = true
      pipeline.can_run = false
      console.log(`Pipeline executed successfully (check trace for function-specific errors). Duration: ${elapsed_secs(pipeline.started)} secs.`)
    }
  } else {
    console.log(`RuntimeError: please build this pipeline first. Duration: ${elapsed_secs(pipeline.started)} secs.`)
  }
  return pipeline
}

const run_workflow = async (workflow) => {
  // run workflow asynchronously
  if (workflow.pipelines){
    workflow.started = now()
    var n_executed = 0,
        no_errors = true,
        curr_pipeline = null,
        index = -1
    while ( n_executed < workflow.pipelines.length && no_errors ){
      index++;
      curr_pipeline = eval(workflow.pipelines[index]);
      curr_pipeline = curr_pipeline.pipelines ? await run_workflow(curr_pipeline) : await build_pipeline(curr_pipeline);
      if (curr_pipeline.executed){
        n_executed++
      } else {
        no_errors = false
      }
    }
    if (no_errors){
      console.log(`Workflow executed successfully in ${elapsed_secs(workflow.started)} secs.`)
      workflow.output = curr_pipeline.output
      workflow.executed = true
    } else {
      console.log(`Workflow halted due to failed pipeline: ${workflow.pipelines[index]} (${index+1} of ${workflow.pipelines.length}). Duration: ${elapsed_secs(workflow.started)} secs.`)
    }
  }
  return workflow
}

const build_workflow = async (workflow) => {
  // build workflow asynchronously
  return await run_workflow(workflow)
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
  // new Test Module (Test Register)
  constructor (){
    super()
    this.options = { verbose : true }
  }
}

testEngine = new TestModule() // Internal Test Module

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

}

const _Pipeline = (process) => new Pipeline(process)

class Workflow {
  // Sequential pipeline execution model. Also supports workflow piping.
  constructor (pipelines) {
    this.pipelines = pipelines
    this.output = null
    this.executed = false
    this.started = null
  }
}

const _Workflow = (pipelines) => new Workflow(pipelines)

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

exports.flags = flags
exports.testEngine =  testEngine
exports.fetch_flag_inline = _fetch_flag_inline
exports.MutableState = _MutableState
exports.now = now
exports.elapsed_secs = elapsed_secs
exports.pt_string_only = pt_string_only
exports.pt_number_only = pt_number_only
exports.pt_object_only = pt_object_only
exports.array_equals = array_equals,
exports.Pipeline = _Pipeline
exports.Workflow = _Workflow
exports.context_switch = context_switch
exports.build_pipeline = build_pipeline
exports.run_pipeline = run_pipeline
exports.build_workflow = build_workflow
exports.run_workflow = run_workflow
exports.serialize = serialize
exports.deserialize = deserialize
exports.delete_handle = delete_handle
