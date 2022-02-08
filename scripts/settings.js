'use strict';

const { secondsBetween } = require('/UberAnal/scripts/utility.js');
const markets = require('/UberAnal/markets.json');

// for testing purposes - this makes intellisense work
// const { PreTrip } = require('/UberAnal/scripts/process-files.js'); // needs to be commented to avoid circular dependency


/**@description The class used to store settings*/
class Settings {
    constructor() {}
    static market = ''; // Upstate NY
    static marketData;
    static darkmode = true;
    static offset = 0; // where to break days in the charts - latest time worked after midnight
    static automaticallyDetectOffset = true;
    /**@description returns array of property names in Settings*/
    static keys() {
        const arr = [];
        for (const key in Settings) {
            if (typeof this[key] != 'function' && key != 'marketData') {
                arr.push(key);
            }
        }
        return arr;
    }
    /**@description loads settings from localStorage, setting defaults if there are none set*/
    static init() {
        for (const key of Settings.keys()) {
            const storedValue = localStorage.getItem(key)
            if (storedValue != null) Settings[key] = storedValue;
            else localStorage.setItem(key, Settings[key]);
        }
        if (Settings.market == '') Settings.runFirstTimeSetup();
        Settings.configureMarket();
    }
    /**@description commits settings to localStorage and applies changes*/
    static apply() {
        const changes = [];
        for (const key in Settings.keys()) {
            if (localStorage.getItem(key) != Settings[key]) {
                changes.push(key);
                localStorage.setItem(key, Settings[key]);
            }
        }
        let rerunSimulation = false;
        for (const key in changes) {
            if (key == 'darkmode') {
                // todo - toggle darkmode
            } else if (key == 'market' || key == 'offset') {
                rerunSimulation = true;
            } else if (key == 'automaticallyDetectOffset') {
                // do nothing
            }
        }
        if (rerunSimulation) {
            // todo - rerun simulation
        }
    }
    /**@description attempts to find an appropriate offset*/
    static detectOffset(/**@type {PreTrip[]}*/trips) {
        let offset = 0;
        /**@type {Date[]}*/let block = [];
        for (const trip of trips) {
            if (block.length == 0) {
                block.push(trip.dateTime);
                continue;
            }
            if (secondsBetween(block[block.length-1], trip.dateTime) > 21600) { // 6 hours
                // check if block starts in last 12 hours of day and ends in first 12
                const lastHour = block[block.length-1].getHours()
                if (block[0].getHours() > 12 && lastHour < 12 && lastHour > offset) offset = lastHour + 1;
                block = [];
            }
            block.push(trip.dateTime);
        }
        if (offset > Settings.offset) {
            Settings.offset = offset;
            localStorage.setItem('offset', offset.toString());
        }
    }
    /**@description handles first-time setup*/
    static runFirstTimeSetup() {
        // todo - create a first-time setup
        console.info('first time setup ran'); // for testing purposes
        Settings.market = 'Upstate NY'; // for testing purposes
        // if market is not already in data, require entering market data
    }
    /**@description converts dollar/minute values into pennies/second, others into pennies*/
    static configureMarket() {
        for (const key in markets[Settings.market]) {
            const type = markets[Settings.market][key];
            for (const key in type) {
                if (key == 'minute' || key == 'wait') {
                    type[key] *= 10/6;
                } else if (key == 'base' || key == 'mile' || key == 'minimum') {
                    type[key] *= 100;
                } else {
                    for (const key2 in type[key]) {
                        if (key2 == 'minute') {
                            type[key][key2] *= 10/6;
                        } else if (key2 != 'threshold') {
                            type[key][key2] *= 100;
                        } else type[key][key2] *= 60;
                    }
                }
            }
        }
        Settings.marketData = markets[Settings.market]
    }
}


exports.Settings = Settings;



// ask about sharing data in first time setup