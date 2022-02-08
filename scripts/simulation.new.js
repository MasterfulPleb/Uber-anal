'use strict';

const { Settings } = require('/UberAnal/scripts/settings.js');
const { secondsBetween, addTime } = require('/UberAnal/scripts/utility.js');


// the class Min & Max are based on
class MinMax {
    /**@type {BModel}*/#model;
    /**@type {Trip[]}*/#trips;
    /**@type {Date}*/#end;
    /**@type {Number}*/#downtime
    /**@type {Number}*/unpaidTime;
    /**@type {Number}*/baseUnaccountedTime; // all time that is not certain based on the statement
    /**@type {Number}*/unaccountedTime; // this represents only pickup and wait times that are not long
    /**@type {Number}*/unpaidPickup
    /**@type {Number}*/averagePickup
    /**@type {Number}*/unpaidWait
    /**@type {Number}*/averageWait
    #pWeight = 0;
    #wWeight = 0;
    constructor(trips, model) {
        this.#model = model;
        this.#trips = trips;
        this.#wWeight = this.#model.normalWaits * 120;
        this.#trips.forEach(trip => {
            if (!trip.model.longPickup) {
                this.#pWeight += Settings.marketData[trip.type].longPickup.threshold;
            }
        });
        this.maxUnaccountedTime = this.#pWeight + this.#wWeight;
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
                BUT -= Settings.marketData[trip.type].longPickup.threshold;
            }
            if (trip.model.longWait) BUT -= 120;
        });
        this.baseUnaccountedTime = BUT;
        // if earliest end time is not possible, shift it to be just possible, and reset
        if (BUT < 0) this.end = addTime(date, Math.abs(BUT));
        else this.#end = date;
    }
    get downtime() {
        return this.#downtime;
    }
    // recalculates pickups and waits when downtime is changed
    set downtime(num) {
        if (num > this.baseUnaccountedTime - this.maxUnaccountedTime) this.#downtime = num;
        else this.#downtime = this.baseUnaccountedTime - this.maxUnaccountedTime
        if (this.#pWeight == 0 && this.#wWeight == 0) { // no normal pickups or waits
            this.unpaidPickup = 0;
            this.averagePickup = 0;
            this.unpaidWait = 0;
            this.averageWait = 0;
            console.error(`block found with no normal pickups/waits @ ${this.#trips[0].dateTime.toDateString()}`);// for debugging purposes
            // hmmmmmmmmmmmmmmmmmmmmmmmm
        } else {
            this.unaccountedTime = this.baseUnaccountedTime - this.downtime;
            this.unpaidPickup = Math.round(this.unaccountedTime * this.#pWeight / (this.maxUnaccountedTime));
            if (this.#pWeight == 0) this.averagePickup = 0; // no normal pickups
            else this.averagePickup = Math.round(this.unpaidPickup / this.#model.normalPickups);
            this.unpaidWait = Math.round(this.unaccountedTime * this.#wWeight / (this.maxUnaccountedTime));
            if (this.#wWeight == 0) this.averageWait = 0; // no normal waits
            else this.averageWait = Math.round(this.unpaidWait / this.#model.normalWaits);
        }
    }
}
// 
class Min extends MinMax {
    constructor(/**@type {Trip[]}*/trips, model) {
        super(trips, model);
        const lastTrip = trips[trips.length - 1];
        let seconds = lastTrip.model.paidTime;
        if (lastTrip.model.longPickup) seconds += Settings.marketData[lastTrip.type].longPickup.threshold;
        if (lastTrip.model.longWait) seconds += 120
        this.end = addTime(lastTrip.dateTime, seconds);
        // if end time is earlier than is possible, shift it to be just possible
        if (this.baseUnaccountedTime < 0) this.end = addTime(this.end, Math.abs(this.baseUnaccountedTime));
        this.downtime = 0;
    }
}
// 
class Max extends MinMax {
    constructor(/**@type {Trip[]}*/trips, model) {
        super(trips, model);
        const lastTrip = trips[trips.length - 1];
        let seconds = lastTrip.model.paidTime + 120 + Settings.marketData[lastTrip.type].longPickup.threshold;
        if (trips.length > 1) seconds += trips[trips.length - 2].model.durations.fare;
        this.end = addTime(lastTrip.dateTime, seconds);
        this.downtime = 0;
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
    setDowntime(value) {
        if (this.min != undefined && value > this.min.downtime) this.min.downtime = value;
        if (this.max != undefined && value > this.min.downtime) this.max.downtime = value;
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
        this.setDurations('max'); // todo - review this setting and whether i would want it to be different when creating new blocks
        this.setTimes(false, true);
    }
    // splits trips into array of objects representing blocks, returns blocks
    static create = function(/**@type {Trip[]}*/trips) {
        const blocks = [];
        const arr = [];
        for (const trip of trips) {
            arr.push(trip);
            if (trip.model.blockEnd) blocks.push(new Block(arr.splice(0)));
        }
        return blocks;
    }
    // sets pickup & wait durations for each trip
    setDurations(minmax/*, visualWarnings=true, throwOnWarnings=false*/) {
        for (const trip of this.trips) {
            const model = trip.model;
            if (model.longPickup) model.durations.pickup = 600;
            else model.durations.pickup = this.model[minmax].averagePickup;
            if (model.longWait) model.durations.wait = 120;
            else model.durations.wait = this.model[minmax].averageWait;
        }
        /*if (mm.averageWait == 120) {
            if (visualWarnings) console.warn(`${minmax} average times greater than allowable @ ${this.date}`);
            //if (throwOnWarnings) throw 'meep';// its gotta throw something...
        }*/
    }
    // sets simulated times for each trip
    setTimes(visualWarnings=true, strict=false, correctTrips=false, minmax='') {
        //debugger;
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
                console.log(`shifting times @ ${trip.dateTime}`); // for debugging purposes
                times.start = lastTripTimes.end; // for debugging purposes
                continue; // for debugging purposes
                /*if (i != revisit) {
                    try {
                        // todo - build shiftTimes. probably into the Block class
                        i -= shiftTimes(i, minmax);
                    } catch (stepsBack) {
                        revisit = i;
                        i -= stepsBack + 1;
                    } finally {
                        continue;
                    }
                }
                try {
                    i -= shiftTimes(i, minmax, true);
                } catch {
                    badTrips.push(i);
                    i -= stepsBack + 1;
                    collision = true;
                } finally {
                    revisit = -1;
                    continue;
                }*/
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
    // 
    shiftTimes(i, minmax, revisit = false) {
        let stepsBack = 1;
        const trips = this.trips;
        const trip = trips[i];
        console.log(`shifting times @ ${trip.dateTime}`); // for debugging purposes
        if (revisit) console.warn(`revisiting times @ ${trip.dateTime}`); // for debugging purposes
        let diff = secondsBetween(trips[i-1].model.times.fare, trip.dateTime);


        // if two trips start at the same time according to the statement, make sure the longer trip is
        // indexed after the shorter trip - Jun 26 @ 00:00
    }
}



// adds new trips after simulation has already ran
function addTrips(days, newTrips) {
    // add new trips passed to this function from an event handler to the days array held by index.js
}

// models key times of trips
function simulation(trips) {
    const blocks = Block.create(trips);
    splitAtBreaks(blocks, 4);
    debugger;
    findDowntime(blocks, 'min');

    debugger;

    return blocks; // for testing
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
function findDowntime(/**@type {Block[]}*/blocks, minmax) { // 1 pass 'min' i guess
    for (const block of blocks) {
        debugger;
        const trips = block.trips;
        block.setDurations(minmax);
        block.setTimes(false);
        // the entire try/catch and throwing functionality is already handled by the downtime setter
        let downtime = 0;
        for (let i = 0; i < trips.length - 1; i++) {
            downtime += secondsBetween(trips[i].model.times.end, trips[i+1].model.times.start);
        }
        block.model.setDowntime(downtime);
        block.setDurations(minmax);
        
        block.setTimes(false, false, true, minmax);

        
    }
}




exports.simulation = simulation;
//exports.addTrips = addTrips;
exports.secondsBetween = secondsBetween;

// exports for tests
exports.Block = Block;
//exports.Trip = Trip;



// if start time is less than the offset chosen in settings after midnight, set block as previous day
// i can probably automatically detect this setting

// for very long breaks that couldnt possibly be downtime (2+ hours) dont count as downtime, but something else