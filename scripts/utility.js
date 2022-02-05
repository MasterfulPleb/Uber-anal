'use strict'


// returns difference in seconds between two date objects
function secondsBetween(date1, date2) {
    return Math.round(Math.abs( date1.getTime()-date2.getTime() )/1000);
}
// takes a date object and returns a new date object + seconds
function addTime(date, seconds) {
    return new Date(date.getTime() + seconds * 1000);
}


exports.secondsBetween = secondsBetween;
exports.addTime = addTime;