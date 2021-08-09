const { processFiles } = require('./scripts/processFiles.js')

let trips = []

//listeners/functionality for drag/drop
const input = document.getElementById('input')
input.addEventListener('dragover', ev => ev.preventDefault())
input.addEventListener('dragenter', ev => ev.preventDefault())
input.addEventListener('drop', ev => {
    ev.preventDefault()
    //converts files into array of trip objects
    processFiles(ev.dataTransfer.files)
    .then(data => {
        trips = data
        //display trips
        console.log(trips)
    })
})
/*
display trips
review for breaks
analyze
    create Trip Times property within trip object 
        contains array of date objects for trip times:
            [pickup start, wait start, drive start, drive end]
aggregated day/week/month data
*/