'use strict';

exports.processFiles = processFiles;


// whitelist of properties to keep from raw CSV
var whitelist = [
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
];
// properties to use in the fare object in each trip
var fareKeys = [
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
];
// holds all removed trips for review
var removedTrips = []


// cleans, compiles, sorts, and returns data in a promise
async function processFiles(/**@type {FileList}*/files) {
    removedTrips = []
    var promises = [];
    // checks for duplicate files, imports the rest
    var dupes = [];
    for (let i=0; i<files.length; i++) {
        let name = files[i].name.slice(0,62);
        if (!dupes.some(n => n == name)) {
            dupes.push(name);
            promises.push(importFile(files[i]));
        } else console.log('duplicate file detected');
    }
    // after all files have been imported, compile & sort data
    return await Promise.all(promises)
        .then(data => compileTrips(data))
        //.finally(logRemovedTrips)// for debugging purposes
}
// reads file contents, removes irrelevant data, returns it in a promise
async function importFile(/**@type {File}*/file) {
    return await file.text()
        .then(CSVtext => parseCSV(CSVtext))
        .then(trips => cleanProperties(trips))
        .then(trips => cleanTrips(trips));
}
// converts CSV data to an array of objects
function parseCSV(/**@type {String}*/CSVtext) {
    var arr = CSVtext.split('\n');
    var headers = arr.slice(0, 1).toString().split(',');
    arr = arr.slice(1, -1).map((row) => {
        let values = row.split(',');
        let date = values[3] + ',' + values[4] + ',' + values[5];
        let rest = values.slice(6);
        values = values.slice(0, 3);
        values.push(date);
        for (let v of rest) values.push(v);
        for (let i in values) values[i] = values[i].slice(1, -1);
        let el = headers.reduce((object, header, index) => {
            object[header] = values[index];
            return object;
        }, {})
        return el;
    })
    return arr;
}
// removes irrelevant properties from trip objects, converts strings to numbers
function cleanProperties(/**@type {{}[]}*/trips) {
    // discovers irrelevant properties & adds them to an array
    let junkKeys = Object.keys(trips[0]).filter((v) => {
        if (!whitelist.includes(v)) return true;
    });
    // replaces old properties with more simply named ones in the new 'fare' object
    let oldKeys = whitelist.slice(1);
    for (let trip of trips) {
        for (let key of junkKeys) delete trip[key];
        trip.dateTime = new Date(trip['Date/Time']);
        delete trip['Date/Time'];
        trip.fare = {};
        for (let i=0; i<fareKeys.length; i++) {
            trip.fare[fareKeys[i]] = toNumber(trip[oldKeys[i]]);
            delete trip[oldKeys[i]];
        }
    }
    return trips;
}
//converts currency string with '$' into integer representing cents
function toNumber(/**@type {String}*/n) {
    if (n == undefined) var result = 0;
    else if (n == '') var result = 0;
    else var result = parseInt(parseFloat(n.slice(1)) * 100);
    return result;
}
// removes trips without a base fare or cancellation fee
function cleanTrips(/**@type {{dateTime:Date,fare:{}}[]}*/trips) {
    for (let i=trips.length-1; i>-1; i--) {
        let noBase = trips[i].fare.base == 0;
        let noCancel = trips[i].fare.cancel == 0;
        if (noBase && noCancel) removedTrips.push(trips.splice(i, 1)[0]);
    }
    return trips;
}
// compiles and sorts trips by date
function compileTrips(/**@type {{dateTime:Date,fare:{}}[][]}>>}*/data) {
    /**@type {{dateTime:Date,fare:{}}[]}*/
    let trips = [];
    data.forEach(d => d.forEach(t => trips.push(t)));
    trips.sort((a, b) => a.dateTime - b.dateTime);
    return trips;
}
// logs trips removed from the dataset
function logRemovedTrips() {
    if (removedTrips != []) {
        let s = 's';
        if (removedTrips.length == 1) s = '';
        console.log('Removed ' + removedTrips.length + ' trip' + s + ' from the dataset:');
        console.log(removedTrips);
    }
}