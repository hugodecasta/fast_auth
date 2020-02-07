//-----------------------------------------------------------------------------
// Copyright (C) 2018 Hugo Castaneda
// Licensed under the MIT license.
// See LICENSE.md file in the project root for full license information.
//-----------------------------------------------------------------------------

'use strict'

const colors = require('colors')
const fs = require('fs')

const FastAuth = require('./index')

// ---------------------------------------------------------------
// ----------------------------------- TESTS DATA INTERNAL -------

let fastauth = null
let dir = __dirname+'/auth_data'

if(fs.existsSync(dir)) {
    deleteFolderRecursive(dir)
}

let testMap = {}

// -------------------------------------------------------------------------------
// -------------------------------------- TESTS DEFINITION -----------------------

function beforeMethod() {
    fastauth = new FastAuth(dir,'testerP','testerS')
}

function afterMethod() {
    deleteFolderRecursive(dir)
}

function deleteFolderRecursive(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

// ----------------------------------------
testMap['KEYS'] = {}
testMap['TOKEN'] = {}

testMap['KEYS']['existance'] = async function() {
    let passed = fastauth.get_key_data('maclef') == null
    passed &= fastauth.create_key({},'maclef') != null
    passed &= fastauth.create_key({},'maclef') == null
    passed &= fastauth.get_key_data('maclef') != null
    passed &= fastauth.remove_key('maclef')
    passed &= !fastauth.remove_key('maclef')

    return passed
}

testMap['KEYS']['de activate key'] = async function() {

    let passed = fastauth.create_key({},'maclef') != null
    passed &= fastauth.get_key_data('maclef') != null
    passed &= fastauth.get_key_data('maclef').set_meta('active',false)
    passed &= fastauth.get_key_data('maclef') == null

    return passed
}

var key = null
testMap['KEYS']['get auth data'] = async function() {
    
    let auth_data = {'api1':0,'api2':1}
    key = fastauth.create_key(auth_data)

    let key_data = fastauth.get_key_data(key)

    let passed = key_data.get_data('api1') == 0
    passed &= key_data.get_data('api2') == 1
    passed &= key_data.get_data('api3') === undefined

    return passed

}

testMap['KEYS']['alter auth data'] = async function() {

    let key_data = fastauth.get_key_data(key)

    let passed = key_data.get_data('api2') == 1
    passed &= key_data.set_data('api2',3)
    passed &= key_data.get_data('api2') == 3
    passed &= key_data.set_data('api2',null)
    passed &= key_data.get_data(key,'api2') == null
    passed &= key_data.set_data('api2',undefined)
    passed &= key_data.get_data(key,'api2') == undefined

    return passed

}

// ----------------------------------------

testMap['TOKEN']['token exists'] = async function() {

    let passed = fastauth.key_token(key) == null
    let tt = fastauth.get_token(key,Date.now()*60*60)
    passed &= fastauth.key_token(key) == tt
    passed &= fastauth.set_token(key,null)
    passed &= fastauth.key_token(key) == null

    return passed

}

var token = null
testMap['TOKEN']['connect token'] = async function() {

    let passed = fastauth.key_token(key) == null

    token = fastauth.get_token(key,Date.now()+60*60*60)
    passed &= fastauth.key_token(key) == token

    return passed

}
testMap['TOKEN']['token auth data'] = async function() {

    let token_data = fastauth.get_token_data(token)

    let passed = token_data.get_data('api1') == 0
    passed &= token_data.get_meta('key') == key

    return passed

}
testMap['TOKEN']['token set auth data'] = async function() {

    let token_data = fastauth.get_token_data(token)
    let key_data = fastauth.get_key_data(key)

    let passed = token_data.set_data('api1','CACA')
    passed &= token_data.get_data('api1') == 'CACA'
    passed &= key_data.get_data('api1') == 0

    return passed

}
testMap['TOKEN']['token revoke'] = async function() {

    let passed = fastauth.get_token_data(token) != null
    passed &= fastauth.revoke_token(token)
    passed &= fastauth.get_token_data(token) == null
    passed &= fastauth.get_key_data(key).get_meta('key') == null

    return passed

}

var token1 = null
var token2 = null
testMap['TOKEN']['token time to live'] = async function() {

    let key1 = fastauth.create_key({},'key1')
    let key2 = fastauth.create_key({},'key2')

    token1 = fastauth.get_token(key1,Date.now()+4*1000)
    token2 = fastauth.get_token(key2,Date.now()+10*1000)

    return fastauth.get_token_data(token1).get_meta('key') == key1

}

testMap['TOKEN']['token time to live normal'] = async function() {

    let passed = fastauth.get_token_data(token1) != null
    passed &= fastauth.get_token_data(token2) != null

    return passed
}

testMap['TOKEN']['token time to live waiter first'] = async function() {

    return new Promise(ok=>{

        function exec() {

            let passed = fastauth.get_token_data(token1) == null
            passed &= fastauth.get_token_data(token2) != null

            ok(passed)
        }
    
        setTimeout(exec,4000)

    })
}

testMap['TOKEN']['token time to live waiter second'] = async function() {

    return new Promise(ok=>{

        function exec() {

            let passed = fastauth.get_token_data(token1) == null
            passed &= fastauth.get_token_data(token2) == null

            ok(passed)
        }
    
        setTimeout(exec,6000)

    })
}
testMap['TOKEN']['token extend setup'] = async function() {

    let key3 = fastauth.create_key({},'key3')
    let key4 = fastauth.create_key({},'key4')

    token1 = fastauth.get_token(key3,Date.now()+4*1000)
    token2 = fastauth.get_token(key4,Date.now()+4*1000)

    return fastauth.get_token_data(token1).get_meta('key') == key3

}

testMap['TOKEN']['token extend extend t1 but not t2'] = async function() {

    return new Promise(ok=>{
        function exec() {
            let passed = fastauth.get_token_data(token1) != null
            passed &= fastauth.get_token_data(token2) != null
            passed &= fastauth.extend_token(token1,Date.now()+4*1000)
            passed &= fastauth.get_token_data(token1) != null
            passed &= fastauth.get_token_data(token2) != null
            ok(passed)
        }
        setTimeout(exec,3000)
    })
}

testMap['TOKEN']['t1 extend should live but not t2'] = async function() {

    return new Promise(ok=>{
        function exec() {
            let passed = fastauth.get_token_data(token1) != null
            passed &= fastauth.get_token_data(token2) == null
            ok(passed)
        }
        setTimeout(exec,2000)
    })
}

testMap['TOKEN']['now t1 is dead too'] = async function() {

    return new Promise(ok=>{
        function exec() {
            let passed = fastauth.get_token_data(token1) == null
            passed &= fastauth.get_token_data(token2) == null
            ok(passed)
        }
        setTimeout(exec,3000)
    })
}

// -------------------------------------------------------------------------------
// ---------------------------------------------------------------
// -------------------------------------------------- MAIN -------

// ---------------------------------------------------------------
async function unitTest(testName, testObj, preindent) {
  try {
    let passed = await testObj()
    let passedStr = passed?'PASSED'.green:'FAILED'.red
    console.log(preindent,'--',testName,':',passedStr)
    return passed?[1,0]:[0,1]
  }
  catch(error) {
    console.log(preindent,'--',testName,':','ERROR'.red)
    console.log('  ',('ERROR: '+error).red)
    return [0,1]
  }
}
async function multiTest(testName, testObj, preindent) {
  let newindent = preindent+'/'+testName
  let score = [0,0]
  for(let subTestName in testObj) {
    let subTestObj = testObj[subTestName]
    let subScore = await test(subTestName, subTestObj, newindent)
    score[0] += subScore[0]
    score[1] += subScore[1]
  }
  return score
}
async function test(testName, testObj, preindent) {
  preindent = preindent==undefined?'':preindent
  if(typeof(testObj) == typeof({}))
    return await multiTest(testName, testObj, preindent)
  else
    return await unitTest(testName, testObj, preindent)
}
// ------------------

async function initTests(testMap) {
  try {
    await beforeMethod()
  }
  catch(error) {
    console.log(('Error in the "before method": '+error).red)
    return null
  }
  let score = await test('Main tests',testMap)
  try {
    await afterMethod()
  }
  catch(error) {
    console.log(('Error in the "after method": '+error).red)
    return null
  }
  return score
}

function sortMap(testObj,testArgs) {
  if(testArgs.length == 0)
    return testObj
  let newTestObject = {}
  for(let subTestName in testObj) {
    let subTestObj = testObj[subTestName]
    if(testArgs.indexOf(subTestName)>-1) {
      newTestObject[subTestName] = subTestObj
    }
    else if(typeof(subTestObj) == typeof({})) {
      let newSubObject = sortMap(subTestObj,testArgs)
      if(Object.keys(newSubObject).length > 0)
        newTestObject[subTestName] = newSubObject
    }
  }
  return newTestObject
}

let testArgs = process.argv
testArgs.splice(0,2)
initTests(sortMap(testMap,testArgs)).then(function(fullScore) {

  if(fullScore == null) {
    console.log('\nError one test set'.red)
    return
  }

  let testPassedStr = fullScore[1]>0?
    (fullScore[0]==0?'FAILED'.red:'FAILED'.yellow):
    'PASSED'.green
  console.log('\nFull test:',testPassedStr)
  console.log('\nPASSED:',fullScore[0],'\nFAILED:',fullScore[1])

})