'use strict';

const Highcharts         = require('highcharts/highstock');
require('highcharts/indicators/indicators')(Highcharts);


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


// chooses proper chart to render based on dropdown selections
function renderChart() {

}


exports.renderChart = renderChart;