const { processFiles } = require('./scripts/process-files.js')

let trips = []

//listeners for drag/drop
const input = document.getElementById('input')
input.addEventListener('dragover', ev => ev.preventDefault())
input.addEventListener('dragenter', ev => ev.preventDefault())
input.addEventListener('drop', ev => {
    ev.preventDefault()
    //converts files into array of trip objects
    processFiles(ev.dataTransfer.files)
    .then(data => {
        trips = data
        //display trips
        console.log(trips)
    })
})
//listeners for analysis
document.getElementById('analyze').addEventListener('click', () => analyze(trips))
/*
display trips
aggregated day/week/month data
*/

let test = []
function analyze(data) {
    let days = simulateTimes(data)
    //whatever else
    test = days
    console.log(days)
}







//models key times of trips
function simulateTimes(data) {
    labelDays(data)
    calculatePaidDurations(data)
    let blocks = createBlocks(data)
    configureBlocks(blocks, 'max')
    for (i = 1; i < 4; i++) {
        findBreaksPass(i, blocks)
        blocks = splitBlocks(blocks)
        configureBlocks(blocks, 'max')
    }
    


    return blocks
}




//figure out what the fuck to do next









//if time difference between trips > 6 hours, mark as new day
function labelDays(d) {
    for (i = 1; i < d.length; i++) {
        let diff = Math.abs(d[i].dateTime.getTime() - d[i-1].dateTime.getTime())
        if (diff > 21600000) {
            d[i].dayStart = true
            d[i-1].dayEnd = true
        }
        else {
            d[i].dayStart = false
            d[i-1].dayEnd = false
        }
        d[0].dayStart = true
        d[d.length-1].dayEnd = true
    }
}
//calculates time paid during trip in seconds (fare + long pickup + long wait)
function calculatePaidDurations(data) {
    for (let trip of data) {
        trip.model = {}
        trip.model.durations = {}
        if (trip.fare.cancel == 0) trip.cancellation = false
        else {
            trip.cancellation = true
        //fare
            trip.model.durations.fare = parseInt((trip.fare.cancel - 383) * 1.25)
        }
        trip.model.durations.fare = trip.fare.time * 4
        //long pickup
        if (trip.fare.lPTime > 0) {
            trip.model.longPickup = true
            trip.model.durations.longPickup = trip.fare.lPTime * 4
        } else {
            trip.model.longPickup = false
            trip.model.durations.longPickup = 0
        }
        //long wait
        if (trip.fare.waitTime > 0) {
            trip.model.longWait = true
            trip.model.durations.longWait = trip.fare.waitTime * 4
        } else if (trip.cancellation) {
            trip.model.longWait = true
            trip.model.durations.longWait = 180 //change this value to adjust canceled trip base time. currently 180s + 2m + default pickup
        } else {
            trip.model.longWait = false
            trip.model.durations.longWait = 0
        }
        //sets total ammount of time in trip that is paid (fare + long pickup + long wait)
        trip.model.paidTime = 0
        for (let d in trip.model.durations) {
            trip.model.paidTime += trip.model.durations[d]
        }
    }
}
//splits trips into array of objects representing blocks, marks block start/end according to day start/end
function createBlocks(data) {
    let arr = []
    let obj
    for (let trip of data) {
        if (trip.dayStart) {
            obj = {} //resets obj to fresh {}
            obj.date = trip.dateTime.toDateString()
            obj.trips = []
            obj.model = {}
            trip.model.blockStart = true
        } else trip.model.blockStart = false
        obj.trips.push(trip)
        if (trip.dayEnd) {
            arr.push(obj)
            trip.model.blockEnd = true
        } else trip.model.blockEnd = false
    }
    return arr
}
//sets relevant fields for blocks / times for trips
function configureBlocks(blocks, setting) {
    for (let block of blocks) {
        setStartTime(block)
        findPaidTime(block)
        findEarliestEndTime(block)
        findLatestEndTime(block)
        findUnpaidTime(block, setting)
        findPickupWaitCount(block)
        findPickupWaitTimes(block, setting)
        setPickupWaitdurations(block, setting)
        setTimes(block)
    }
}
//sets starting time on day & first trip in block, empty {} for other trips
function setStartTime(block) {
    for (let trip of block.trips) {
        trip.model.times = {}
        if (trip.model.blockStart) {
            trip.model.times.start = trip.dateTime
            block.model.startTime = trip.dateTime
        }
    }
}
//finds total ammount of time in a block that is paid (fare + long pickup + long wait)
function findPaidTime(block) {
    block.model.paidTime = 0
    for (let trip of block.trips) {
        block.model.paidTime += trip.model.paidTime
    }
}
//finds earliest time block could have ended
function findEarliestEndTime(block) {
    let lastTrip = block.trips[block.trips.length - 1]
    let lp = 0
    let lw = 0
    if (lastTrip.model.longPickup) lp = lastTrip.model.durations.longPickup + 600
    if (lastTrip.model.longWait) lw = lastTrip.model.durations.longWait + 120
    let seconds = lp + lw + lastTrip.model.durations.fare
    block.model.earliestEnd = addTime(lastTrip.dateTime, seconds)
}
//finds latest time block could have ended
function findLatestEndTime(block) {
    let secondLastTrip = block.trips[block.trips.length - 2]
    let lastTrip = block.trips[block.trips.length - 1]
    let lp = 0
    let lw = 0
    if (lastTrip.model.longPickup) lp = lastTrip.model.durations.longPickup
    if (lastTrip.model.longWait) lw = lastTrip.model.durations.longWait
    let seconds
    if (block.trips.length == 1) { //if there's only one trip in a block..
        seconds = lp + 599 + lw + 119 + lastTrip.model.durations.fare
    } else {
        seconds = secondLastTrip.model.durations.fare +
        lp + 599 + lw + 119 + lastTrip.model.durations.fare
    }
    block.model.latestEnd = addTime(lastTrip.dateTime, seconds)
}
//takes a date object and returns date object + seconds
function addTime(date, seconds) {
    return new Date(date.getTime() + seconds * 1000)
}
//finds min/max/avg ammount of time in a block that is unpaid (pickup start + wait + downtime + breaks)
function findUnpaidTime(block, string) {
    block.model[string + 'UnpaidTime'] = (
        string == 'min' ? block.model.minUnpaidTime = (
            secondsBetween(block.model.startTime, block.model.earliestEnd)
            - block.model.paidTime
        )
        : string == 'max' ? block.model.maxUnpaidTime = (
            secondsBetween(block.model.startTime, block.model.latestEnd)
            - block.model.paidTime
        )
        : string == 'avg' ? block.model.avgUnpaidTime = (
            //dont panic it's just (minUnpaidTime + maxUnpaidTime)/2
            ((secondsBetween(block.model.startTime, block.model.earliestEnd)
            - block.model.paidTime) + (secondsBetween(block.model.startTime, block.model.latestEnd)
            - block.model.paidTime)) / 2
        )
        : console.error(
            'findUnpaidTime() parameter "string" is invalid. string passed: ' + string + '\n'
            + 'valid strings are: min max avg'
        )
    )
}
//returns difference in seconds between two date objects
function secondsBetween(date1, date2) {
    return Math.abs(date1.getTime() - date2.getTime()) / 1000
}
//counts long & normal pickups & waits in a block
function findPickupWaitCount(block) {
    block.model.longPickups = 0
    block.model.longWaits = 0
    block.model.normalPickups = 0
    block.model.normalWaits = 0
    for (let trip of block.trips) {
        if (trip.model.longPickup) block.model.longPickups++
        else block.model.normalPickups++
        if (trip.model.longWait) block.model.longWaits++
        else block.model.normalWaits++
    }
}
//finds min/max/avg pickup & wait times in a block
function findPickupWaitTimes(block, string) {
    let unpaidTime = 0
    string == 'min' ? unpaidTime = block.model.minUnpaidTime
    : string == 'max' ? unpaidTime = block.model.maxUnpaidTime
    : string == 'avg' ? unpaidTime = block.model.avgUnpaidTime
    : console.error(
        'findPickupWaitTimes() parameter "string" is invalid. string passed: ' + string + '\n'
        + 'valid strings are: min max avg'
    )
    findUncertainUnpaidTimes(block, string)
    let pt = block.model.normalPickups * 600
    let wt =  block.model.normalWaits * 120
    block.model[string + 'AveragePickupTime'] =
        parseInt(block.model[string + 'UncertainUnpaidTime'] * (pt/(pt+wt)))
    block.model[string + 'AverageWaitTime'] =
        parseInt(block.model[string + 'UncertainUnpaidTime'] * (wt/(pt+wt)))
}
//finds min/max/avg time spent that cannot be perfectly determined via statement
function findUncertainUnpaidTimes(block, string) {
    block.model[string + 'UncertainUnpaidTime'] =
        block.model[string + 'UnpaidTime'] -
            block.model.longPickups * 600 + block.model.longWaits * 120
}
//sets min/max/avg pickup & wait durations for each trip in a block
function setPickupWaitdurations(block, string) {
    let overflow = false
    for (let trip of block.trips) {
        if (trip.model.longPickup) trip.model.durations.pickup = 600
        else {
            let pickup = parseInt(block.model[string + 'AveragePickupTime'] / block.model.normalPickups)
            if (pickup > 600) {
                trip.model.durations.pickup = 600
                overflow = true
            }
            else trip.model.durations.pickup = pickup
        }
        if (trip.model.longWait) trip.model.durations.wait = 120
        else {
            let wait = parseInt(block.model[string + 'AverageWaitTime'] / block.model.normalWaits)
            if (wait > 120) {
                trip.model.durations.wait = 120
                overflow = true
            }
            else trip.model.durations.wait = wait
        }
    }
    //checks for times that exceed allowable values and logs error
    if (overflow) {
        block.model[string + 'UnpaidTimeOverflow'] = true
        console.warn('setPickupWaitdurations() trip.model.durations.pickup/wait ' + string + ' time > max allowable on ' + block.date)
    } else block.model[string + 'UnpaidTimeOverflow'] = false
}
//iterates over each trip in a day/block and sets their times
function setTimes(block) {
    let trips = block.trips
    let e = false
    for (let t in trips) {
        let times = trips[t].model.times
        let durations = trips[t].model.durations
        //handling of all but first trip in block
        if (!trips[t].model.blockStart) {
            let lastTripTimes = trips[t-1].model.times
            //normal trip
            if (lastTripTimes.end > trips[t].dateTime && lastTripTimes.fare < trips[t].dateTime) {
                trips[t].model.times.start = lastTripTimes.end
            //trip accepted before last trip's fare started according to model
            } else if (lastTripTimes.end > trips[t].dateTime && lastTripTimes.fare > trips[t].dateTime) {
                trips[t].model.times.start = lastTripTimes.end //switch this line with the next to override trip start times to be before last trip end if trip time doesnt line up
                //trips[t].model.times.start = addTime(trips[t].dateTime, trips[t-1].model.durations.fare)
                e = true
            //normal trip but after downtime
            } else trips[t].model.times.start = trips[t].dateTime
        }
        times.wait = addTime(times.start, durations.pickup + durations.longPickup)
        times.fare = addTime(times.wait, durations.wait + durations.longWait)
        times.end = addTime(times.fare, durations.fare)
    }
    if (e) console.warn("setTimes() trip accepted before last fare time started on " + block.date)
}
//checks each block in each day and tries to find breaks within blocks, with increasing aggressiveness depending on pass, marking new blocks
function findBreaksPass(pass, blocks) { //figure out how to differentiate from a short break and a long downtime
    //sets limit to 2 hours first pass, 1 hour second pass, 40 mins third, 30 fourth, 24 fifth, 20 sixth...
    let limit = 7200 / pass
    for (let block of blocks) {
        let trips = block.trips
        for (t = 0; t < trips.length - 2; t++) { //ignores the last trip in a block
            let tripModel = trips[t].model
            let nextTripModel = trips[t+1].model
            let gap = secondsBetween(tripModel.times.end, nextTripModel.times.start)
            if (gap > limit) {
                console.log("block marked " + trips[t].dateTime)
                tripModel.blockEnd = true
                nextTripModel.blockStart = true
            }
        }
    }
}
//splits blocks at marked trips, returning array of freshly split blocks
function splitBlocks(blocks) {
    let arr = []
    let obj
    for (let block of blocks) {
        if (block.trips.findIndex(trip => trip.model.blockEnd == true) == block.trips.length - 1) { //if no breaks..
            arr.push(block)
        } else {
            for (let trip of block.trips) {
                if (trip.model.blockStart) {
                    obj = {} //resets obj to fresh {}
                    obj.date = trip.dateTime.toDateString()
                    obj.trips = []
                    obj.model = {}
                }
                obj.trips.push(trip)
                if (trip.model.blockEnd) arr.push(obj)
            }
        }
    }
    return arr
}