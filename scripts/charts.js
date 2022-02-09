'use strict';

const Highcharts         = require('highcharts/highstock');
require('highcharts/indicators/indicators')(Highcharts);

// imports for testing purposes
const { Trip } = require('/UberAnal/scripts/process-files.js'); // for intellisense
const { secondsBetween } = require('/UberAnal/scripts/utility.js');


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
});


/** Chooses proper chart to render based on dropdown selections */
function renderChart() {

}

const debugChart = {
    chart: {
        type: 'area',
        zoomType: 'x'
    },
    title: { text: 'Debugging chart visualizing times' },
    tooltip: { xDateFormat: '%a, %B %e %l:%M:%S %p' },
    rangeSelector: { enabled: true },
    navigator: { enabled: true },
    scrollbar: { enabled: true },
    xAxis: {
        type: 'datetime',
        title: { text: 'Date' }
    },
    yAxis: { title: { enabled: false } },
    series: [
        {
            name: 'Pickup',
            color: '#0c4cff',
            data: [
                [trips[0].dateTime.getTime(), 0],
                [trips[0].dateTime.getTime() + 1, null]
            ]
        }, {
            name: 'Wait',
            color: '#fff041',
            data: [
                [trips[0].dateTime.getTime(), 0],
                [trips[0].dateTime.getTime() + 1, null]
            ]
        }, {
            name: 'Fare',
            color: '#1bbb28',
            data: [
                [trips[0].dateTime.getTime(), 0],
                [trips[0].dateTime.getTime() + 1, null]
            ]
        }, {
            name: 'Downtime',
            color: '#e50fde',
            data: [
                [trips[0].dateTime.getTime(), 0],
                [trips[0].dateTime.getTime() + 1, null]
            ]
        }, 
    ]
};
/** Generates chart that visualizes every key time point in every trip for help tuning the simulation
 * @param {Trip[]} trips */
function debuggingTimeVisualization(trips) {
    const pickup = debugChart.series[0].data;
    const wait = debugChart.series[1].data;
    const fare = debugChart.series[2].data;
    const downtime = debugChart.series[3].data;





    const lastTime = new Date(trips[0].model.times.start);
    for (const trip of trips) {
        if (trip.model.blockStart) lastTime.setTime(trip.model.times.start.getTime());
        //adds to downtime if there's a gap
        if (secondsBetween(lastTime, trip.model.times.start) > 0) {
            push(downtime, lastTime, trip.model.times.start);
        }
        // adds to pickup, wait, and fare
        push(pickup, lastTime, trip.model.times.wait);
        push(wait, lastTime, trip.model.times.fare);
        push(fare, lastTime, trip.model.times.end);
    }
    for (const series of debugChart.series) series.data.splice(0, 2);
    Highcharts.chart('chart', debugChart);
}
/** Pushes line segment to a series */
function push(data, lastTime, time) {
    const total = data[data.length-2][1];
    data.push(
        [lastTime.getTime(), total],
        [
            time.getTime(),
            total + secondsBetween(lastTime, time)
        ],
        [time.getTime() + 1, null]
    )
    lastTime.setTime(time.getTime());
}


exports.renderChart = renderChart;

// exports for testing
exports.debuggingTimeVisualization = debuggingTimeVisualization;


// get debugging chart to overlay newer data over older data
// make the debugging chart 3d? lol