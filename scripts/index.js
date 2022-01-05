'use strict';

const { processFiles } = require('./scripts/process-files.js');
const { simulateTimes, secondsBetween } = require('./scripts/simulation.js');
const $ = require('jquery')
const Highcharts = require('highcharts/highstock');
require('highcharts/indicators/indicators')(Highcharts);


var data = [];// for testing purposes

// listeners for statement input
const input = $('#input-box');
input[0].addEventListener('dragover', ev => {
    ev.preventDefault();
    input.addClass('drag')
});
input[0].addEventListener('dragleave', () => input.removeClass('drag'));
input[0].addEventListener('drop', ev => {
    ev.preventDefault();
    $('#input-view').addClass('hidden')
    $('#analysis-view').removeClass('hidden');
    // converts files into array of trip objects
    processFiles(ev.dataTransfer.files)
        .then(d => data = d)
        .finally(analyze);
});
// listeners for charts
const type = $('#type')[0];
const aggregation = $('#aggregation')[0];
const period = $('#period')[0];
type.addEventListener('change', () => {
    renderChart();
});
aggregation.addEventListener('change', () => {
    // hides the time period dropdown cause it's only for aggregated data
    if (aggregation.value == 'none') $('.period').addClass('hidden');
    else $('.period').removeClass('hidden');
    // shows/hides fields in period dropdown depending on aggregate
    if (aggregation.value == 'days') {
        $('.weekdays').addClass('hidden');
        $('.week').removeClass('hidden');
    }
    renderChart();
});
period.addEventListener('change', () => {
    renderChart();
});

