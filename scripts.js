/* 
//to set an object to the local storage
const object = {
    firstName: "chibuike",
    lastName: "princewill",
    skills: "software development",
    email: "princewillchime43@gmail.com",
    phone: `+234${8169543479}`
};
localStorage.setItem("profile", JSON.stringify(object));

// Retrieve object
let result = JSON.parse(localStorage.getItem("profile"));console.log(result);
*/

window.addEventListener("load", function () {
    var totalEmissions = window.localStorage.getItem("totalEmissions");
    if (totalEmissions === null) {
        window.localStorage.setItem("totalEmissions", 0);
    }
    /* TODO: Add retreival for object */

    var totalEmissions = window.localStorage.getItem("totalEmissions");
    var display = document.getElementById("running-total");

    /* Display Total Emissions */
    display.textContent = totalEmissions;
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
        console.log(categories);
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
    } else {
        alert("Please enter something below");
    }
}

/* Pie Chart */
let categories = [];
let excludedKey = "totalEmissions"; // Replace with your actual key

for (let i = 0; i < window.localStorage.length; i++) {
    let key = window.localStorage.key(i);
    if (key !== excludedKey) {
        let value = window.localStorage.getItem(key);
        categories.push([key, Number(value)]);
    }
}

console.log(categories);

anychart.onDocumentReady(function () {
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
});
