//Listener for parse button
$('#parse').on('click', compute)

//Parses and analyzes data
function compute() {
    convert()
    clean()
    analyze()
}

//Converts data to array of arrays
function convert() {
    console.log('convert')
}

//Strips data down to useful parts
function clean() {
    console.log('clean')
}

//Analyzes cleaned data
function analyze() {
    console.log('analyze')
}