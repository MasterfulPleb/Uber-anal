'use strict';

const { Settings } = require('/UberAnal/scripts/settings.js');
const markets = require('/UberAnal/markets.json');


// part of a trip's model representing seconds between key points
class Durations {
    pickup;
    wait;
    constructor(trip) {
        // calculates time paid during trip in seconds (fare, long pickup, long wait)
        const pay = trip.pay;
        const cancellation = pay.cancel > 0;
        const rates = markets[Settings.market][trip.type];
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
    /*get pickup() {
        return 'duh'
    }
    get wait() {
        return 'duh'
    }*/
}
// time model for an individual trip
class TModel {
    times = {
        /**@type {Date}*/start:null,
        /**@type {Date}*/wait:null,
        /**@type {Date}*/fare:null,
        /**@type {Date}*/end:null
    };
    constructor(trip) {
        const pay = trip.pay;
        this.cancellation = pay.cancel > 0;
        this.longPickup = pay.lPTime > 0;
        this.longWait = pay.waitTime > 0;
        const d = this.durations = new Durations(trip);
        this.paidTime = d.fare + d.longPickup + d.longWait;
        this.blockStart = false;
        this.blockEnd = false;
    }
}
// a trip
class Trip {
    /**@type {Date}*/dateTime;
    /**@type {Number}*/pay;
    /**@type {String}*/id;
    /**@type {String}*/type;
    /**@type {Boolean}*/dayStart;
    /**@type {Boolean}*/dayEnd;
    constructor(trip) {
        this.dateTime = trip.dateTime;
        this.pay = trip.pay;
        this.id = trip.id;
        this.type = trip.type;
        this.model = new TModel(trip);
        this.dayStart = trip.dayStart;
        this.dayEnd = trip.dayEnd;
    }
    // configures an array of trips 
    static configure = function(trips) {
        // if time difference between trips > 6 hours, mark as new day
        // due to the way trips are processed, this time doesnt really matter
        // todo - confirm that this time doesnt really matter
        const l = trips.length;
        trips[0].dayStart = true;
        trips[l-1].dayEnd = true;
        for (let i=1; i<l; i++) {
            const diff = secondsBetween(trips[i].dateTime, trips[i-1].dateTime);
            if (diff > 21600) {// 6 hours
                trips[i].dayStart = true;
                trips[i-1].dayEnd = true;
            } else {
                trips[i].dayStart = false;
                trips[i-1].dayEnd = false;
            }
        }
        for (const t in trips) trips[t] = new Trip(trips[t]);
    }
}
// the class Min & Max are based on
class MinMax {
    /**@type {BModel}*/#model;
    /**@type {Trip[]}*/#trips;
    /**@type {Date}*/#end;
    /**@type {Number}*/#downtime
    /**@type {Number}*/unpaidTime;
    /**@type {Number}*/baseUnaccountedTime;// all time that is not certain based on the statement
    /**@type {Number}*/unpaidPickup
    /**@type {Number}*/averagePickup
    /**@type {Number}*/unpaidWait
    /**@type {Number}*/averageWait
    constructor(trips, model) {
        this.#model = model;
        this.#trips = trips;
    }
    get end() {
        return this.#end;
    }
    // recalculates unpaidTime and baseUnaccountedTime when end time is changed
    set end(date) {
        this.unpaidTime = secondsBetween(this.#model.startTime, date) - this.#model.paidTime;
        let BUT = this.unpaidTime;
        this.#trips.forEach(trip => {
            if (trip.model.longPickup) {
                BUT -= markets[Settings.market][trip.type].longPickup.threshold;
            }
            if (trip.model.longWait) BUT -= 120;
        });
        this.baseUnaccountedTime = BUT;
        // if earliest end time is not possible, shift it to be just possible, and reset
        if (BUT < 0) this.end = addTime(date, Math.abs(BUT));
        else this.#end = date;
    }
    get unaccountedTime() {
        // this represents only pickup and wait times that are not long
        return this.unpaidPickup + this.unpaidWait; // todo - this still isnt right...
    }
    get downtime() {
        return this.#downtime;
    }
    // recalculates pickups and waits when downtime is changed
    set downtime(num) {
        this.#downtime = num;
        const wWeight = this.#model.normalWaits * 120;
        let pWeight = 0;
        this.#trips.forEach(trip => {
            if (!trip.model.longPickup) {
                pWeight += markets[Settings.market][trip.type].longPickup.threshold;
            }
        });
        if (pWeight == 0 && wWeight == 0) { // no normal pickups or waits
            this.unpaidPickup = 0;
            this.averagePickup = 0;
            this.unpaidWait = 0;
            this.averageWait = 0;
            console.error(`block found with no normal pickups/waits @ ${this.#trips[0].dateTime.toDateString()}`);// for debugging purposes
            // hmmmmmmmmmmmmmmmmmmmmmmmm
        } else {
            const ut = this.baseUnaccountedTime - (this.downtime ?? 0);// todo - figure out what exactly downtime is here for
            this.unpaidPickup = Math.round(ut * pWeight/ (pWeight + wWeight));
            if (pWeight == 0) this.averagePickup = 0; // no normal pickups
            else this.averagePickup = Math.round(this.unpaidPickup / this.#model.normalPickups);
            this.unpaidWait = Math.round(ut * wWeight / (wWeight + pWeight));
            if (wWeight == 0) this.averageWait = 0; // no normal waits
            else this.averageWait = Math.round(this.unpaidWait / this.#model.normalWaits);
        }
    }
    initialize() {
        this.downtime = 0;
        if (this.averagePickup > 600) {
            let seconds = 0;
            this.#trips.forEach(trip => {
                if (!trip.model.longPickup) {
                    seconds += markets[Settings.market][trip.type].longPickup.threshold;
                }
            });
            this.downtime = this.unpaidPickup - seconds + this.unpaidWait - this.#model.normalWaits * 120
        }
        delete this.initialize;
    }
}
// 
class Min extends MinMax {
    constructor(/**@type {Trip[]}*/trips, model) {
        super(trips, model);
        const lastTrip = trips[trips.length - 1];
        let seconds = lastTrip.model.paidTime;
        if (lastTrip.model.longPickup) seconds += markets[Settings.market][lastTrip.type].longPickup.threshold;
        if (lastTrip.model.longWait) seconds += 120
        this.end = addTime(lastTrip.dateTime, seconds);
        // if end time is earlier than is possible, shift it to be just possible
        if (this.baseUnaccountedTime < 0) this.end = addTime(this.end, Math.abs(this.baseUnaccountedTime));
        this.initialize();
    }
}
// 
class Max extends MinMax {
    constructor(/**@type {Trip[]}*/trips, model) {
        super(trips, model);
        const lastTrip = trips[trips.length - 1];
        let seconds = lastTrip.model.paidTime + 120 + markets[Settings.market][lastTrip.type].longPickup.threshold;
        if (trips.length > 1) seconds += trips[trips.length - 2].model.durations.fare;
        this.end = addTime(lastTrip.dateTime, seconds);
        this.initialize();
    }
}
// time model for a block of trips
class BModel {
    /**@type {Date}*/startTime
    constructor(/**@type {Trip[]}*/trips) {
        this.startTime = trips[0].model.times.start = trips[0].dateTime;
        this.paidTime = 0;
        for (const trip of trips) this.paidTime += trip.model.paidTime;
        this.longPickups = trips.filter(trip => trip.model.longPickup).length;
        this.normalPickups = trips.length - this.longPickups;
        this.longWaits = trips.filter(trip => trip.model.longWait).length;
        this.normalWaits = trips.length - this.longWaits;
        this.min = new Min(trips, this);
        this.max = new Max(trips, this);
    }
}
// block of trips, generally representing a day
class Block {
    constructor(/**@type {Trip[]}*/trips) {
        this.date = trips[0].dateTime.toDateString();
        /**@type {Trip[]}*/this.trips = trips;
        this.model = new BModel(trips);
        this.setDurations('max', false); // todo - review this setting and whether i would want it to be different when creating new blocks
    }
    // splits trips into array of objects representing blocks, returns blocks
    static create = function(/**@type {Trip[]}*/trips) {
        const blocks = [];
        const arr = [];
        for (const trip of trips) {
            arr.push(trip);
            if (trip.dayEnd) {
                arr[0].model.blockStart = true;
                trip.model.blockEnd = true;
                blocks.push(new Block(arr.splice(0)));

            }
        }
        return blocks;
    }
    // sets pickup & wait durations for each trip
    setDurations(minmax, visualWarnings=true, throwOnWarnings=false) {
        /**@type {Min}*/const mm = this.model[minmax];
        for (const trip of this.trips) {
            const model = trip.model;
            if (model.longPickup) model.durations.pickup = 600;
            else model.durations.pickup = mm.averagePickup;
            if (model.longWait) model.durations.wait = 120;
            else model.durations.wait = mm.averageWait;
        }
        if (mm.averageWait == 120) {
            if (visualWarnings) console.warn(`${minmax} average times greater than allowable @ ${this.date}`);
            if (throwOnWarnings) throw 'meep';// its gotta throw something...
        }
    }
    // sets simulated times for each trip
    setTimes(visualWarnings=true, strict=false, correctTrips=false, minmax='') {
        /*const trips = this.trips;
        for (let i = 0; i < trips.length; i++) {
            const times = trips[i].model.times;
            if (i != 0) {
                const lastTripTimes = trips[i - 1].model.times;
                if (true) {

                }
            }
            const durations = trips[i].model.durations;

        }*/



    }
}


