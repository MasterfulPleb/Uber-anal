'use strict';

const { secondsBetween, addTime } = require('/UberAnal/scripts/utility.js');
const { Settings } = require('/UberAnal/scripts/settings.js');


// for testing purposes
const { Trip } = require('/UberAnal/scripts/process-files.js'); // for intellisense
const { debuggingTimeVisualization } = require('/UberAnal/scripts/charts.js');


/** The base class Min & Max are built from */
class MinMax {
    /**@type {BModel}*/#model;
    /**@type {Trip[]}*/#trips;
    /**@type {Date}*/#end;
    /**@type {Number}*/#downtime
    /**@type {Number}*/unpaidTime;
    /** All time that is not certain based on the statement -
     *  normal pickups, normal waits & downtime
     * @type {Number}*/baseUnaccountedTime;
    /** Pickup and wait times that are not long
     * @type {Number}*/unaccountedTime;
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
    /** Recalculates unpaidTime and baseUnaccountedTime when changed */
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
    /** Recalculates unpaid/average pickup & unpaid/average wait when changed */
    set downtime(num) {
        if (num > this.baseUnaccountedTime - this.maxUnaccountedTime) this.#downtime = num;
        else this.#downtime = this.baseUnaccountedTime - this.maxUnaccountedTime
        if (this.#pWeight == 0 && this.#wWeight == 0) { // no normal pickups or waits
            this.unpaidPickup = 0;
            this.averagePickup = 0;
            this.unpaidWait = 0;
            this.averageWait = 0;
            console.error(`block found with no normal pickups/waits @ ${this.#trips[0].dateTime.toDateString()}`);// for debugging purposes
            // todo - just check out one of these blocks, artificially create one if i have to
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
/**  */
class Min extends MinMax {
    /** @param {Trip[]} trips */
    constructor(trips, model) {
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
/**  */
class Max extends MinMax {
    /** @param {Trip[]} trips */
    constructor(trips, model) {
        super(trips, model);
        const lastTrip = trips[trips.length - 1];
        let seconds = lastTrip.model.paidTime + 120 + Settings.marketData[lastTrip.type].longPickup.threshold;
        if (trips.length > 1) seconds += trips[trips.length - 2].model.durations.fare;
        this.end = addTime(lastTrip.dateTime, seconds);
        this.downtime = 0;
    }
}
/** Model for a block of trips */
class BModel {
    /**@type {Date}*/startTime;
    /** @param {Trip[]} trips */
    constructor(trips) {
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
    /** Sets downtime for both Min and Max */
    setDowntime(value) {
        if (this.min != undefined && value > this.min.downtime) this.min.downtime = value;
        if (this.max != undefined && value > this.min.downtime) this.max.downtime = value;
    }
}
/** Block of trips */
class Block {
    /** @param {Trip[]} trips */
    constructor(trips) {
        let start = trips[0].dateTime;
        if (start.getHours() < Settings.offset) {
            this.date = addTime(start, -86400).toDateString();
        } else this.date = start.toDateString();
        this.trips = trips;
        this.model = new BModel(trips);
        this.setDurations('max'); // todo - review this setting and whether i would want it to be different when creating new blocks
        this.setTimes(false, true);
    }
    /** Returns array of blocks built from trips
     * @param {Trip[]} trips */
    static create = function(trips) {
        const blocks = [];
        const arr = [];
        for (const trip of trips) {
            arr.push(trip);
            if (trip.model.blockEnd) blocks.push(new Block(arr.splice(0)));
        }
        return blocks;
    }
    /** Sets pickup & wait durations for each trip */
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
    /** Sets simulated times for each trip */
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
    /**  */
    shiftTimes(i, minmax, revisit = false) {
        //debugger;
        let stepsBack = 1;
        const trips = this.trips;
        const trip = trips[i];
        console.log(`shifting times @ ${trip.dateTime}`); // for debugging purposes
        if (revisit) console.warn(`revisiting times @ ${trip.dateTime}`); // for debugging purposes
        let diff = secondsBetween(trips[i-1].model.times.fare, trip.dateTime);


        // if two trips start at the same time according to the statement, make sure the longer trip is
        // indexed after the shorter trip - Jun 26 @ 00:00

        // build a chart to help with building this method
    }
}



/** Adds new trips after simulation has already ran */
function addTrips(days, newTrips) {
    // add new trips passed to this function from an event handler to the days array held by index.js
}

/** Models key times of trips
 * @param {Trip[]} trips */
function simulateDays(trips) {
    const blocks = Block.create(trips);
    splitAtBreaks(blocks, 4);
    debuggingTimeVisualization(trips); // for testing purposes
    findDowntime(blocks, 'min');

    //debuggingTimeVisualization(trips); // for testing purposes
    debugger;

    return blocks; // for testing
}
/** Finds breaks in blocks and splits them
 * @param {Block[]} blocks */
function splitAtBreaks(blocks, passes = 1) {
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
/** 
 * @param {Block[]} blocks */
function findDowntime(blocks, minmax) { // 1 pass 'min' i guess
    //debugger;
    for (const block of blocks) {
        const trips = block.trips;
        block.setDurations(minmax);
        block.setTimes(false);
        debuggingTimeVisualization(trips); // for testing purposes

        let downtime = 0;
        for (let i = 0; i < trips.length - 1; i++) {
            downtime += secondsBetween(trips[i].model.times.end, trips[i+1].model.times.start);
        }
        block.model.setDowntime(downtime);
        block.setDurations(minmax);
        
        block.setTimes(false, false, true, minmax);
        //debuggingTimeVisualization(trips); // for testing purposes

        
    }
    //debugger;
}




exports.simulateDays = simulateDays;
//exports.addTrips = addTrips;

// exports for tests
exports.Block = Block;




// if start time is less than the offset chosen in settings after midnight, set block as previous day

// for very long breaks that couldnt possibly be downtime (2+ hours) dont count as downtime, but something else