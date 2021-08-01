const fs = require('fs/promises')


//listeners/functionality for drag/drop
const input = document.getElementById('input')
$(input).on('dragover', ev => ev.preventDefault())
$(input).on('dragenter', ev => ev.preventDefault())
input.addEventListener('drop', ev => {
    ev.preventDefault()
    if (ev.dataTransfer !== null) processFiles(ev.dataTransfer.files)
})
async function processFiles(files) {
    /** @type {Array<Promise>} */
    let arr = []
    for (i = 0; i < files.length; i++) {
        let iteration = importFile(files[i].path)
        arr.push(iteration)
    }
    Promise.all(arr).then(() => {
        console.log('promises fulfilled')
        console.log(arr)
    })
    //compile data
    //sort data
}
//manual review for breaks before analysis


let test
function importFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath)
        .then(data => {
            let arr = parseCSV(data)
            //returns array of properties to be removed
            let junk = Object.keys(arr[0]).filter((v) => {
                if (v != 'Date/Time'
                && v != 'Fare Base'
                && v != 'Fare Cancellation'
                && v != 'Fare Distance'
                && v != 'Fare Minimum Fare Supplement'
                && v != 'Fare Long Pickup Distance'
                && v != 'Fare Long Pickup Time'
                && v != 'Fare Surge'
                && v != 'Fare Time'
                && v != 'Fare Wait Time At Pickup'
                && v != 'Promotion Quest'
                && v != 'Other Earnings Share Adjustment'
                && v != 'Tip'
                && v != 'Total') return true
            })
            let tCount = arr.length
            let jCount = junk.length
            for (i = 0; i < tCount; i++) {
                for (j = 0; j < jCount; j++) {
                    delete arr[i][junk[j]]
                }
            }

            test = arr
            resolve()
        })
        .catch(e => {
            console.log('Issue with fs.readFile operation: ' + e.message)
            reject()
        })
    })
}
//Converts data in CSV to an array of objects
function parseCSV(data) {
    /** @type {Array} */
    let arr = data.toString().split('\n')
    let headers = arr.slice(0, 1).toString().split(',')
    arr = arr.slice(1, -1).map((row) => {
        let values = row.split(',')
        let date = values[3] + ',' + values[4] + ',' + values[5]
        let rest = values.slice(6)
        values = values.slice(0, 3)
        values.push(date)
        for (i = 0; i < rest.length; i++) values.push(rest[i])
        for (i = 0; i < values.length; i++) {
            values[i] = values[i].slice(1, -1)
        }
        let el = headers.reduce((object, header, index) => {
            object[header] = values[index]
            return object
        }, {})
        return el
    })
    return arr
}