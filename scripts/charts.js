'use strict';

const Highcharts         = require('highcharts/highstock');
require('highcharts/indicators/indicators')(Highcharts);

// imports for testing purposes
const { Trip }           = require('/UberAnal/scripts/process-files.js'); // for intellisense
const { secondsBetween } = require('/UberAnal/scripts/utility.js');
const { Settings }       = require('/UberAnal/scripts/settings.js');
const realTimes          = require('/UberAnal/data/real-data.json');


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
        title: { text: 'Date' },
        plotBands: []
    },
    yAxis: { title: { enabled: false } },
    series: [
        {
            name: 'Pickup',
            zIndex: 3,
            color: '#0c4cff',
            data: []
        }, {
            name: 'Old Pickup',
            zIndex: 2,
            color: '#0c4cff',
            data: []
        }, {
            name: 'Wait',
            zIndex: 3,
            color: '#fff041',
            data: []
        }, {
            name: 'Old Wait',
            zIndex: 2,
            color: '#fff041',
            data: []
        }, {
            name: 'Fare',
            zIndex: 3,
            color: '#1bbb28',
            data: []
        }, {
            name: 'Old Fare',
            zIndex: 2,
            color: '#1bbb28',
            data: []
        }, {
            name: 'Downtime',
            zIndex: 3,
            color: '#e50fde',
            data: []
        }, {
            name: 'Old Downtime',
            zIndex: 2,
            color: '#e50fde',
            data: []
        }
    ]
};
var setupRan = false;
/** Generates chart that visualizes every key time point in every trip for help tuning the simulation
 * @param {Trip[]} trips */
function debuggingTimeVisualization(trips) {
    if (!setupRan) {
        setupRan = true;
        debugger;
        const day = new Date();
        const bands = debugChart.xAxis.plotBands;
        var obj = { from: undefined, to: undefined, color: undefined };
        var dayFlipped = false;
        for (const time of realTimes.data) {
            if (time[0] == 'break') {
                day.setFullYear(time[1], time[2] - 1, time[3]);
                dayFlipped = false;
                obj = { from: undefined, to: undefined, color: undefined };
                continue;
            }
            if (time[0] < 12 && !dayFlipped) {
                day.setDate(day.getDate() + 1);
                dayFlipped = true;
            }
            const date = new Date(day);
            date.setHours(time[0], time[1], time[2], 0);
            if (obj.from != undefined) {
                obj.to = date.getTime();
                bands.push(obj);
            }
            obj = {
                from: date.getTime(),
                to: undefined,
                color: time[3] == 'p' ? '#0c4cff61' :
                    time[3] == 'w' ? '#fff04161' :
                    time[3] == 'f' ? '#1bbb2861' : '#e50fde61'
            };
        }
    }
    for (let i = 0; i < 8; i += 2) {
        debugChart.series[i+1].data = debugChart.series[i].data.splice(0);
    }
    const lastTime = new Date(trips[0].model.times.start);
    for (const trip of trips) {
        if (trip.model.blockStart) lastTime.setTime(trip.model.times.start.getTime());
        //adds to downtime if there's a gap
        if (secondsBetween(lastTime, trip.model.times.start) > 0) {
            push(debugChart.series[6].data, lastTime, trip.model.times.start);
        }
        // adds to pickup, wait, and fare
        push(debugChart.series[0].data, lastTime, trip.model.times.wait);
        push(debugChart.series[2].data, lastTime, trip.model.times.fare);
        push(debugChart.series[4].data, lastTime, trip.model.times.end);
    }
    Settings.chartObj = debugChart; // for testing purposes
    Settings.chart = Highcharts.chart('chart', debugChart); // for testing purposes
}
/** Pushes line segment to a series */
function push(seriesData, lastTime, time) {
    const total = seriesData[seriesData.length-2] != undefined ?
        seriesData[seriesData.length-2][1] : 0;
    seriesData.push(
        [lastTime.getTime(), total],
        [time.getTime(), total + secondsBetween(lastTime, time)],
        [time.getTime() + 1, null]
    )
    lastTime.setTime(time.getTime());
}


exports.renderChart = renderChart;

// exports for testing
exports.debuggingTimeVisualization = debuggingTimeVisualization;


// get debugging chart to overlay newer data over older data
// make the debugging chart 3d? lol