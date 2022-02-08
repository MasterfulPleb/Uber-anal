'use strict';

const { addTime } = require('/UberAnal/scripts/utility.js');
const { Settings } = require('/UberAnal/scripts/settings.js');


/**@description breakdown of pay recieved in a trip*/
class Pay {
    constructor(pay) {
        /**@type {Number}*/this.base = pay.base;
        /**@type {Number}*/this.cancel = pay.cancel;
        /**@type {Number}*/this.lPTime = pay.lPTime;
        /**@type {Number}*/this.lPDistance = pay.lPDistance;
        /**@type {Number}*/this.waitTime = pay.waitTime;
        /**@type {Number}*/this.time = pay.time;
        /**@type {Number}*/this.distance = pay.distance;
        /**@type {Number}*/this.minFareSupplement = pay.minFareSupplement;
        /**@type {Number}*/this.other = pay.other;
        /**@type {Number}*/this.promo = pay.promo;
        /**@type {Number}*/this.surge = pay.surge;
        /**@type {Number}*/this.tip = pay.tip;
        /**@type {Number}*/this.total = pay.total;
        for (let key in this) if (isNaN(this[key])) this[key] = 0;
    }
}
/**@description class for storing data about a trip before actually building the trip*/
class PreTrip {
    dayStart = false;
    dayEnd = false;
    constructor(trip) {
        /**@type {Date}*/this.dateTime = trip.dateTime;
        /**@type {string}*/this.id = trip.id;
        /**@type {string}*/this.type = trip.type;
        /**@type {Pay}*/this.pay = new Pay(trip.pay);
    }
    /**@description converts CSV string into trips*/
    static createFromCSV(/**@type {String}*/CSVtext) {
        // parses CSV
        var arr = CSVtext.split('\n');
        var headers = arr.slice(0, 1).toString().split(',');
        const parsedCSV = arr.slice(1, -1).map((row) => {
            let values = row.split(',');
            const date = values[3] + ',' + values[4] + ',' + values[5];
            const rest = values.slice(6);
            values = values.slice(0, 3);
            values.push(date);
            for (const v of rest) values.push(v);
            for (const i in values) values[i] = values[i].slice(1, -1);
            const el = headers.reduce((object, header, index) => {
                object[header] = values[index];
                return object;
            }, {})
            return el;
        })
        if (parsedCSV.length == 0) {
            console.info(`statement detected with no trips, will be ignored`);
            return {
                trips: [],
                tips: [],
                removed: []
            };
        }
        // removes unneeded properties and converts strings to numbers/dates
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
        const newFareKeys = [
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
        const unneededKeys = Object.keys(parsedCSV[0]).filter(key => !whitelist.includes(key));
        // replaces old keys with better named ones
        const oldFareKeys = whitelist.slice(3);
        for (const trip of parsedCSV) {
            trip.dateTime = new Date(trip['Date/Time']);
            trip.id = trip['Trip ID'];
            trip.type = trip.Type;
            trip.pay = {};
            for (let i=0; i<newFareKeys.length; i++) {
                if (trip[oldFareKeys[i]] == undefined) trip.pay[newFareKeys[i]] = NaN;
                else trip.pay[newFareKeys[i]] =
                    Math.round(parseFloat(trip[oldFareKeys[i]].slice(1)) * 100);
            }
            unneededKeys.forEach(key => delete trip[key]);
            whitelist.forEach(key => delete trip[key])
        }
        // separates tips without a base trip, and erraneous trips
        const tips = [];
        const removed = [];
        parsedCSV.forEach((trip, i) => {
            if (trip.pay.base == 0 && trip.pay.cancel == 0) {
                if (trip.pay.tip > 0) tips.push(parsedCSV.splice(i, 1)[0]);
                else removed.push(parsedCSV.splice(i, 1)[0]);
            }
        });
        return {
            trips: PreTrip.create(parsedCSV),
            tips: PreTrip.create(tips),
            removed: PreTrip.create(removed)
        };
    }
    /**@description converts an array of trip data to PreTrips*/
    static create(trips) {
        const arr = [];
        for (const trip of trips) {
            arr.push(new PreTrip(trip))
        }
        return arr;
    }
}
/**@description part of a trip's model representing seconds between key times*/
class Durations {
    /**@type {Number}*/pickup;
    /**@type {Number}*/wait;
    constructor(trip) {
        // calculates time paid during trip in seconds (fare, long pickup, long wait)
        const pay = trip.pay;
        const cancellation = pay.cancel > 0;
        const rates = Settings.marketData[trip.type];
        if (!cancellation) this.fare = Math.round(pay.time / rates.minute);
        else {
            // this is where long cancels are handled
            // cancels inherit average pickup times but for longer cancels, extra time is accounted for in fare
            // Comfort trips apparently have a higher base cancel rate if the driver initiates the cancel
            // i try to account for that here but it's a poor attempt
            let extra;
            if (rates.cancel.driver > rates.cancel.rider && pay.cancel >= rates.cancel.driver) {
                extra = (pay.cancel - rates.cancel.driver);
            } else extra = (pay.cancel - rates.cancel.rider);
            // extra assumes 1 mile driven for every 2 minutes waited and calculates duration accordingly
            // to change the ratio change the integers below to the same value. ratio = 1 mile : x seconds
            this.fare = Math.round( extra*120 / (rates.cancel.minute*120 + rates.cancel.mile) );
        }
        this.longPickup = pay.lPTime > 0 ?
            Math.round(pay.lPTime / rates.longPickup.minute) : 0;
        this.longWait = pay.waitTime > 0 ?
            Math.round(pay.waitTime / rates.wait) : cancellation ?
                this.longWait = 240 : 0;
                // change this value to adjust canceled trip base time
                // currently 240s + 2m + default pickup
    }
}
/**@description key times of a trip*/
class Times {
    /**@type {Date}*/#start;
    /**@type {Date}*/wait;
    /**@type {Date}*/fare;
    /**@type {Date}*/end;
    #model;
    constructor(model) { this.#model = model; }
    get start() { return this.#start; }
    set start(date) {
        this.#start = date;
        const durations = this.#model.durations;
        this.wait = addTime(date, durations.pickup + durations.longPickup);
        this.fare = addTime(this.wait, durations.wait + durations.longWait);
        this.end = addTime(this.fare, durations.fare);
    }
}
/**@description model for an individual trip*/
class TModel {
    constructor(trip) {
        const pay = trip.pay;
        this.cancellation = pay.cancel > 0;
        this.longPickup = pay.lPTime > 0;
        this.longWait = pay.waitTime > 0;
        const d = this.durations = new Durations(trip);
        this.paidTime = d.fare + d.longPickup + d.longWait;
        this.blockStart = trip.dayStart;
        this.blockEnd = trip.dayEnd;
        this.times = new Times(this);
    }
}
/**@description an individual trip*/
class Trip extends PreTrip {
    constructor(trip) {
        super(trip);
        this.model = new TModel(trip);
    }
    /**
     * @type {{ trips: Trip[], tips: PreTrip[], removed: PreTrip[] }}
     * @description reference to all trips that exist
    */
    static all = { trips: [], tips: [], removed: [] };
    /**@description converts an array of PreTrips to Trips*/
    static configure(/**@type {PreTrip[]}*/trips) {
        trips.sort((a, b) => a.dateTime - b.dateTime)
        /**@type {{ date: Date, trips: PreTrip[] }}*/
        let block = { trips: [] };
        for (const trip of trips) {
            let offsetDate = trip.dateTime
            if (offsetDate.getHours() < Settings.offset) {
                offsetDate = addTime(trip.dateTime, -86400);
            }
            offsetDate.setHours(0, 0, 0);
            if (block.trips.length == 0) {
                trip.dayStart = true;
                block.date = offsetDate;
                block.trips.push(trip);
                continue;
            }
            if (offsetDate == block.date) {
                block.trips.push(trip);
                continue;
            }
            block.trips[block.trips.length-1].dayEnd = true;
            block = { date: offsetDate, trips: [trip] };
        }
        for (const t in trips) trips[t] = new Trip(trips[t]);
        //Trip.trips = Trip.trips.concat(trips); // i dont think i actually need this
    }
}


/**@description processes a FileList into object containing trips*/
async function processFiles(/**@type {FileList}*/files) {
    const filenames = [];
    const imports = [];
    for (const file of files) {
        const name = file.name;
        if (!name.endsWith('.csv')) {
            console.info(`non-csv file detected and ignored: ${name}`);
            continue;
        }
        if (filenames.includes(name)) {
            console.info(`duplicate file detected & ignored: ${name}`);
            continue;
        }
        filenames.push(name);
        imports.push(file.text().then(CSVtext => PreTrip.createFromCSV(CSVtext)));
    }
    return Promise.all(imports).then(data => {
        /**@type {PreTrip[]}*/const trips = [];
        /**@type {PreTrip[]}*/const tips = [];
        /**@type {PreTrip[]}*/const removed = [];
        for (const obj of data) {
            obj.trips.forEach(trip => trips.push(trip));
            obj.tips.forEach(trip => tips.push(trip));
            obj.removed.forEach(trip => removed.push(trip));
        }
        tips.forEach((tip, i) => {
            const match = trips.find(trip => trip.id == tip.id);
            if (match == undefined) return;
            match.pay.tip += tip.pay.tip;
            tips.splice(i, 1);
        });
        if (tips.length > 0) {
            console.log(`${tips.length} tip${tips.length>1?'s':''} could not be matched to trips`);
            console.log(tips);
        }
        if (removed.length > 0) {
            console.log(`${removed.length} trip${removed.length>1?'s':''} were removed due to having no base, cancel, or tip`);
            console.log(removed);
        }
        if (Settings.automaticallyDetectOffset) Settings.detectOffset(trips);
        Trip.configure(trips);
        Trip.all.trips = Trip.all.trips.concat(trips);
        Trip.all.tips = Trip.all.tips.concat(trips);
        Trip.all.removed = Trip.all.removed.concat(trips);
        return {
            /**@type {Trip[]}*/trips: trips,
            tips: tips,
            removed: removed
        };
    })
}

exports.processFiles = processFiles;

// exports for intellisense
exports.PreTrip = PreTrip;
exports.Trip = Trip;