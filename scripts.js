var emissionsData = [];

window.addEventListener("load", function () {
    var totalEmissions = window.localStorage.getItem("totalEmissions");
    if (totalEmissions === null) {
        window.localStorage.setItem("totalEmissions", 0);
    }

    var totalEmissions = window.localStorage.getItem("totalEmissions");
    var display = document.getElementById("running-total");

    /* Display initial or reloaded Emissions */
    display.textContent = totalEmissions;
});

function sendToLocal() {
    var dropActivities = document.getElementById("activities").value;
    var dropCategories = document.getElementById("categories").value;
    var inputActivities = document.getElementById("manual-input-field").value;
    //     var activitiesBlock = document.getElementById("activities");
    var randomNum = Math.floor(Math.random() * (1000 - 100) + 100);
    var totalEmissions = window.localStorage.getItem("totalEmissions");
    var display = document.getElementById("running-total");

    var storedData = localStorage.getItem("emissionData");
    var emissionsData = storedData ? JSON.parse(storedData) : {};

    if (!emissionsData[dropCategories]) {
        emissionsData[dropCategories] = {};
    }

    /* Input Checker */ // Work on resetting inputs and checking whether it's already in the object
    if (
        (dropActivities === "notAvailable" ||
            dropActivities === "select one") &&
        inputActivities &&
        dropCategories
    ) {
        emissionsData[dropCategories][inputActivities] = randomNum;
        localStorage.setItem("emissionData", JSON.stringify(emissionsData));

        /* Running Total Emissions */
        var runningTotalEmissions = Number(totalEmissions) + randomNum;
        window.localStorage.setItem("totalEmissions", runningTotalEmissions);
        display.textContent = runningTotalEmissions;
    } else if (
        (dropActivities !== "select one" ||
            dropActivities !== "notAvailable") &&
        inputActivities === "" &&
        dropActivities
    ) {
        emissionsData[dropCategories][dropActivities] = randomNum;
        localStorage.setItem("emissionData", JSON.stringify(emissionsData));

        /* Running Total Emissions */
        var runningTotalEmissions = Number(totalEmissions) + randomNum;
        window.localStorage.setItem("totalEmissions", runningTotalEmissions);
        display.textContent = runningTotalEmissions;
    } else {
        alert("Please make sure to fillout the appropriate fields");
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
