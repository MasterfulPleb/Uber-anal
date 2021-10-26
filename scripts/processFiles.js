exports.processFiles = processFiles

const fs = require('fs/promises')

let removedTrips = []

//cleans, compiles, sorts, and returns data in a promise
function processFiles(files) {
    return new Promise((resolve, reject) => {
        let arr = []
        //asynchronously imports & cleans data
        for (let f of files) {
            let iteration = importFile(f.path)
            arr.push(iteration)
        }
        //compiles & sorts data
        Promise.all(arr)
        .then(data => compileTrips(data))
        .then(d => resolve(d))
        .catch(e => {
            console.log('processing fucked up: ' + e.message)
            reject(e.message)
        })
        .finally(logRemovedTrips)
    })
}
//imports cleaned data, returns promise with cleaned data
function importFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath)
        .then(data => parseCSV(data))
        .then(d => cleanProperties(d))
        .then(d => cleanTrips(d))
        .then(d => resolve(d))
        .catch(e => {
            console.log('Issue with fs.readFile operation: ' + e.message)
            reject()
        })
    })
}
//converts data in CSV to an array of objects
function parseCSV(data) {
    let arr = data.toString().split('\n')
    let headers = arr.slice(0, 1).toString().split(',')
    arr = arr.slice(1, -1).map((row) => {
        let values = row.split(',')
        let date = values[3] + ',' + values[4] + ',' + values[5]
        let rest = values.slice(6)
        values = values.slice(0, 3)
        values.push(date)
        for (let v of rest) values.push(v)
        for (let i in values) values[i] = values[i].slice(1, -1)
        let el = headers.reduce((object, header, index) => {
            object[header] = values[index]
            return object
        }, {})
        return el
    })
    return arr
}
//removes unused properties from trip objects, converts strings to js objects
function cleanProperties(arr) {
    let whitelist = [
        'Date/Time',
        'Fare Base',
        'Fare Cancellation',
        'Fare Distance',
        'Fare Minimum Fare Supplement',
        'Fare Long Pickup Distance',
        'Fare Long Pickup Time',
        'Fare Surge',
        'Fare Time',
        'Fare Wait Time At Pickup',
        'Promotion Quest',
        'Other Earnings Share Adjustment',
        'Tip',
        'Total'
    ]
    let fareKeys = [
        'base',
        'cancel',
        'distance',
        'minFareSupplement',
        'lPDistance',
        'lPTime',
        'surge',
        'time',
        'waitTime',
        'promo',
        'other',
        'tip',
        'total',
    ]
    let junk = Object.keys(arr[0]).filter((v) => {
        if (!whitelist.includes(v)) return true
    })
    let dKeys = whitelist.slice(1)
    for (let t of arr) {
        t.dateTime = new Date(t['Date/Time'])
        delete t['Date/Time']
        t.fare = {}
        for (let j of junk) delete t[j]
        for (let i in fareKeys) {
            t.fare[fareKeys[i]] = toNumber(t[dKeys[i]])
            delete t[dKeys[i]]
        }
    }
    return arr
}
//removes trips with 0 income
function cleanTrips(arr) {
    for (i = arr.length - 1; i > -1; i--) {
        let base = arr[i].fare.base == 0
        let cancel = arr[i].fare.cancel == 0
        if (base && cancel) removedTrips.push(arr.splice(i, 1)[0])
    }
    return arr
}
//converts string with $ into js number
function toNumber(n) {
    if (n == undefined) var result = 0
    else if (n == '') var result = 0
    else var result = parseInt(parseFloat(n.slice(1)) * 100)
    return result
}
//logs trips removed from the dataset
function logRemovedTrips() {
    if (removedTrips != []) {
        let s = 's'
        if (removedTrips.length == 1) s = ''
        console.log('Removed ' + removedTrips.length + ' trip' + s + ' from the dataset:')
        console.log(removedTrips)
        removedTrips = []
    }
}
//compiles and sorts trips by date
function compileTrips(data) {
    let arr = []
    data.forEach(d => d.forEach(t => arr.push(t)))
    arr.sort((a, b) => a.dateTime - b.dateTime)
    return arr
}