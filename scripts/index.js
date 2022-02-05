'use strict';

const { processFiles } = require('/UberAnal/scripts/process-files.js');
const { simulation } = require('/UberAnal/scripts/simulation.new.js');
const { secondsBetween } = require('/UberAnal/scripts/utility.js');
//const { session } = require('electron')
//const { Settings } = require('/UberAnal/scripts/settings.js');
const $ = require('jquery')
const Highcharts = require('highcharts/highstock');
require('highcharts/indicators/indicators')(Highcharts);

//const cook = session.defaultSession.cookies;

// sets default values for charts
Highcharts.setOptions({
    time: { useUTC: false },
    chart: {
        backgroundColor: '#252525',
        style: { fontFamily: 'Arial' }
    },
    title: {
        style: {
            'font-size': '2.1em',
            color: '#d8d8d8'
        }
    },
    subtitle: {
        style: {
            'font-size': '1.3em',
            color: '#d0d0d0'
        }
    },
    caption: { style: { color: '#808080' } },
    tooltip: {
        headerFormat: '<b>{point.key}</b><br>',
        pointFormat: '<span style="fill:{point.color}">●</span> {point.series.name}: <b>{point.y}</b><br>',
        valueDecimals: 2,
        split: true,
        xDateFormat: '%a, %B %e'
    },
    credits: {
        href: undefined,
        style: {
            color: '#808080',
            cursor: undefined
        }
    },
    legend: { itemStyle: { color: '#808080' } },
    rangeSelector: {
        inputEnabled: false,
        floating: true,
        y: 10
    },
    scrollbar: {
        liveRedraw: true,
        barBackgroundColor: 'gray',
        barBorderRadius: 7,
        barBorderWidth: 0,
        buttonBackgroundColor: 'gray',
        buttonBorderWidth: 0,
        buttonArrowColor: 'white',
        buttonBorderRadius: 7,
        rifleColor: 'white',
        trackBackgroundColor: 'lightGrey',
        trackBorderWidth: 1,
        trackBorderColor: 'silver',
        trackBorderRadius: 7
    },
    xAxis: {
        title: {
            style: {
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
            style: {
                'font-size': '1.7em',
                color: '#808080'
            }
        },
        gridLineColor: '#000000',
        min: 0
    }
})

var chart;
var test = [];// for testing purposes

// listeners for statement input
const input = $('#input-box');
const inputOverlay = $('#input-overlay')[0];
inputOverlay.addEventListener('dragover', ev => {
    ev.preventDefault();
});
inputOverlay.addEventListener('dragenter', () => input.addClass('drag'));
inputOverlay.addEventListener('dragleave', () => input.removeClass('drag'));
inputOverlay.addEventListener('drop', ev => {
    ev.preventDefault();
    input.removeClass('drag');
    // converts files into array of trip objects
    processFiles(ev.dataTransfer.files).then(data => {
        $('#input-view').addClass('hidden');
        $('#analysis-view').removeClass('hidden');
        analyze(data);
    })
});
// listeners for chart selection
$('#type').on('change', () => {
    if ($('#type')[0].value == 'scatter') {
        $('.none').removeClass('hidden');
        $('.hours').removeClass('hidden');
        $('.days').removeClass('hidden');
        $('.weeks').addClass('hidden');
        $('.months').addClass('hidden');
        $('.years').addClass('hidden');
    }
    const aggregation = $('#aggregation');
    if ($(`.${aggregation[0].value}`).hasClass('hidden')) {
        for (let child of $('#aggregation')[0].children) {
            if (!child.classList.contains('hidden')) {
                aggregation[0].value = child.value;
                aggregation.trigger('change');
                break;
            }
        }
    } else renderChart();
});
$('#aggregation').on('change', () => {
    const aggregation = $('#aggregation')[0];
    if ($('#type')[0].value == 'scatter') {
        if (aggregation.value == 'none') {
            $('.all').removeClass('hidden');
            $('.week').addClass('hidden');
            $('.weekdays').removeClass('hidden');
        } else if (aggregation.value == 'hours') {
            $('.all').addClass('hidden');
            $('.week').removeClass('hidden');
            $('.weekdays').removeClass('hidden');
        } else if (aggregation.value == 'days') {
            $('.all').addClass('hidden');
            $('.week').removeClass('hidden');
            $('.weekdays').addClass('hidden');
        }
    }
    const period = $('#period');
    if ($(`.${period[0].value}`).hasClass('hidden')) {
        for (let child of period[0].children) {
            if (!child.classList.contains('hidden')) {
                period[0].value = child.value;
                period.trigger('change');
                break;
            }
        }
    } else renderChart();
});
$('#period').on('change', () => {
    renderChart();
});
// settings listeners
$('#settings-button').on('click', () => {
    $('#settings-view').removeClass('hidden');
})
$('#settings-cancel').on('click', () => {
    $('#settings-view').addClass('hidden');
})


// analyzes trips separating them into days and builds charts
function analyze(data) {
    debugger;
    const days = simulation(data);
    //const charts = buildCharts(days);
    //renderChart();
    //test = charts;// for testing purposes
    test = days;// for testing purposes
    

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
    addMethods(days);
    buildScatterNoneAll(days, charts);
    buildScatterDaysWeek(charts);
    buildScatterHours(days, charts);
    buildScatterNoneWeekdays(charts)
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
function buildScatterNoneAll(/**@type {q}*/days, charts) {
    charts.scatter = {};
    charts.scatter.none = {};
    charts.scatter.none.all = {
        chart: {
            type: 'line',
            zoomType: 'x'
        },
        title: { text: 'Daily Stats' },
        subtitle: {  text: 'With 14 day exponential moving average' },
        caption: { text: 'Click and drag to zoom, or use the navigator at the bottom, or the buttons at the top' },
        tooltip: {
            split: false,
            shared: true
        },
        plotOptions: {
            line: {
                lineWidth: 0,
                states: {
                    hover: { lineWidthPlus: 0 }
                },
                marker: { enabled: true }
            },
            ema: {
                marker: { enabled: false },
                tooltip: { valueDecimals: 2 }
            }
        },
        rangeSelector: { enabled: true },
        navigator: { enabled: true },
        scrollbar: { enabled: true },
        xAxis: {
            type: 'datetime',
            title: { text: 'Date' }
        },
        yAxis: {
            title: { enabled: false },
            crosshair: true
        },
        series: [
            {
                name: 'Trips/hour',
                id: 't/h',
                zIndex: 6,
                color: '#39F',
                data: []
            }, {
                name: 'Hours',
                zIndex: 2,
                color: '#6cf',
                data: []
            }, {
                name: '$/hour',
                id: '$/h',
                zIndex: 3,
                tooltip: { valuePrefix: '$' },
                color: '#00981c',
                data: []
            }, {
                name: 'Surge $/hour',
                id: 's$/h',
                zIndex: 5,
                tooltip: { valuePrefix: '$' },
                color: '#c00',
                data: []
            }, {
                name: 'Tips $/hour',
                id: 't$/h',
                zIndex: 4,
                tooltip: { valuePrefix: '$' },
                color: '#e6e300',
                data: []
            }, {
                type: 'ema',
                name: 'Trips/hour EMA',
                linkedTo: 't/h',
                zIndex: 6,
                color: '#39F',
                params: { period: 14 }
            }, {
                type: 'ema',
                name: '$/hour EMA',
                linkedTo: '$/h',
                zIndex: 3,
                tooltip: { valuePrefix: '$' },
                color: '#00981c',
                params: { period: 14 }
            }, {
                type: 'ema',
                name: 'Surge $/hour EMA',
                linkedTo: 's$/h',
                zIndex: 5,
                tooltip: { valuePrefix: '$' },
                color: '#c00',
                params: { period: 14 }
            }, {
                type: 'ema',
                name: 'Tips $/hour EMA',
                linkedTo: 't$/h',
                zIndex: 4,
                tooltip: { valuePrefix: '$' },
                color: '#e6e300',
                params: { period: 14 }
            }
        ]
    };
    const series = charts.scatter.none.all.series
    for (let day of days) {
        const time = day.model.startTime.getTime();
        const hours = day.hours();
        series[1].data.push([time, hours]);
        const tripsPH = Math.round(day.trips.length / hours * 100) / 100;
        series[0].data.push([time, tripsPH]);
        const dollarsPH = Math.round(day.earned() / hours) / 100;
        series[2].data.push([time, dollarsPH]);
        const surgePH = Math.round(day.surge() / hours) / 100;
        series[3].data.push([time, surgePH]);
        const tipsPH = Math.round(day.tips() / hours) / 100;
        series[4].data.push([time, tipsPH]);
    }
}
function buildScatterDaysWeek(charts) {
    charts.scatter.days = {};
    charts.scatter.days.week = {
        chart: { type: 'spline' },
        title: { text: 'Average Daily Stats' },
        xAxis: {
            title: {  text: 'Day' },
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
            title: { enabled: false }
        },
        series: [
            {
                name: 'Trips/hour',
                zIndex: 6,
                color: '#39F',
                data: []
            }, {
                name: 'Hours',
                color: '#6cf',
                data: []
            }, {
                name: '$/hour',
                zIndex: 3,
                tooltip: { valuePrefix: '$' },
                color: '#00981c',
                data: []
            }, {
                name: 'Surge $/hour',
                zIndex: 5,
                tooltip: { valuePrefix: '$' },
                color: '#c00',
                data: []
            }, {
                name: 'Tips $/hour',
                zIndex: 4,
                tooltip: { valuePrefix: '$' },
                color: '#e6e300',
                data: []
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
    const s0 = charts.scatter.none.all.series[0].data;
    const s1 = charts.scatter.none.all.series[1].data;
    const s2 = charts.scatter.none.all.series[2].data;
    const s3 = charts.scatter.none.all.series[3].data;
    const s4 = charts.scatter.none.all.series[4].data;
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
function buildScatterHours(/**@type {q}*/days, charts) {
    class DayChart {
        constructor(title) {
            this.chart = {
                type: 'spline',
                zoomType: 'x',
                alignTicks: false
            };
            this.title = { text: `Average Hourly Stats on ${title}` };
            this.subtitle = {
                text: "Hourly stats are experimental, first and last segments of each line can't be trusted",
                style: { 'font-size': '1.1em' }
            };
            this.caption = { text: 'Time stats are extra experimental, downtime is overexagerated. Click and drag to zoom' };
            this.plotOptions = {
                area: {
                    stacking: 'normal',
                    lineColor: '#565656',
                    lineWidth: 1,
                    marker: { enabled: false },
                    yAxis: 1,
                    opacity: .3,
                    tooltip: {
                        valueSuffix: '%',
                        valueDecimals: 1
                    }
                }
            };
            this.xAxis = {
                title: { text: 'Hour' },
                categories: ['8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm', '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am']
            };
            this.yAxis = [{
                title: { text: 'Dollars / trips' }
            }, {
                title: { text: '% of hour' },
                labels: { format: '{value}%' },
                opposite: true,
                gridLineWidth: 0,
                max: 100
            }];
            this.series = [
                {
                    name: 'Trips',
                    zIndex: 6,
                    color: '#39F',
                    data: []
                }, {
                    name: 'Dollars',
                    zIndex: 3,
                    tooltip: { valuePrefix: '$' },
                    color: '#00981c',
                    data: []
                }, {
                    name: 'Surge $',
                    zIndex: 5,
                    tooltip: { valuePrefix: '$' },
                    color: '#c00',
                    data: []
                }, {
                    name: 'Tip $',
                    zIndex: 4,
                    tooltip: { valuePrefix: '$' },
                    color: '#e6e300',
                    data: []
                }, {
                    name: 'Fare time',
                    type: 'area',
                    color: '#2de6fd',
                    data: []
                }, {
                    name: 'Wait time',
                    type: 'area',
                    color: '#3730ff',
                    data: []
                }, {
                    name: 'Pickup time',
                    type: 'area',
                    color: '#ce2dfd',
                    data: []
                }, {
                    name: 'Downtime',
                    type: 'area',
                    color: '#fd2d76',
                    data: []
                }
            ]
        }
    }
    charts.scatter.hours = {
        week: {
            chart: {
                type: 'spline',
                zoomType: 'x',
                alignTicks: false
            },
            title: { text: 'Average Hourly Stats' },
            subtitle: {
                text: "Hourly stats are experimental, first and last segments of each line can't be trusted",
                style: { 'font-size': '1.1em' }
            },
            caption: { text: 'Time stats are extra experimental, downtime is overexagerated. Click and drag to zoom' },
            plotOptions: {
                area: {
                    stacking: 'normal',
                    lineColor: '#565656',
                    lineWidth: 1,
                    marker: { enabled: false },
                    yAxis: 1,
                    opacity: .3,
                    tooltip: {
                        valueSuffix: '%',
                        valueDecimals: 1
                    }
                }
            },
            xAxis: {
                title: { text: 'Day & Hour' },
                categories: []
            },
            yAxis: [{
                title: { text: 'Dollars / trips' }
            }, {
                title: { text: '% of hour' },
                labels: { format: '{value}%' },
                opposite: true,
                gridLineWidth: 0,
                max: 100
            }],
            series: [
                {
                    name: 'Trips',
                    zIndex: 6,
                    color: '#39F',
                    data: []
                }, {
                    name: 'Dollars',
                    zIndex: 3,
                    tooltip: { valuePrefix: '$' },
                    color: '#00981c',
                    data: []
                }, {
                    name: 'Surge $',
                    zIndex: 5,
                    tooltip: { valuePrefix: '$' },
                    color: '#c00',
                    data: []
                }, {
                    name: 'Tip $',
                    zIndex: 4,
                    tooltip: { valuePrefix: '$' },
                    color: '#e6e300',
                    data: []
                }, {
                    name: 'Fare time',
                    type: 'area',
                    color: '#2de6fd',
                    data: []
                }, {
                    name: 'Wait time',
                    type: 'area',
                    color: '#3730ff',
                    data: []
                }, {
                    name: 'Pickup time',
                    type: 'area',
                    color: '#ce2dfd',
                    data: []
                }, {
                    name: 'Downtime',
                    type: 'area',
                    color: '#fd2d76',
                    data: []
                }
            ]
        },
        mon: new DayChart('Mondays'),
        tue: new DayChart('Tuesdays'),
        wed: new DayChart('Wednesdays'),
        thu: new DayChart('Thursdays'),
        fri: new DayChart('Fridays'),
        sat: new DayChart('Saturdays'),
        sun: new DayChart('Sundays')
    };
    class Hour {
        constructor(h) {
            this.hour = h;
            this.hours = 0;
            this.modified = false;
            this.trips = 0;
            this.dollars = 0;
            this.surge = 0;
            this.tips = 0;
            this.pickup = 0;
            this.wait = 0;
            this.fare = 0;
            this.downtime = 0;
        }
    }
    class Day {
        constructor(d) {
            this.day = d;
            for (let i=0; i<24; i++) {
                this[i] = new Hour(i);
            }
        }
    }
    const week = {
        mon: new Day(0),
        tue: new Day(1),
        wed: new Day(2),
        thu: new Day(3),
        fri: new Day(4),
        sat: new Day(5),
        sun: new Day(6)
    };
    // this allll assumes that a trip will not span more than 2 separate hours, kinda breaks otherwise
    for (let day of days) {
        var d = day.model.startTime.getDay();
        var weekday = d == 0 ? week.sun:
            d == 1 ? week.mon:
            d == 2 ? week.tue:
            d == 3 ? week.wed:
            d == 4 ? week.thu:
            d == 5 ? week.fri: week.sat;
        //var wrap = false;
        //if (day.model.startTime.getDay() != day.model.endTime.getDay()) wrap = true;
        // configures first and last hour multipliers
        const firstHour = day.model.startTime.getHours();
        let s = day.model.startTime.getMinutes() * 60;
        s += day.model.startTime.getSeconds();
        const firstHourMultiplier = 3600 / (3600 -  s);
        const lastHour = day.model.endTime.getHours();
        s = day.model.endTime.getMinutes() * 60 + day.model.endTime.getSeconds();
        const lastHourMultiplier = /*firstHour == lastHour ? 1 :*/ 3600 / s;
        if (firstHour == lastHour) {
            // if entire day is contained within a single hour, special multiplier rules apply
            if (day.trips.length == 1) {
                firstHourMultiplier = 3600 / secondsBetween(
                    day.trips[0].model.times.start, day.trips[0].model.times.end);
            } else {
                firstHourMultiplier = 3600 / secondsBetween(
                    day.trips[0].model.times.start, day.trips[day.trips.length-1].model.times.end)
            }
        }
        var lastTripEnd = undefined;
        for (let trip of day.trips) {
            const times = trip.model.times;
            const durations = trip.model.durations;
            const startHour = times.start.getHours();
            const hour = weekday[startHour];
            const previousHour = weekday[startHour-1 == -1 ? 23 : startHour-1];
            const nextHour = weekday[startHour+1 == 24 ? 0 : startHour+1];
            hour.modified = true;
            const X = startHour == firstHour ? firstHourMultiplier : startHour == lastHour ? lastHourMultiplier : 1;
            const Y = times.end.getHours() != startHour && times.end.getHours() == lastHour ? lastHourMultiplier : 1;
            // distribute downtime
            //if (day.date == 'Sat Apr 24 2021') debugger;
            if (lastTripEnd == undefined) lastTripEnd = times.end;
            else {
                if (startHour == lastTripEnd.getHours()) {
                    //if downtime is contained in a single hour
                    hour.downtime += secondsBetween(lastTripEnd, times.start) * X;
                } else {
                    //if downtime spans multiple hours
                    let Z = 1;
                    if (previousHour.hour == firstHour) Z = firstHourMultiplier;
                    let s = secondsBetween(lastTripEnd, times.start);
                    const splitThis = times.start.getMinutes() * 60 + times.start.getSeconds();
                    const splitLast = s - splitThis;
                    hour.downtime += splitThis * X;
                    previousHour.downtime += splitLast * Z;
                }
                lastTripEnd = times.end;
            }
            // distributes other values
            if (startHour == times.end.getHours()) {
                // if trip is fully contained in a single hour
                hour.trips += 1 * X;
                hour.dollars += trip.fare.total * X;
                hour.surge += trip.fare.surge * X;
                hour.tips += trip.fare.tip * X;
                hour.fare += durations.fare * X;
                hour.pickup += (durations.pickup + durations.longPickup) * X;
                hour.wait += (durations.wait + durations.longWait) * X;
            } else {
                // if trip spans multiple hours
                nextHour.modified = true
                if (startHour == times.wait.getHours()) {
                    // if pickup is contained in a single hour
                    hour.pickup += (durations.pickup + durations.longPickup) * X;
                } else {
                    // if pickup spans multiple hours
                    const splitNext = times.wait.getMinutes() * 60 + times.wait.getSeconds();
                    const splitThis = durations.pickup + durations.longPickup - splitNext;
                    hour.pickup += splitThis * X;
                    nextHour.pickup += splitNext * Y;
                }
                if (times.wait.getHours() == times.fare.getHours()) {
                    // if wait is contained in a single hour
                    if (startHour == times.wait.getHours()) {
                        hour.wait += (durations.wait + durations.longWait) * X;
                    } else {
                        nextHour.wait += durations.wait + durations.longWait * Y;
                    }
                } else {
                    // if wait spans multiple hours
                    const splitNext = times.fare.getMinutes() * 60 + times.fare.getSeconds();
                    const splitThis = durations.pickup + durations.longPickup - splitNext;
                    hour.wait += splitThis * X;
                    nextHour.wait += splitNext * Y;

                }
                if (times.fare.getHours() == times.end.getHours()) {
                    // if fare is contained in a single hour
                    nextHour.wait += durations.wait + durations.longWait * Y;
                } else {
                    // if fare spans multiple hours
                    const splitNext = times.end.getMinutes() * 60 + times.end.getSeconds();
                    const splitThis = durations.fare - splitNext;
                    hour.fare += splitThis * X;
                    nextHour.fare += splitNext * Y;
                }
                const s = secondsBetween(times.start, times.end)
                const ratioNext = (times.end.getMinutes() * 60 + times.end.getSeconds()) / s;
                const ratioThis = (s - times.end.getMinutes() * 60 + times.end.getSeconds()) / s;
                hour.trips += ratioThis * X;
                nextHour.trips += ratioNext * Y;
                hour.dollars += trip.fare.total * ratioThis * X;
                nextHour.dollars += trip.fare.total * ratioNext * Y;
                hour.surge += trip.fare.surge * ratioThis * X;
                nextHour.surge += trip.fare.surge * ratioNext * Y;
                hour.tips += trip.fare.tip * ratioThis * X;
                nextHour.tips += trip.fare.tip * ratioNext * Y;
            }
            // logs any trips spanning more than 2 hours 
            if (times.end.getMinutes() * 60 + times.end.getSeconds() + 3600 <
                secondsBetween(times.start, times.end)) {
                    console.error(`trip spans more than two hours @ ${times.start.toDateString()}`);
                    console.error(`hourly data around this hour may be skewed`);
                }
        }
        for (let hour in weekday) {
            if (weekday[hour].modified) {
                weekday[hour].modified = false;
                weekday[hour].hours ++;
            }
        }
    }
    // processes the aggregated data into averages
    for (let day in week) {
        for (let hour in week[day]) {
            const h = week[day][hour];
            if (typeof h == 'number') continue;
            if (h.hours == 0) {
                // if hour has no data, enters null values so Highcharts renders a gap
                h.hours = null;
                h.trips = null;
                h.dollars = null;
                h.surge = null;
                h.tips = null;
                h.pickup = null;
                h.wait = null;
                h.fare = null;
                h.downtime = null;

            } else {
                h.trips = Math.round(h.trips * 100 / h.hours) / 100;
                h.dollars = Math.round(h.dollars / h.hours) / 100;
                h.surge = Math.round(h.surge / h.hours) / 100;
                h.tips = Math.round(h.tips / h.hours) / 100;
                h.pickup = Math.round(h.pickup / h.hours / 3.6) / 10;
                h.wait = Math.round(h.wait / h.hours / 3.6) / 10;
                h.fare = Math.round(h.fare / h.hours / 3.6) / 10;
                h.downtime = Math.round(h.downtime / h.hours / 3.6) / 10;
            }
        }
    }
    // enters daily data into chart object
    for (let day in week) {
        const series = charts.scatter.hours[day].series;
        for (let i=0; i<24; i++) {
            // this static integer is what would need to change to accomodate different day wrap times
            let x = i - 8;
            if (x < 0) x += 24;
            const hour = week[day][i];
            series[0].data.push([x, hour.trips]);
            series[1].data.push([x, hour.dollars]);
            series[2].data.push([x, hour.surge]);
            series[3].data.push([x, hour.tips]);
            series[4].data.push([x, hour.fare]);
            series[5].data.push([x, hour.wait]);
            series[6].data.push([x, hour.pickup]);
            series[7].data.push([x, hour.downtime]);
        }
        // wraps the actual array in the chart object
        for (let i=0; i<8; i++) {
            for (let j=0; j<8; j++) {
                if (series[i].data.length == 0) continue;
                series[i].data.push(series[i].data.shift());
            }
        }
    }
    // combines daily data into weekly chart
    const wSeries = charts.scatter.hours.week.series;
    for (let day in charts.scatter.hours) {
        if (day == 'week') continue;
        const dSeries = charts.scatter.hours[day].series;
        wSeries[0].data = JSON.parse(JSON.stringify(wSeries[0].data.concat(dSeries[0].data)));
        wSeries[1].data = JSON.parse(JSON.stringify(wSeries[1].data.concat(dSeries[1].data)));
        wSeries[2].data = JSON.parse(JSON.stringify(wSeries[2].data.concat(dSeries[2].data)));
        wSeries[3].data = JSON.parse(JSON.stringify(wSeries[3].data.concat(dSeries[3].data)));
        wSeries[4].data = JSON.parse(JSON.stringify(wSeries[4].data.concat(dSeries[4].data)));
        wSeries[5].data = JSON.parse(JSON.stringify(wSeries[5].data.concat(dSeries[5].data)));
        wSeries[6].data = JSON.parse(JSON.stringify(wSeries[6].data.concat(dSeries[6].data)));
        wSeries[7].data = JSON.parse(JSON.stringify(wSeries[7].data.concat(dSeries[7].data)));
    }
    for (let i=0; i<8; i++) {
        const d = wSeries[i].data;
        for (let j=0; j<d.length; j++) {
            d[j][0] = j;
        }
    }
    const categories = charts.scatter.hours.week.xAxis.categories
    for (let i=0; i<7; i++) {
        const day = i == 0 ? 'Mon':
            i == 1 ? 'Tue':
            i == 2 ? 'Wed':
            i == 3 ? 'Thu':
            i == 4 ? 'Fri':
            i == 5 ? 'Sat': 'Sun';
        for (let i=0; i<24; i++) {
            var ap = 'am';
            var hour = i;
            if (hour == 0) hour = 12;
            else if (hour > 12) {
                ap = 'pm';
                hour -= 12;
            }
            categories.push(`${day} ${hour + ap}`)
        }
    }
    for (let j=0; j<8; j++) {
        categories.push(categories.shift());
    }
    console.log(week);// for testing
}
function buildScatterNoneWeekdays(charts) {
    class DayChart {
        constructor(title) {
            this.chart = {
                type: 'line',
                zoomType: 'x'
            };
            this.title = { text: `Daily stats on ${title}` };
            this.subtitle = { text: "With 8 day exponential moving average" };
            this.caption = { text: 'Click and drag to zoom, or use the navigator at the bottom, or the buttons at the top' };
            this.tooltip = {
                split: false,
                shared: true
            };
            this.plotOptions = {
                line: {
                    lineWidth: 0,
                    states: {
                        hover: { lineWidthPlus: 0 }
                    },
                    marker: { enabled: true }
                },
                ema: {
                    marker: { enabled: false },
                    tooltip: { valueDecimals: 2 }
                }
            };
            this.rangeSelector = {  enabled: true };
            this.navigator = { enabled: true };
            this.scrollbar = { enabled: true };
            this.xAxis = {
                type: 'datetime',
                title: { text: 'Date' }
            };
            this.yAxis = [{
                title: { enabled: false },
                crosshair: true
            }];
            this.series = [
                {
                    name: 'Trips/hour',
                    id: 't/h',
                    zIndex: 6,
                    color: '#39F',
                    data: []
                }, {
                    name: 'Hours',
                    zIndex: 2,
                    color: '#6cf',
                    data: []
                }, {
                    name: '$/hour',
                    id: '$/h',
                    zIndex: 3,
                    tooltip: { valuePrefix: '$' },
                    color: '#00981c',
                    data: []
                }, {
                    name: 'Surge $/hour',
                    id: 's$/h',
                    zIndex: 5,
                    tooltip: { valuePrefix: '$' },
                    color: '#c00',
                    data: []
                }, {
                    name: 'Tips $/hour',
                    id: 't$/h',
                    zIndex: 4,
                    tooltip: { valuePrefix: '$' },
                    color: '#e6e300',
                    data: []
                }, {
                    type: 'ema',
                    name: 'Trips/hour EMA',
                    linkedTo: 't/h',
                    zIndex: 6,
                    color: '#39F',
                    params: { period: 8 }
                }, {
                    type: 'ema',
                    name: '$/hour EMA',
                    linkedTo: '$/h',
                    zIndex: 3,
                    tooltip: { valuePrefix: '$' },
                    color: '#00981c',
                    params: { period: 8 }
                }, {
                    type: 'ema',
                    name: 'Surge $/hour EMA',
                    linkedTo: 's$/h',
                    zIndex: 5,
                    tooltip: { valuePrefix: '$' },
                    color: '#c00',
                    params: { period: 8 }
                }, {
                    type: 'ema',
                    name: 'Tips $/hour EMA',
                    linkedTo: 't$/h',
                    zIndex: 4,
                    tooltip: { valuePrefix: '$' },
                    color: '#e6e300',
                    params: { period: 8 }
                }
            ]
        }
    }
    Object.assign(charts.scatter.none, {
        mon: new DayChart('Mondays'),
        tue: new DayChart('Tuesdays'),
        wed: new DayChart('Wednesdays'),
        thu: new DayChart('Thursdays'),
        fri: new DayChart('Fridays'),
        sat: new DayChart('Saturdays'),
        sun: new DayChart('Sundays')
    });
    class Day {
        constructor(d) {
            this.day = d;
            this.hours = [];
            this.trips = [];
            this.dollars = [];
            this.surge = [];
            this.tips = [];
        }
    }
    const week = {
        mon: new Day(0),
        tue: new Day(1),
        wed: new Day(2),
        thu: new Day(3),
        fri: new Day(4),
        sat: new Day(5),
        sun: new Day(6)
    };
    const allSeries = charts.scatter.none.all.series;
    const s0 = allSeries[0].data;
    const s1 = allSeries[1].data;
    const s2 = allSeries[2].data;
    const s3 = allSeries[3].data;
    const s4 = allSeries[4].data;
    const l = s0.length;
    for (let i=0; i<l; i++) {
        const d = new Date(s0[i][0]).getDay()
        const weekday = d == 0 ? week.sun:
            d == 1 ? week.mon:
            d == 2 ? week.tue:
            d == 3 ? week.wed:
            d == 4 ? week.thu:
            d == 5 ? week.fri: week.sat;
        weekday.trips.push([s0[i][0], s0[i][1]]);
        weekday.hours.push([s1[i][0], s1[i][1]]);
        weekday.dollars.push([s2[i][0], s2[i][1]]);
        weekday.surge.push([s3[i][0], s3[i][1]]);
        weekday.tips.push([s4[i][0], s4[i][1]]);
    }
    for (let day in week) {
        const series = charts.scatter.none[day].series;
        series[0].data = week[day].trips;
        series[1].data = week[day].hours;
        series[2].data = week[day].dollars;
        series[3].data = week[day].surge;
        series[4].data = week[day].tips;
    }
}




// chooses proper chart to render based on dropdown selections
function renderChart() {
    const type = $('#type')[0].value;
    const aggregation = $('#aggregation')[0].value;
    const period = $('#period')[0].value;
    try {
        chart = Highcharts.chart('chart', charts[type][aggregation][period]);
    } catch (err) {
        console.log('chart not available ' + err);
    };
}

// add option to cut off end of hourly data for a cleaner chart
// add option to change tooltip grouping to shared

// aggregation weeks - time period month/year


/**
 * aggregated week/month data
 * 
 * eventually go back into simulation.js and try to bring it more in-line with reality - close up the downtime gaps
 *      i can probably make a debug chart to help visualize this
 * 
 * fit some bar charts in here too
 *      maybe a stacked bar showing source of income? (long pickup, fare, surge, tip)
 *          might be better as just a pie
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
 */

// if working night shift, wrap hourly stuff around the day proper. add ability to change the wrap time

// include cancel rates in charts maybe



// whitelist in process-fies could be a Set instead of Array