// returns difference in seconds between two date objects
function secondsBetween(date1, date2) {
    return Math.round(Math.abs( date1.getTime()-date2.getTime() )/1000);
}
// takes a date object and returns a new date object + seconds
function addTime(date, seconds) {
    return new Date(date.getTime() + seconds * 1000);
}

// adds new trips after simulation has already ran
function addTrips(days, newTrips) {
    // add new trips passed to this function from an event handler to the days array held by index.js
}

// models key times of trips
function simulation(trips) {
    configureMarket();
    Trip.configure(trips);
    const blocks = Block.create(trips);
    debugger;

    return blocks; // for testing
}
// converts dollars/minute values into pennies/second, others into pennies
function configureMarket() {
    for (const t in markets[Settings.market]) {
        const type = markets[Settings.market][t];
        for (const key in type) {
            if (key == 'minute' || key == 'wait') {
                type[key] *= 10/6;
            } else if (key == 'base' || key == 'mile' || key == 'minimum') {
                type[key] *= 100;
            } else {
                for (const key2 in type[key]) {
                    if (key2 == 'minute') {
                        type[key][key2] *= 10/6;
                    } else if (key2 != 'threshold') {
                        type[key][key2] *= 100;
                    } else type[key][key2] *= 60;
                }
            }
        }
    }
}





exports.simulation = simulation;
//exports.addTrips = addTrips;
exports.secondsBetween = secondsBetween;

// exports for tests
exports.Block = Block;