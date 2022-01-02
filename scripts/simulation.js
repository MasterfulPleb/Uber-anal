'use strict';

exports.simulateTimes = simulateTimes;
exports.secondsBetween = secondsBetween;

/**
 * @type {{
 *  dateTime: Date,
 *  fare: {
 *      base: Number,
 *      cancel: Number,
 *      distance: Number,
 *      lPDistance: Number,
 *      lPTime: Number,
 *      minFareSupplement: Number,
 *      other: Number,
 *      promo: Number,
 *      surge: Number,
 *      time: Number,
 *      tip: Number,
 *      total: Number,
 *      waitTime: Number
 *  },
 *  cancellation: Boolean,
 *  dayStart: Boolean,
 *  dayEnd: Boolean,
 *  model: {
 *      durations: {
 *          fare: Number,
 *          longPickup: Number,
 *          longWait: Number,
 *          pickup: Number,
 *          wait: Number
 *      },
 *      paidTime: Number,
 *      blockStart: Boolean,
 *      blockEnd: Boolean,
 *      longPickup: Boolean,
 *      longWait: Boolean,
 *      times: {
 *          start: Date,
 *          wait: Date,
 *          fare: Date,
 *          end: Date
 *      }
 *  }
 * }[]}
 */
var trips = [];
/**
 * @type {{
 *  date: Date,
 *  trips: trips,
 *  model: {
 *      startTime: Date,
 *      longPickups: Number,
 *      longWaits: Number,
 *      normalPickups: Number,
 *      normalWaits: Number,
 *      paidTime: Number,
 *      max: {
 *          end: Date,
 *          unpaid: number,
 *          unaccounted: Number,
 *          unpaidPickup: Number,
 *          averagePickup: Number,
 *          unpaidWait: Number,
 *          averageWait: Number,
 *          downtime: Number
 *      },
 *      min: {
 *          end: Date,
 *          unpaid: number,
 *          unaccounted: Number,
 *          unpaidPickup: Number,
 *          averagePickup: Number,
 *          unpaidWait: Number,
 *          averageWait: Number,
 *          downtime: Number
 *      }
 *  }
 * }[]}
 */
var blocks = [];
/**
 * @type {{
 *  date: Date,
 *  trips: trips,
 *  model: {
 *      startTime: Date,
 *      endTime: Date,
 *      longPickups: Number,
 *      longWaits: Number,
 *      normalPickups: Number,
 *      normalWaits: Number,
 *      averagePickup: Number,
 *      averageWait: Number,
 *      unpaidPickup: Number,
 *      unpaidWait: Number,
 *      paidTime: Number,
 *      unpaidTime: Number,
 *      downtime: Number
 *  }
 * }[]}
 */
var days = [];

