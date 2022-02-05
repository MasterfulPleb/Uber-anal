'use strict';

//const { Trip } = require('/UberAnal/scripts/simulation.new.js'); // for testing purposes - this provides Trip intelisense
const { addTime } = require('/UberAnal/scripts/utility.js');


class Settings {
    constructor() { }
    static market = 'Upstate NY';
    static darkmode = true;
    //static timezone = -5;
    static offset = 8; // where to break days in the charts - latest time worked after midnight
    static automaticallyDetectOffset = true;
    static checkOffset = function(/**@type {Trip[]}*/trips) {
        // this would handle more edge cases if i checked blocks instead of trips,
        // using block start and end times to inference different scenarios
        let offset = 0;
        for (const trip of trips.filter(trip => trip.dayEnd)) {
            const hours = addTime(trip.dateTime, trip.model.durations.fare +
                trip.model.durations.longWait + trip.model.durations.longPickup + 120 + 600 + 1800).getHours();
            if (hours + 1 > offset && hours + 1 <= 12) offset = hours + 1;
        }
        if (offset > 0 && offset < 12) offset++;
        Settings.offset = offset;
    }
}


exports.Settings = Settings;
