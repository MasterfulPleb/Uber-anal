'use strict';

const { secondsBetween } = require('/UberAnal/scripts/utility.js');
const { Settings }       = require('/UberAnal/scripts/settings.js');
const { processFiles }   = require('/UberAnal/scripts/process-files.js');
const { simulateDays }   = require('/UberAnal/scripts/simulation.new.js');
const { renderChart }    = require('/UberAnal/scripts/charts.js');
const $                  = require('jquery');

// imports for intellisense
const { Trip, PreTrip }   = require('/UberAnal/scripts/process-files.js');


// initializes settings class, loading settings from localStorage
Settings.init();


// listeners for statement input
$('#input-overlay').on('dragover', ev => ev.preventDefault());
$('#input-overlay').on('dragenter', () => $('#input-box').addClass('drag'));
$('#input-overlay').on('dragleave', () => $('#input-box').removeClass('drag'));
$('#input-overlay').on('drop', ev => {
    ev.preventDefault();
    $('#input-box').removeClass('drag');
    $('#input-view').addClass('hidden');
    //$('#processing-view').removeClass('hidden');
    processFiles(ev.originalEvent.dataTransfer.files).then(data => {
        const days = simulateDays(data.trips);
        debugger;


        //analyze(data);
        //$('#processing-view').addClass('hidden');
        $('#analysis-view').removeClass('hidden');
    });
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
});
$('#settings-apply').on('click', () => {
    $('#settings-view').addClass('hidden');
    // todo - apply any changes
});
$('#settings-cancel').on('click', () => {
    $('#settings-view').addClass('hidden');
    // todo - revert any changes
});