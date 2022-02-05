'use strict';

const { Settings } = require('/UberAnal/scripts/settings.js');
const { secondsBetween, addTime } = require('/UberAnal/scripts/utility.js');
const markets = require('/UberAnal/markets.json');


// part of a trip's model representing seconds between key points
class Durations {
    /**@type {Number}*/pickup;
    /**@type {Number}*/wait;
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
}
// 
class Times {
    /**@type {Date}*/#start;
    /**@type {Date}*/wait;
    /**@type {Date}*/fare;
    /**@type {Date}*/end;
    #model;
    constructor(model) {
        this.#model = model;
    }
    get start() {
        return this.#start;
    }
    set start(date) {
        this.#start = date;
        const durations = this.#model.durations;
        this.wait = addTime(date, durations.pickup + durations.longPickup);
        this.fare = addTime(this.wait, durations.wait + durations.longWait);
        this.end = addTime(this.fare, durations.fare);
    }
}
// time model for an individual trip
class TModel {
    constructor(trip) {
        const pay = trip.pay;
        this.cancellation = pay.cancel > 0;
        this.longPickup = pay.lPTime > 0;
        this.longWait = pay.waitTime > 0;
        const d = this.durations = new Durations(trip);
        this.paidTime = d.fare + d.longPickup + d.longWait;
        this.blockStart = false;
        this.blockEnd = false;
        this.times = new Times(this);
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
    static trips = [];
    // configures an array of trips 
    static configure = function(trips) {
        // if time difference between trips > 6 hours, mark as new day
        // due to the way trips are processed, this time doesnt really matter
        // todo - confirm that this time doesnt really matter
        // yeah it really doesnt matter, i should be detecting the day automatically with the offset setting
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
        ////////// replace above with... something
        for (const t in trips) trips[t] = new Trip(trips[t]);
        Trip.trips = Trip.trips.concat(trips);
        if (Settings.automaticallyDetectOffset) Settings.checkOffset(trips);
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
        this.startTime = trips[0].dateTime;
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
        let start = trips[0].dateTime;
        if (start.getHours() < Settings.offset) this.date = addTime(start, -86400).toDateString();
        else this.date = start.toDateString();
        /**@type {Trip[]}*/this.trips = trips;
        this.model = new BModel(trips);
        this.setDurations('max', false); // todo - review this setting and whether i would want it to be different when creating new blocks
        this.setTimes(false, true);
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
        const trips = this.trips;
        let collision = false;
        let badTrips = []; // logs unfixable trips to prevent shiftTimes() from infinitely looping
        let revisit = -1;
        for (let i = 0; i < trips.length; i++) {
            const trip = trips[i];
            const times = trip.model.times;
            // first trip
            if (i == 0) {
                times.start = trip.dateTime;
                continue;
            }
            const lastTripTimes = trips[i - 1].model.times;
            // trip accepted before last trip's fare started according to model
            if (lastTripTimes.fare > trip.dateTime) {
                /* Strict refers to whether statement times are loosely interpreted or taken literally.
                *  Statement times can be incorrect, so if loosely interpreted, will attempt to build a
                *   timeline where no trips overlap.
                *  However, this can lead to 'shifting' multiple trips into the future, in such a way
                *   that trips are accepted before it's possible to do so.
                *  If correctTrips is set to true, previous trip durations will be adjusted and 'i'
                *   decremented to readjust those trip's times and make things work smoothly.
                *  'correctTrips' can only be set to true if downtime is already calculated, and requires minmax.
                *  This should be the final form of the timeline, but strict interpretation should be used 
                *   for the purpose of finding breaks as the 'timeline shifting' makes it excessively hard
                *   due to the break soaking up the shifted time and appearing to be much smaller.
                *  Strict interpretation will not allow shifting, and in such cases, will find the
                *   latest time the trip could have started according strictly to the statement.
                */
                if (strict) {
                    times.start = addTime(trip.dateTime, trips[i-1].model.durations.fare);
                    collision = true;
                    continue;
                }
                if (!correctTrips) {
                    times.start = lastTripTimes.end;
                    collision = true;
                    continue;
                }
                // for debugging purposes
                if (minmax == '') throw console.error("'minmax' required when correctTrips is set to true");
                // if current index is an unfixable trip, skips shiftTimes() and just sets the times & moves on
                if (badTrips.includes(i)) {
                    times.start = lastTripTimes.end;
                    continue;
                }
                if (i != revisit) {
                    try {
                        // todo - build shiftTimes. probably into the Block class
                        i -= shiftTimes(/*block, */i, minmax);
                    } catch (stepsBack) {
                        revisit = i;
                        i -= stepsBack + 1;
                    } finally {
                        continue;
                    }
                }
                try {
                    i -= shiftTimes(/*block, */i, minmax, true);
                } catch {
                    badTrips.push(i);
                    i -= stepsBack + 1;
                    collision = true;
                } finally {
                    revisit = -1;
                    continue;
                }
            }
            // normal trip accepted during last trip
            if (lastTripTimes.end >= trip.dateTime) {
                times.start = lastTripTimes.end;
                continue;
            }
            // normal trip but after downtime
            times.start = trip.dateTime;
        }
        if (collision && visualWarnings) console.warn(`trip accepted before last fare time started on ${this.date}`);
    }
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
    splitAtBreaks(blocks, 4);
    debugger;
    findDowntime(blocks);

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
// finds breaks in blocks and splits them
function splitAtBreaks(/**@type {Block[]}*/blocks, passes=1) {
    for (let p = 1; p <= passes; p++) {
        console.groupCollapsed(`pass ${p}`); // for debugging purposes
        // sets limit to 2 hours first pass, 1 hour second pass, 40 mins third, 30 fourth...
        const limit = 7200 / p;
        for (const block of blocks) {
            const trips = block.trips;
            for (let i = 0; i < trips.length - 1; i++) { // excludes last trip in each block
                const gap = secondsBetween(trips[i].model.times.end, trips[i+1].model.times.start);
                if (gap > limit) {
                    console.warn(`break found on ${block.date}`); // for debugging purposes
                    trips[i].model.blockEnd = true;
                    trips[i+1].model.blockStart = true;
                }
            }
        }
        console.groupEnd(); // for debugging purposes
        for (let i = blocks.length; i > 0; i--) {
            const block = blocks.shift();
            // searches for the index of the first block end, and if it is the current block end, continue
            if (block.trips.findIndex(trip => trip.model.blockEnd == true) == block.trips.length - 1) {
                blocks.push(block);
                continue;
            }
            let arr = [];
            for (const trip of block.trips) {
                arr.push(trip);
                if (trip.model.blockEnd) {
                    blocks.push(new Block(arr.splice(0)));
                }
            }
        }
    }
}
// 
function findDowntime(/**@type {Block[]}*/blocks) { // 1 pass 'min' i guess
    for (const block of blocks) {
        debugger;
        const trips = block.trips;
        block.setDurations('', false);
        block.setTimes(false);
        
    }
}




exports.simulation = simulation;
//exports.addTrips = addTrips;
exports.secondsBetween = secondsBetween;

// exports for tests
exports.Block = Block;
exports.Trip = Trip;



// if start time is less than the offset chosen in settings after midnight, set block as previous day
// i can probably automatically detect this setting

// for very long breaks that couldnt possibly be downtime (2+ hours) dont count as downtime, but something else