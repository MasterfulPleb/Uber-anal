exports.processFiles = processFiles

const fs = require('fs/promises')

let removedTrips = []

//cleans, compiles, sorts, and returns data in a promise
async function processFiles(files) {
    return new Promise((resolve, reject) => {
        let arr = []
        //asynchronously imports & cleans data
        for (i = 0; i < files.length; i++) {
            let iteration = importFile(files[i].path)
            arr.push(iteration)
        }
        //compiles & sorts data
        Promise.all(arr)
        .then(data => resolve(compileTrips(data)))
        .catch(e => {
            console.log('processing fucked up: ' + e.message)
            reject(e.message)
        })
        .finally(logRemovedTrips)
    })
}
//imports & cleans data, returns promise with cleaned data
function importFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath)
        .then(data => resolve(parseAndClean(data)))
        .catch(e => {
            console.log('Issue with fs.readFile operation: ' + e.message)
            reject()
        })
    })
}
//returns parsed & cleaned trips
function parseAndClean(data) {
    let d = parseCSV(data)
    d = cleanProperties(d)
    d = cleanTrips(d)
    return d
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
        for (i = 0; i < rest.length; i++) values.push(rest[i])
        for (i = 0; i < values.length; i++) {
            values[i] = values[i].slice(1, -1)
        }
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
    let whitelist = ['Date/Time'
        ,'Fare Base'
        ,'Fare Cancellation'
        ,'Fare Distance'
        ,'Fare Minimum Fare Supplement'
        ,'Fare Long Pickup Distance'
        ,'Fare Long Pickup Time'
        ,'Fare Surge'
        ,'Fare Time'
        ,'Fare Wait Time At Pickup'
        ,'Promotion Quest'
        ,'Other Earnings Share Adjustment'
        ,'Tip'
        ,'Total'
    ]
    let junk = Object.keys(arr[0]).filter((v) => {
        if (!whitelist.includes(v)) return true
    })
    let dValues = whitelist.slice(1)
    let tCount = arr.length
    let jCount = junk.length
    let dValuesCount = dValues.length
    for (i = 0; i < tCount; i++) {
        for (j = 0; j < jCount; j++) {
            delete arr[i][junk[j]]
        }
        for (j = 0; j < dValuesCount; j++) {
            arr[i][dValues[j]] = toNumber(arr[i][dValues[j]])
        }
        arr[i]['Date/Time'] = new Date(arr[i]['Date/Time'])
    }
    return arr
}
//removes trips with 0 income
function cleanTrips(arr) {
    for (i = arr.length - 1; i > -1; i--) {
        let base = arr[i]['Fare Base'] == 0
        let cancel = arr[i]['Fare Cancellation'] == 0
        if (base && cancel) removedTrips.push(arr.splice(i, 1)[0])
    }
    return arr
}
//converts string with $ into js number
function toNumber(n) {
    let result
    if (n == undefined) {
        result = 0
    } else if (n == '') {
        result = 0
    } else {
        result = parseInt(parseFloat(n.slice(1)) * 100)
    }
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
    arr.sort((a, b) => a['Date/Time'] - b['Date/Time'])
    return arr
}