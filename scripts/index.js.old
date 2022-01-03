'use strict';

const { processFiles } = require('./scripts/process-files.js');
const { simulateTimes,secondsBetween } = require('./scripts/simulation.js');
var Highcharts = require('highcharts/highstock');
require('highcharts/indicators/indicators')(Highcharts);
require('highcharts/indicators/trendline')(Highcharts);


var data = [];// for testing purposes

// listeners for statement input
const input = document.getElementById('input-box');
input.addEventListener('dragover', ev => {
    ev.preventDefault();
    input.className = 'drag';
});
input.addEventListener('dragleave', () => input.className = 'inactive');
input.addEventListener('drop', ev => {
    ev.preventDefault();
    document.getElementById('input-view').style.display = 'none';
    document.getElementById('analysis-view').style.display = 'block';
    // converts files into array of trip objects
    processFiles(ev.dataTransfer.files)
        .then(d => data = d)
        .finally(analyze);
});

var chart;
// analyzes trips, separating them into days
function analyze() {
    const days = simulateTimes(data);
    const charts = buildCharts(days);
    data = charts;// for testing purposes
    
    chart = Highcharts.chart('chart', charts.timeline)

    // any other stuff i want to add, statistics, charts, etc..
}

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
 *  hours: () => Number,
 *  earned: () => Number,
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
var q = [];

function buildCharts(d) {
    var days = d
    var charts = {days: days};// days is here for testing
    addMethods(days)
    buildTimeline(days, charts)
    //return charts;
    return charts
}
function addMethods(/**@type {q}*/days) {
    for (let day of days) {
        day.hours = function () {
            return Math.round(secondsBetween(this.model.startTime, this.model.endTime) / 36) / 100;
        };
        day.earned = function () {
            var total = 0;
            for (let trip of this.trips) {
                total += trip.fare.total;
            }
            return total / 100;
        };
        /*day.YMD = function () {
            const year = this.model.startTime.getFullYear();
            const month = this.model.startTime.getMonth();
            const day = this.model.startTime.getDate();
            return [year, month, day];
        };*/
    }
}
function buildTimeline(/**@type {q}*/days, charts) {
    charts.timeline = {
        chart: {type: 'spline'},
        title: {text: 'idk what to put here'},
        subtitle: {text: 'idk what to put here either'},
        xAxis: {
            type: 'datetime',
            dateTimeLabelFormats: {
                month: '%e. %b',
                year: '%b'
            },
            title: {text: 'Date'}
        },
        yAxis: {
            title: {text: 'somethin or another'},
            min: 0
        },
        tooltip: {
            headerFormat: '<b>{series.name}</b><br>',
            pointFormat: '{point.x:%e. %b}: {point.y:.2f} m'
        },
        plotOptions: {
            series: {
                marker: {enabled: true}
            }/*,
            trendline: {

            }*/
        },
        colors: ['#6CF', '#39F', '#06C', '#036', '#000'],
        series: [
            {
                name: 'Hours',
                id: 'h',
                data: []
            }, {
                name: 'Trips/hour',
                id: 't/h',
                data: []
            }, {
                name: '$/hour',
                id: '$/h',
                data: []
            }, {
                type: 'trendline',
                linkedTo: 't/h'
            }, {
                type: 'trendline',
                linkedTo: '$/h'
            }
        ]
    };
    for (let day of days) {
        const time = day.model.startTime.getTime();
        charts.timeline.series[0].data.push([time, day.hours()]);
        const TPH = Math.round(day.trips.length / day.hours() * 100) / 100;
        charts.timeline.series[1].data.push([time, TPH]);
        const DPH = Math.round(day.earned() / day.hours() * 100) / 100;
        charts.timeline.series[2].data.push([time, DPH]);
    }
}








/**
 * aggregated day/week/month data
 * 
 * line chart
 *      daily
 *          trips/h
 *          $/h
 * 
 * 
 * 'One Chart to Rule Them All'
 *      can look at daily/weekly/monthly(/hourly?) stats such as:
 *          % of time that is:
 *              paid
 *              uptime
 *              spent waiting
 *              spent driving to pickup
 *              spent driving with passenger
 *          hours worked
 *          # of trips, long pickups/waits
 *          $/h, surge $/h
 *      group stats into separate axes to make side-by-side comparison easier
 * 
 * same as the last chart but look at "the average monday, tuesday, wed...."
 *      maybe use an EMA of sorts to make this chart more relevant to the present
 * 
 * 
 * eventually go back into simulation.js and try to bring it more in-line with reality - close up the downtime gaps
 *      i can probably make a debug chart to help visualize this
 * 
 * fit some bar charts in here too
 *      maybe a stacked bar showing source of income? (long pickup, fare, surge, tip)
 *          might be better as just a pie
 * 
 * bell curve showing trips/h
 * bell curve showing $ per hour
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * reincorporate 'removed trips' for more accurate reflection of tip income
 * 
 * confirm in process-files that the dropped file is actually an uber statement lol
 */