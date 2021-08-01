const { support, Event, event } = require("jquery")
const fs = require('fs/promises')
/** @type {Array<Object<>>} */
let collection = []

let test

//listeners/functionality for drag/drop
const input = document.getElementById('input')
$(input).on('dragover', (event) => {
    event.preventDefault()
})
$(input).on('dragenter', (event) => {
    event.preventDefault()
})
input.addEventListener('drop', function(ev) {
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

    
    //find paths
        //use FS to load the CSV into an array of objects
        //asynchronously clean data
    //compile data
    //sort data
}
//manual review for breaks before analysis


async function importFile(filePath) {
    fs.readFile(filePath).then(response => {
        console.log(response)
    })
    
}







//Listener for analyze button
$('#analyze').on('click', analyze)

//Converts data to array of objects
function dataConvert() {
    console.log('converted')
}

//Strips data down to useful parts
function dataClean() {
    console.log('cleaned')
}

//Sorts collection from oldest to newest
function sortCollection() {
    console.log('sorted')
}

//Adds data to collection
function dataAdd() {
    dataConvert()
    dataClean()
    //add data to collection
    sortCollection()
    console.log('added')
}

//Analyzes cleaned data
function analyze() {
    console.log('analyzed')
}