// models key times of trips
function simulateTimes(data) {
    trips = data;
    labelDays();
    calculatePaidDurations();
    createBlocks();
    for (let b of blocks) configureBlock(b, 'max');
    days = blocks;
    for (let p=1; p<5; p++) {
        findBreaksPass(p);
        splitBlocks('max');
    }
    findDowntime(1, 'min');
    createAverageModel();
    cleanupDays();
    // this is where i would add further processing if needed
    console.log('fully simulated days:');
    console.log(days);
    return days;
}
// if time difference between trips > 6 hours, mark as new day
function labelDays() {
    const t = trips;
    const l = t.length;
    for (let i=1; i<l; i++) {
        // time difference between trips
        const diff = Math.abs(t[i].dateTime.getTime() - t[i-1].dateTime.getTime());
        if (diff > 21600000) {// 6 hours
            t[i].dayStart = true;
            t[i-1].dayEnd = true;
        } else {
            t[i].dayStart = false;
            t[i-1].dayEnd = false;
        }
        t[0].dayStart = true;
        t[l-1].dayEnd = true;
    }
}
// calculates time paid during trip in seconds (fare + long pickup + long wait)
function calculatePaidDurations() {
    for (let trip of trips) {
        trip.model = { durations: {} };
        // cancellations/fare time
        if (trip.fare.cancel == 0) {
            trip.cancellation = false;
            trip.model.durations.fare = Math.round(trip.fare.time*6000/1575);
        } else {
            trip.cancellation = true;
            // this is where long cancels are handled
            trip.model.durations.fare = Math.round((trip.fare.cancel-383)*125/100);
        }
        // long pickup time
        if (trip.fare.lPTime > 0) {
            trip.model.longPickup = true;
            trip.model.durations.longPickup = Math.round(trip.fare.lPTime*6000/1575);
        } else {
            trip.model.longPickup = false;
            trip.model.durations.longPickup = 0;
        }
        // long wait time
        if (trip.fare.waitTime > 0) {
            trip.model.longWait = true;
            trip.model.durations.longWait = Math.round(trip.fare.waitTime*6000/1875);
        } else if (trip.cancellation) {
            trip.model.longWait = true;
            trip.model.durations.longWait = 180;
            // change this value to adjust canceled trip base time
            // currently 180s + 2m + default pickup
        } else {
            trip.model.longWait = false;
            trip.model.durations.longWait = 0;
        }
        // sets total ammount of paid time in trip (fare + long pickup + long wait)
        trip.model.paidTime = 0;
        for (let key in trip.model.durations) {
            trip.model.paidTime += trip.model.durations[key];
        }
    }
}
// splits trips into array of objects representing blocks, marks block start/end according to day start/end
function createBlocks() {
    var block;
    for (let i=0; i<trips.length; i++) {
        const trip = trips[i];
        if (trip.dayStart) {
            block = {
                date: trip.dateTime.toDateString(),
                trips: [],
                model: {}
            };
            trip.model.blockStart = true;
        } else trip.model.blockStart = false;
        block.trips.push(trip);
        if (trip.dayEnd) {
            blocks.push(block);
            trip.model.blockEnd = true;
        } else trip.model.blockEnd = false;
    }
}
// sets relevant fields for a block & times for trips
function configureBlock(/**@type {blocks[0]}*/block, /**@type {String}*/minmax) {
    setStartTime(block);
    findPaidTime(block);
    findPickupWaitCount(block);
    findEarliestEndTime(block);
    findLatestEndTime(block);
    findUnpaidTime(block);
    findPickupWaitTimes(block);
    setPickupWaitdurations(block, minmax, false);
    setTimes(block, false, true);
}
// sets starting time on day & first trip in block, empty 'times' {} for others
function setStartTime(/**@type {blocks[0]}*/block) {
    for (let trip of block.trips) {
        trip.model.times = {};
        if (trip.model.blockStart) {
            trip.model.times.start = trip.dateTime;
            block.model.startTime = trip.dateTime;
        }
    }
}
// finds total ammount of paid time in a block (fare + long pickup + long wait)
function findPaidTime(/**@type {blocks[0]}*/block) {
    block.model.paidTime = 0;
    for (let trip of block.trips) {
        block.model.paidTime += trip.model.paidTime;
    }
}
// counts long & normal pickups & waits in a block
function findPickupWaitCount(/**@type {blocks[0]}*/block) {
    block.model.longPickups = 0;
    block.model.longWaits = 0;
    block.model.normalPickups = 0;
    block.model.normalWaits = 0;
    for (let trip of block.trips) {
        if (trip.model.longPickup) block.model.longPickups++;
        else block.model.normalPickups++;
        if (trip.model.longWait) block.model.longWaits++;
        else block.model.normalWaits++;
    }
}
// finds earliest time block could have ended
function findEarliestEndTime(/**@type {blocks[0]}*/block) {
    const lastTrip = block.trips[block.trips.length - 1];
    var lp=0, lw=0;
    if (lastTrip.model.longPickup) lp = lastTrip.model.durations.longPickup + 600;
    if (lastTrip.model.longWait) lw = lastTrip.model.durations.longWait + 120;
    const seconds = lp + lw + lastTrip.model.durations.fare;
    block.model.min = { end: addTime(lastTrip.dateTime, seconds) };
}
// finds latest time block could have ended
function findLatestEndTime(/**@type {blocks[0]}*/block) {
    const lastTrip = block.trips[block.trips.length - 1];
    const secondLastTrip = block.trips[block.trips.length - 2];
    var lp=0, lw=0;
    if (lastTrip.model.longPickup) lp = lastTrip.model.durations.longPickup;
    if (lastTrip.model.longWait) lw = lastTrip.model.durations.longWait;
    if (block.trips.length == 1) {
        var seconds = lp + 599 + lw + 119 + lastTrip.model.durations.fare;
    } else {
        var seconds = secondLastTrip.model.durations.fare +
          lp + 599 + lw + 119 + lastTrip.model.durations.fare;
    }
    block.model.max = { end: addTime(lastTrip.dateTime, seconds) };
}
// takes a date object and returns a new date object + seconds
function addTime(date, seconds) {
    return new Date(date.getTime() + seconds * 1000);
}
// returns difference in seconds between two date objects
function secondsBetween(date1, date2) {
    return Math.round(Math.abs( date1.getTime()-date2.getTime() )/1000);
}
// finds min/max ammount of time in a block that is unpaid (pickup start + wait + downtime + breaks)
function findUnpaidTime(/**@type {blocks[0]}*/block) {
    const model = block.model;
    const min = model.min;
    const max = model.max;
    min.unpaid = secondsBetween(model.startTime, min.end)-model.paidTime;
    max.unpaid = secondsBetween(model.startTime, max.end)-model.paidTime;
    // subtracts certain unpaid time (long pickup/waits) from total, giving total unaccounted for time
    min.unaccounted = min.unpaid - (model.longPickups*600 + model.longWaits*120) - (min.downtime ?? 0);
    max.unaccounted = max.unpaid - (model.longPickups*600 + model.longWaits*120) - (max.downtime ?? 0);
    // if the earliest end time is not possible, shift it to be just possible, and rerun the function
    if (min.unaccounted < 0) {
        min.end = addTime(min.end, Math.abs(min.unaccounted));
        findUnpaidTime(block);
    }
}
// finds min/max pickup & wait times in a block
function findPickupWaitTimes(/**@type {blocks[0]}*/block) {
    const model = block.model;
    const min = model.min;
    const max = model.max;
    const pWeight = model.normalPickups * 600;
    const wWeight =  model.normalWaits * 120;
    if (pWeight==0 && wWeight==0) {// no normal pickups or waits
        min.unpaidPickup = 0;
        min.averagePickup = 0;
        min.unpaidWait = 0;
        min.averageWait = 0;
        if (max.downtime != undefined) min.downtime = max.downtime;
        model.max = min;
        /*
        * if there are no normal pickups or waits, and all breaks/downtime are accounted for, there should be 0 unaccounted-for time.
        * the min end time should have been shifted to where there is 0 unaccounted-for time,
        * therefore the max must be identical since all time is accounted for.
        * 
        * such blocks are marked for review via the line below, and should have 0 unaccounted-for time
        */
       //console.error(`block found with no normal pickups/waits @ ${block.date}`);// for debugging purposes
    } else {
        min.unpaidPickup = Math.round(min.unaccounted * (pWeight/(pWeight+wWeight)));
        max.unpaidPickup = Math.round(max.unaccounted * (pWeight/(pWeight+wWeight)));
        if (pWeight==0) {// no normal pickups
            min.averagePickup = 0;
            max.averagePickup = 0;
        } else {
            min.averagePickup = Math.round(min.unpaidPickup / model.normalPickups);
            max.averagePickup = Math.round(max.unpaidPickup / model.normalPickups);
        }
        min.unpaidWait = Math.round(min.unaccounted * (wWeight/(wWeight+pWeight)));
        max.unpaidWait = Math.round(max.unaccounted * (wWeight/(wWeight+pWeight)));
        if (wWeight==0) {// no normal waits
            min.averageWait = 0;
            max.averageWait = 0;
        } else {
            min.averageWait = Math.round(min.unpaidWait / model.normalWaits);
            max.averageWait = Math.round(max.unpaidWait / model.normalWaits);
        }
    }
}
// sets min/max pickup & wait durations for each trip in a block
function setPickupWaitdurations(/**@type {blocks[0]}*/block, /**@type {String}*/minmax, visualWarnings=true, throwOnWarnings=false) {
    for (let trip of block.trips) {
        const model = trip.model;
        if (model.longPickup) model.durations.pickup = 600;
        else {
            const p = block.model[minmax].averagePickup;
            if (p<600) model.durations.pickup = p;
            else model.durations.pickup = 599;
        }
        if (model.longWait) model.durations.wait = 120
        else {
            const w = block.model[minmax].averageWait;
            if (w<120) model.durations.wait = w;
            else model.durations.wait = 119;
        }
    }
    if (block.model[minmax].averagePickup >= 600 || block.model[minmax].averageWait >= 120) {
        if (visualWarnings) console.warn(`block.model.${minmax} average times greater than standard 600/120 @ ${block.date}`);
        if (throwOnWarnings) throw 'meep';// its gotta throw something...
    }
}
// sets simulated times for each trip in a block
function setTimes(/**@type {blocks[0]}*/block, visualWarnings=true, strict=false, correctTrips=false, minmax='') {
    const trips = block.trips;
    var collision = false;
    var badTrips = []; // logs unfixable trips to prevent shiftTimes() from infinitely looping
    var revisit = -1;
    for (let i=0; i<trips.length; i++) {
        const times = trips[i].model.times;
        if (i!=0) {
            const lastTripTimes = trips[i-1].model.times;
            // normal trip
            if (lastTripTimes.end >= trips[i].dateTime && lastTripTimes.fare <= trips[i].dateTime) {
                times.start = lastTripTimes.end;
            // trip accepted before last trip's fare started according to model
            } else if (lastTripTimes.end >= trips[i].dateTime && lastTripTimes.fare > trips[i].dateTime) {//someshit with these equals signs idfk
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
                    times.start = addTime(trips[i].dateTime, trips[i-1].model.durations.fare);
                    collision = true;
                }
                else {
                    if (!correctTrips) {
                        times.start = lastTripTimes.end;
                        collision = true;
                    }
                    else {
                        if (minmax == '')
                            throw console.error("'minmax' required when correctTrips is set to true");
                        //if (block.model[minmax].downtime == undefined)
                        //    throw console.error('attempted to call shiftTimes() before setting downtime. idk how but you did it.');
                        // if current index is an unfixable trip, skips shiftTimes() and just sets the times & moves on
                        if (!badTrips.includes(i)) {
                            if (i != revisit) {
                                try {
                                    i -= shiftTimes(block, i, minmax) + 1;
                                } catch (stepsBack) {
                                    revisit = i;
                                    i -= stepsBack + 1;
                                } finally {
                                    continue;
                                }
                            } else {
                                // if overlap couldn't be fixed, check if dateTime can be slid back to make more room
                                // must be 'revisited' like this so trips with altered durations can have times set again
                                try {
                                    i -= shiftTimes(block, i, minmax, true) + 1;
                                } catch (stepsBack) {
                                    badTrips.push(i);
                                    i -= stepsBack + 1;
                                    collision = true;
                                } finally {
                                    revisit = -1;
                                    continue;
                                }
                            }
                        } else times.start = lastTripTimes.end;
                    }
                }
            // normal trip but after downtime
            } else times.start = trips[i].dateTime;
        }
        const durations = trips[i].model.durations;
        times.wait = addTime(times.start, durations.pickup + durations.longPickup);
        times.fare = addTime(times.wait, durations.wait + durations.longWait);
        times.end = addTime(times.fare, durations.fare);
    }
    if (collision && visualWarnings) console.warn(`trip accepted before last fare time started on ${block.date}`);
}
// adjusts trip durations and downtime to avoid collisions between trip times, returns # of trips that need times readjusted
function shiftTimes(/**@type {blocks[0]}*/block, /**@type {Number}*/index, /**@type {String}*/minmax, revisit = false) {
    var stepsBack = 1;
    const trips = block.trips;
    const trip = trips[index];
    //console.log(`shifting times @ ${trip.dateTime}`)// for debugging purposes
    //if (revisit) console.warn(`revisiting times @ ${trip.dateTime}`)// for debugging purposes
    const lastTripFareTime = trips[index-1].model.times.fare;
    var diff = secondsBetween(lastTripFareTime, trip.dateTime);
    if (diff < 59) {
        trip.dateTime = addTime(trip.dateTime, diff+1);
        return stepsBack;
    }
    trip.dateTime = addTime(trip.dateTime, 59);
    diff -= 59;
    function checkTimes(p) {
        const tripsBack = p[0];
        const PoW = p[1];
        const seconds = p[2];
        if (tripsBack != 1) {
            // will not modify a trip if the one after starts from downtime
            const nt = trips[index-tripsBack+1];
            const ntStart = nt.model.times.start;
            if (ntStart == addTime(nt.dateTime, -59) || ntStart == nt.dateTime) throw tripsBack;
        }
        if (stepsBack < tripsBack) stepsBack = tripsBack;
        const t = trips[index-tripsBack];
        var lPW = '', uPW = '';
        if (PoW == 'pickup') { lPW = 'longPickup'; uPW = 'unpaidPickup'; }
        else if (PoW == 'wait') { lPW = 'longWait'; uPW = 'unpaidWait'; }
        const durations = t.model.durations;
        if (t.model[lPW] || durations[PoW] <= seconds) return;
        if (diff < durations[PoW]-seconds) {
            if (minmax != 'avg') {
                block.model[minmax].unaccounted -= diff+1;
                block.model[minmax].unpaid -= diff+1;
                block.model[minmax][uPW] -= diff+1;
            }
            durations[PoW] -= diff+1;
            diff = 0;
        } else {
            const change = durations[PoW]-seconds
            if (minmax != 'avg') {
                block.model[minmax].unaccounted -= change;
                block.model[minmax].unpaid -= change;
                block.model[minmax][uPW] -= change;
            }
            durations[PoW] -= change;
            diff -= change;
        }
    }
    if (revisit) {// this is where trip's dateTimes are slid back
        const t1 = trips[index-1];
        const t2 = trips[index-2];
        const t3 = trips[index-3];
        const t4 = trips[index-4];
        const diff12 = secondsBetween(t1.dateTime, t2.model.times.end);
        const diff23 = secondsBetween(t2.dateTime, t3.model.times.end);
        const diff34 = secondsBetween(t3.dateTime, t4.model.times.end);
        if (diff > diff12+diff23+diff34) {
            t1.dateTime = addTime(t1.dateTime, -(diff12+diff23+diff34));
            t2.dateTime = addTime(t2.dateTime, -(diff23+diff34));
            t3.dateTime = addTime(t3.dateTime, -(diff34));
            diff -= diff12+diff23+diff34;
            stepsBack = 3;
        } else {
            if (diff > diff12+diff23) {
                t3.dateTime = addTime(t3.dateTime, -(diff-diff12-diff23+1));
                if (stepsBack < 3) stepsBack = 3;
            }
            if (diff > diff12) {
                t2.dateTime = addTime(t2.dateTime, -(diff-diff12+1));
                if (stepsBack < 2) stepsBack = 2;
            }
            t1.dateTime = addTime(t1.dateTime, -(diff+1));
            diff = 0;
        }
    }
    const params = [
        [1, 'wait', 60],
        [1, 'pickup', 300],
        [1, 'wait', 30],
        [1, 'pickup', 120],
        [2, 'wait', 60],
        [2, 'pickup', 300],
        [1, 'wait', 10],
        [2, 'wait', 30],
        [2, 'pickup', 180],
        [1, 'pickup', 60],
        [2, 'pickup', 120],
        [3, 'wait', 60],
        [3, 'pickup', 300],
        [2, 'wait', 10],
        [3, 'wait', 30],
        [3, 'pickup', 180],
        [2, 'pickup', 60],
        [1, 'pickup', 0],
        [3, 'pickup', 120],
        [3, 'wait', 10],
        [3, 'pickup', 60],
        [2, 'pickup', 0],
    ]
    var no2 = false;
    var no3 = false;
    for (let i=0; i<=params.length; i++) {
        if (diff <= 0) break;
        if (i == params.length) {
            if (revisit) console.error(`trip overlap could not be corrected @ ${trip.dateTime}. diff = ${diff}`);
            throw stepsBack;
        }
        if (no2 && params[i][0] > 1) continue;
        if (no3 && params[i][0] > 2) continue;
        try {
            checkTimes(params[i])
        } catch (tripsBack) {
            if (tripsBack == 2) no2 = true;
            if (tripsBack == 3) no3 = true;
        }
    }
    return stepsBack;
}
// trys to find breaks within blocks, getting more agressive with each pass
function findBreaksPass(/**@type {Number}*/pass) {
    // sets limit to 2 hours first pass, 1 hour second pass, 40 mins third, 30 fourth, 24 fifth, 20 sixth...
    const limit = 7200 / pass;
    for (let block of blocks) {
        const trips = block.trips;
        for (let i=0; i < trips.length-1; i++) {// excludes last trip in each block
            const trip = trips[i];
            const nextTripModel = trips[i+1].model;
            const gap = secondsBetween(trip.model.times.end, nextTripModel.times.start);
            if (gap > limit) {
                //console.warn(`break found on ${trip.dateTime}`);// for debugging purposes
                trip.model.blockEnd = true;
                nextTripModel.blockStart = true;
            }
        }
    }
}
// splits blocks at new block ends, updating the blocks array
function splitBlocks(/**@type {String}*/minmax) {
    const newBlocks = [];
    for (let block of blocks) {
        // searches for the index of the first block end, and if it is the current block end...
        if (block.trips.findIndex(trip => trip.model.blockEnd == true) == block.trips.length - 1) {
            newBlocks.push(block);
        } else {
            /**@type {blocks[0]}*/
            var newBlock = {};
            for (let trip of block.trips) {
                if (trip.model.blockStart) newBlock = { date: block.date, trips: [], model: {} };
                newBlock.trips.push(trip);
                if (trip.model.blockEnd) {
                    configureBlock(newBlock, minmax);
                    newBlocks.push(newBlock);
                }
            }
        }
    }
    blocks = newBlocks;
}
// looks for gaps between trips and couts that time as 'downtime' in the block, refreshing times
function findDowntime(/**@type {Number}*/passes, /**@type {String}*/minmax) {
    for (let block of blocks) {
        const trips = block.trips;
        setPickupWaitdurations(block, minmax, false);
        setTimes(block, false);
        for (let p=1; p<=passes; p++) {
            var downtime = 0;// works for single-trip blocks too
            for (let i=0; i < trips.length-1; i++) {// excludes last trip in each block
                const trip = trips[i];
                const nextTripModel = trips[i+1].model;
                const gap = secondsBetween(trip.model.times.end, nextTripModel.times.start);
                downtime += gap;
            }
            if (downtime >= (block.model[minmax].downtime ?? 0)) block.model[minmax].downtime = downtime;
            findUnpaidTime(block);
            findPickupWaitTimes(block);
            // only log warnings from these functions on the final pass
            try {
                setPickupWaitdurations(block, minmax, /*p==passes?true:*/false, true);
            } catch (_e) {
                const maxUnaccounted = block.model.normalPickups*599 + block.model.normalWaits*119;
                const difference = block.model[minmax].unaccounted - maxUnaccounted;
                block.model[minmax].downtime += difference;
                findUnpaidTime(block);
                findPickupWaitTimes(block);
                setPickupWaitdurations(block, minmax, /*p==passes?true:*/false);
            }
            if (p != passes) setTimes(block, false);
            else setTimes(block, false, false, true, minmax);
        }
    }
}
// combines min/max models to create an average model to build the final timeline
function createAverageModel() {
    for (let block of blocks) {
        const min = block.model.min;
        const max = block.model.max;
        block.model.avg = {
            averagePickup: Math.floor((min.averagePickup + max.averagePickup)/2),
            averageWait: Math.floor((min.averageWait + max.averageWait)/2)
        };
        setPickupWaitdurations(block, 'avg', false);
        setTimes(block, true, false, true, 'avg');
    }
}
// deletes old data from days and calculates new data points
function cleanupDays() {
    days = JSON.parse(JSON.stringify(days))// stringify to decouple days from blocks
    for (let day of days) {
        const model = day.model;
        delete model.min;
        delete model.max;
        delete model.avg;
        model.startTime = new Date(model.startTime);// stringify doesnt restore dates
        var pickupTime=0, waitTime=0, paidP=0, paidW=0, fare=0, downtime=0, temp;
        for (let i=0; i < day.trips.length; i++) {
            day.trips[i].dateTime = new Date(day.trips[i].dateTime);
            const t = day.trips[i].model.times;
            if (i == 0) t.start = new Date(t.start);
            t.wait = new Date(t.wait);
            t.fare = new Date(t.fare);
            t.end = new Date(t.end);
            temp = secondsBetween(t.start, t.wait);
            if (temp > 600) paidP += temp-600;
            pickupTime += temp;
            temp = secondsBetween(t.wait, t.fare);
            if (temp > 120) paidW += temp-120;
            waitTime += temp;
            fare += secondsBetween(t.fare, t.end);
            if (i == day.trips.length-1) {
                model.endTime = t.end;
                break;
            }
            const nt = day.trips[i+1].model.times;
            nt.start = new Date(nt.start);
            downtime += secondsBetween(t.end, nt.start);
        }
        model.averagePickup = Math.floor(pickupTime / day.trips.length);
        model.averageWait = Math.floor(waitTime / day.trips.length);
        model.unpaidPickup = pickupTime - paidP;
        model.unpaidWait = waitTime - paidW;
        model.downtime = downtime;
        model.unpaidTime = model.unpaidPickup + model.unpaidWait + downtime;
    }
}