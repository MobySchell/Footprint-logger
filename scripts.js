/*
Filter for categories:
save filter to local storage and retreive it from local storage
use in pie chart and maybe display of categories
*/

window.addEventListener("load", function () {
    var totalEmissions = window.localStorage.getItem("totalEmissions");
    if (totalEmissions === null) {
        window.localStorage.setItem("totalEmissions", 0);
    }

    var totalEmissions = window.localStorage.getItem("totalEmissions");
    var display = document.getElementById("running-total");

    /* Display Total Emissions */
    display.textContent = totalEmissions;

    updatePieChart();
});

function sendToLocal() {
    var dropActivities = document.getElementById("activities").value;
    var inputActivities = document.getElementById("manual-input-field").value;
    var activitiesBlock = document.getElementById("activities");
    var randomNum = Math.floor(Math.random() * (1000 - 100) + 100);
    var totalEmissions = window.localStorage.getItem("totalEmissions");
    var display = document.getElementById("running-total");

    display.textContent = totalEmissions;

    if (
        (dropActivities === "not available" ||
            dropActivities === "select one") &&
        inputActivities
    ) {
        window.localStorage.setItem(inputActivities, randomNum);

        /* Running Total Emissions */
        var runningTotalEmissions = Number(totalEmissions) + randomNum;
        window.localStorage.setItem("totalEmissions", runningTotalEmissions);

        // console.log(window.localStorage);
        activitiesBlock.innerHTML =
            '<option value="select one">Select One ...</option><option value="driving">Driving</option><option value="meat consumption">Meat Consumption</option><option value="electricity use">Electricity Use</option><option value="not available">Not Available</option>';

        /* Display Total Emissions */
        display.textContent = runningTotalEmissions;
        updatePieChart();
        window.location.reload();
    } else if (
        (dropActivities !== "select one" ||
            dropActivities !== "not available") &&
        inputActivities === ""
    ) {
        window.localStorage.setItem(dropActivities, randomNum);

        /* Running Total Emissions */
        var runningTotalEmissions = Number(totalEmissions) + randomNum;
        window.localStorage.setItem("totalEmissions", runningTotalEmissions);

        /* Display Total Emissions */
        display.textContent = runningTotalEmissions;
        updatePieChart();
        window.location.reload();
    } else {
        alert("Please enter something below");
    }
}

/* Pie Chart */
anychart.onDocumentReady(function () {
    updatePieChart();
});

function updatePieChart() {
    let categories = [];
    let excludedKey = "totalEmissions";

    for (let i = 0; i < window.localStorage.length; i++) {
        let key = window.localStorage.key(i);
        if (key !== excludedKey) {
            let value = window.localStorage.getItem(key);
            categories.push([key, Number(value)]);
        }
    }

    // add the data
    let data = anychart.data.set(categories);

    // create a pie chart with the data
    let chart = anychart.pie(data);
    // set the chart title
    chart.title("Current Emissions");
    // set container id for the chart
    chart.container("visualRep");
    // initiate chart drawing
    chart.draw();
}
