'use strict';


// whitelist of properties to keep from raw CSV
const whitelist = [
    'Date/Time',
    'Trip ID',
    'Type',
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
// properties to use in the 'pay' object in each trip
const payKeys = [
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
        } else console.info(`duplicate file detected & ignored: ${name}`);
    }
    // after all files have been imported, compile & sort data
    return await Promise.all(promises)
        .then(data => compileTrips(data))
        .then(data => reintroduceTips(data))
        .finally(logRemovedTrips)
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
    if (trips.length == 0) {
        console.info(`statement detected with no trips, will be ignored`)
        return [];
    }
    // discovers irrelevant properties & adds them to an array
    let junkKeys = Object.keys(trips[0]).filter((v) => {
        if (!whitelist.includes(v)) return true;
    });
    // replaces old properties with more simply named ones in the new 'pay' object
    let oldKeys = whitelist.slice(3);
    for (let trip of trips) {
        for (let key of junkKeys) delete trip[key];
        trip.dateTime = new Date(trip['Date/Time']);
        delete trip['Date/Time'];
        trip.id = trip['Trip ID'];
        delete trip['Trip ID'];
        trip.type = trip.Type;
        delete trip.Type;
        trip.pay = {};
        for (let i=0; i<payKeys.length; i++) {
            trip.pay[payKeys[i]] = toNumber(trip[oldKeys[i]]);
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
function cleanTrips(/**@type {{dateTime:Date,pay:{}}[]}*/trips) {
    for (let i=trips.length-1; i>-1; i--) {
        let noBase = trips[i].pay.base == 0;
        let noCancel = trips[i].pay.cancel == 0;
        if (noBase && noCancel) removedTrips.push(trips.splice(i, 1)[0]);
    }
    return trips;
}
// compiles and sorts trips by date
function compileTrips(/**@type {{dateTime:Date,pay:{}}[][]}>>}*/data) {
    /**@type {{dateTime:Date,pay:{}}[]}*/
    let trips = [];
    data.forEach(d => d.forEach(t => trips.push(t)));
    trips.sort((a, b) => a.dateTime - b.dateTime);
    return trips;
}
// logs trips removed from the dataset
function logRemovedTrips() {
    if (removedTrips.length != 0) {
        let s = 's';
        if (removedTrips.length == 1) s = '';
        console.log('Removed ' + removedTrips.length + ' trip' + s + ' from the dataset:');
        console.log(removedTrips);
    }
}
// puts tips from 'removed trips' back into the proper trip in the dataset
function reintroduceTips(/**@type {Array}*/trips) {
    let badTrips = [];
    for (let tip of removedTrips) {
        const i = trips.findIndex((trip) => trip.id == tip.id);
        if (i == -1) {
            badTrips.push(tip);
        } else {
            trips[i].pay.tip += tip.pay.tip;
            trips[i].pay.total += tip.pay.tip;
        }
        
    }
    removedTrips = badTrips;
    return trips;
}


exports.processFiles = processFiles;

// exports for tests
exports.parseCSV = parseCSV;
exports.cleanProperties = cleanProperties;
exports.cleanTrips = cleanTrips;
exports.compileTrips = compileTrips;
exports.reintroduceTips = reintroduceTips;


// need to change some things around to accomodate adding trips to the dataset
// return an object containing both new trips and tips covering trips not in the new trips set 