var chart;
// analyzes trips, separating them into days
function analyze() {
    const days = simulateTimes(data);
    const charts = buildCharts(days);
    data = charts;// for testing purposes
    
    renderChart()
    //chart = Highcharts.chart('chart', charts.timeline)

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

var charts;

function buildCharts(d) {
    var days = d
    charts = {days: days};// days is here for testing
    addMethods(days)
    buildScatter(days, charts)
    buildScatterDayWeek(charts)
    return charts
}
function addMethods(/**@type {q}*/days) {
    for (let day of days) {
        day.hours = function () {
            return Math.round(secondsBetween(this.model.startTime, this.model.endTime) / 36) / 100;
        };
        day.earned = function () {
            var total = 0;
            for (let trip of this.trips) total += trip.fare.total;
            return total;
        };
        day.surge = function () {
            var surge = 0;
            for (let trip of this.trips) surge += trip.fare.surge;
            return surge;
        };
        day.tips = function () {
            var tips = 0;
            for (let trip of this.trips) tips += trip.fare.tip;
            return tips;
        };
    }
}
function buildScatter(/**@type {q}*/days, charts) {
    charts.scatter = {};
    charts.scatter.none = {
        chart: {
            type: 'scatter',
            backgroundColor: '#252525'
        },
        title: {
            text: 'Idk what to put here',
            style: {
                'font-family': 'Arial',
                'font-size': '2.1em',
                color: '#d8d8d8'
            }
        },
        subtitle: {
            text: 'Idk what to put here either',
            style: {
                'font-family': 'Arial',
                'font-size': '1.4em',
                color: '#d0d0d0'
            }
        },
        legend: {
            itemStyle: {
                'font-family': 'Arial',
                color: '#808080'
            }
        },
        tooltip: {
            headerFormat: '<b>{series.name}</b><br>',
            pointFormat: '{point.x:%e. %b}: {point.y:.2f}'
        },
        xAxis: {
            type: 'datetime',
            title: {
                text: 'Date',
                style: {
                    'font-family': 'Arial',
                    'font-size': '1.7em',
                    color: '#808080'
                }
            },
            crosshair: true,
            gridLineWidth: 1,
            gridLineDashStyle: 'ShortDot',
            gridLineColor: '#000000',
            lineColor: '#000000',
            tickColor: '#000000'
        },
        yAxis: {
            title: {
                text: 'Somethin or another',
                style: {
                    'font-family': 'Arial',
                    'font-size': '1.7em',
                    color: '#808080'
                }
            },
            crosshair: true,
            gridLineColor: '#000000',
            min: 0
        },
        plotOptions: {
            ema: {
                marker: { enabled: false }
            }
        },
        series: [
            {
                name: 'Hours',
                id: 'h',
                color: '#6cf',
                data: []
            }, {
                name: 'Trips/hour',
                id: 't/h',
                color: '#39F',
                data: []
            }, {
                name: '$/hour',
                id: '$/h',
                color: '#00981c',
                data: []
            }, {
                name: 'Surge $/hour',
                id: 's$/h',
                color: '#c00',
                data: []
            }, {
                name: 'Tips $/hour',
                id: 't$/h',
                color: '#e6e300',
                data: []
            }, {
                type: 'ema',
                linkedTo: 't/h',
                color: '#39F',
                params: { period: 15 }
            }, {
                type: 'ema',
                linkedTo: '$/h',
                color: '#00981c',
                params: { period: 15 }
            }, {
                type: 'ema',
                linkedTo: 's$/h',
                color: '#c00',
                params: { period: 15 }
            }, {
                type: 'ema',
                linkedTo: 't$/h',
                color: '#e6e300',
                params: { period: 15 }
            }
        ]
    };
    const series = charts.scatter.none.series
    for (let day of days) {
        const time = day.model.startTime.getTime();
        const hours = day.hours();
        series[0].data.push([time, hours]);
        const tripsPH = Math.round(day.trips.length / hours * 100) / 100;
        series[1].data.push([time, tripsPH]);
        const dollarsPH = Math.round(day.earned() / hours) / 100;
        series[2].data.push([time, dollarsPH]);
        const surgePH = Math.round(day.surge() / hours) / 100;
        series[3].data.push([time, surgePH]);
        const tipsPH = Math.round(day.tips() / hours) / 100;
        series[4].data.push([time, tipsPH]);
    }
}
function buildScatterDayWeek(charts) {
    charts.scatter.days = {};
    charts.scatter.days.week = {
        chart: {
            type: 'spline',
            backgroundColor: '#252525'
        },
        title: {
            text: 'Idk what to put here',
            style: {
                'font-family': 'Arial',
                'font-size': '2.1em',
                color: '#d8d8d8'
            }
        },
        subtitle: {
            text: 'Idk what to put here either',
            style: {
                'font-family': 'Arial',
                'font-size': '1.4em',
                color: '#d0d0d0'
            }
        },
        legend: {
            itemStyle: {
                'font-family': 'Arial',
                color: '#808080'
            }
        },
        tooltip: {
            headerFormat: '<b>{series.name}</b><br>',
            pointFormat: '{point.x:%e. %b}: {point.y:.2f}'
        },
        xAxis: {
            title: {
                text: 'Date',
                style: {
                    'font-family': 'Arial',
                    'font-size': '1.7em',
                    color: '#808080'
                }
            },
            crosshair: true,
            gridLineWidth: 1,
            gridLineDashStyle: 'ShortDot',
            gridLineColor: '#000000',
            lineColor: '#000000',
            tickColor: '#000000'
        },
        yAxis: {
            title: {
                text: 'Somethin or another',
                style: {
                    'font-family': 'Arial',
                    'font-size': '1.7em',
                    color: '#808080'
                }
            },
            crosshair: true,
            gridLineColor: '#000000',
            min: 0
        },
        plotOptions: {
            ema: {
                marker: { enabled: false }
            }
        },
        series: [
            {
                name: 'Hours',
                id: 'h',
                color: '#6cf',
                data: []
            }, {
                name: 'Trips/hour',
                id: 't/h',
                color: '#39F',
                data: []
            }, {
                name: '$/hour',
                id: '$/h',
                color: '#00981c',
                data: []
            }, {
                name: 'Surge $/hour',
                id: 's$/h',
                color: '#c00',
                data: []
            }, {
                name: 'Tips $/hour',
                id: 't$/h',
                color: '#e6e300',
                data: []
            }, {
                type: 'ema',
                linkedTo: 't/h',
                color: '#39F',
                params: { period: 15 }
            }, {
                type: 'ema',
                linkedTo: '$/h',
                color: '#00981c',
                params: { period: 15 }
            }, {
                type: 'ema',
                linkedTo: 's$/h',
                color: '#c00',
                params: { period: 15 }
            }, {
                type: 'ema',
                linkedTo: 't$/h',
                color: '#e6e300',
                params: { period: 15 }
            }
        ]
    };
    class Day {
        constructor(d) {
            this.day = d;
            this.days = 0;
            this.hours = 0;
            this.tripsPH = 0;
            this.dollarsPH = 0;
            this.surgePH = 0;
            this.tipsPH = 0;
        }
    }
    const weekdays = {
        mon: new Day(0),
        tue: new Day(1),
        wed: new Day(2),
        thu: new Day(3),
        fri: new Day(4),
        sat: new Day(5),
        sun: new Day(6)
    };
    const s0 = charts.scatter.none.series[0].data;
    const s1 = charts.scatter.none.series[1].data;
    const s2 = charts.scatter.none.series[2].data;
    const s3 = charts.scatter.none.series[3].data;
    const s4 = charts.scatter.none.series[4].data;
    for (let i=0; i < s0.length; i++) {
        // determines day of week
        let d = new Date(s1[i][0]).getDay();
        var weekday = d == 0 ? weekdays.sun:
            d == 1 ? weekdays.mon:
            d == 2 ? weekdays.tue:
            d == 3 ? weekdays.wed:
            d == 4 ? weekdays.thu:
            d == 5 ? weekdays.fri: weekdays.sat;
        // adds data to proper weekday
        weekday.days ++;
        weekday.hours += s0[i][1];
        weekday.tripsPH += s1[i][1];
        weekday.dollarsPH += s2[i][1];
        weekday.surgePH += s3[i][1];
        weekday.tipsPH += s4[i][1];
    }
    const series = charts.scatter.days.week.series;
    for (let day in weekdays) {
        // turns aggregated values into averages
        const d = weekdays[day];
        d.hours = Math.round(d.hours * 100 / d.days) / 100;
        d.tripsPH = Math.round(d.tripsPH * 100 / d.days) / 100;
        d.dollarsPH = Math.round(d.dollarsPH * 100 / d.days) / 100;
        d.surgePH = Math.round(d.surgePH * 100 / d.days) / 100;
        d.tipsPH = Math.round(d.tipsPH * 100 / d.days) / 100;
        // puts the data into the chart
        series[0].data.push([d.day, weekdays[day].hours]);
        series[1].data.push([d.day, weekdays[day].tripsPH]);
        series[2].data.push([d.day, weekdays[day].dollarsPH]);
        series[3].data.push([d.day, weekdays[day].surgePH]);
        series[4].data.push([d.day, weekdays[day].tipsPH]);
    }
}


// chooses proper chart to render based on dropdown selections
function renderChart() {
    const type = $('#type')[0].value;
    const aggregation = $('#aggregation')[0].value;
    const period = $('#period')[0].value;
    try {
        if (type == 'scatter') {
            if (aggregation == 'none') chart = Highcharts.chart('chart', charts.scatter.none);
            else if (aggregation == 'days') {
                if (period == 'week') chart = Highcharts.chart('chart', charts.scatter.days.week);
            }
        }
    } catch (err) {
        console.log('chart not available' + err)
    };
}

// three dropdowns, one to select chart type, one to select aggregation type, one to select time period

// scatter - daily (weekly, monthy, hourly) - week (sun, mon, tues, etc..)


/**
 * aggregated day/week/month data
 * 
 * scatter chart
 *      daily
 *          # of trips, long pickups/waits
 * 
 * 
 * aggregated chart showing every hour in a week's stats
 * 
 * 'One Chart to Rule Them All'
 *      can look at daily/weekly/monthly(/hourly?) stats such as:
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
 * 100% area chart
 *      % of time that is:
 *              paid
 *              downtime
 *              spent waiting
 *              paid wait
 *              spent driving to pickup
 *              paid pickup
 *              spent driving with passenger
 * 
 * 
 * 
 * confirm in process-files that the dropped file is actually an uber statement lol
 */