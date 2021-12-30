'use strict';

const { processFiles } = require('./scripts/process-files.js');
const { simulateTimes } = require('./scripts/simulation.js');

var data = [];

// listeners for statement input
const input = document.getElementById('input');
input.addEventListener('dragover', ev => ev.preventDefault());
input.addEventListener('dragenter', ev => ev.preventDefault());
input.addEventListener('drop', ev => {
    ev.preventDefault();
    // converts files into array of trip objects
    processFiles(ev.dataTransfer.files)
        .then(d => data = d)
        .finally(analyze);
});

// analyzes trips, separating them into days
function analyze() {
    const days = simulateTimes(data);
    data = days;
    
    // any other stuff i want to add, statistics, charts, etc..
    //console.log('trips:');
    //console.log(trips);
    //console.log('days:');
    //console.log(days);
}


/**
 * aggregated day/week/month data
 * 
 * 
 * 'One Chart to Rule Them All'
 *      can look at daily/weekly/monthly(/hourly?) stats such as:
 *          % of time that is:
 *              paid
 *              downtime
 *              spent waiting
 *              spent driving to pickup
 *              spent driving with passenger
 *          hours worked
 *          # of trips, long pickups/waits
 *      group stats into separate axes to make side-by-side comparison easier
 * 
 * same as the last chart but look at "the average monday, tuesday, wed...."
 *      maybe use an EMA of sorts to make this chart more relevant to the present
 * 
 * 
 * eventually go back into simulation.js and try to bring it more in-line with reality - close up the downtime gaps
 *      i can probably make a debug chart to help visualize this
 */