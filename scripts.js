var emissionsData = [];
let chart;

window.addEventListener("load", function () {
    var totalEmissions = window.localStorage.getItem("totalEmissions");
    if (totalEmissions === null) {
        window.localStorage.setItem("totalEmissions", 0);
    }

    var filters = window.localStorage.getItem("filters");

    if (filters === null) {
        window.localStorage.setItem("filters", "none");
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
        location.reload();
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
        location.reload();
    } else {
        alert("Please make sure to fillout the appropriate fields");
    }
}

anychart.onDocumentReady(function () {
    updatePieChart(); // Call without filter or with 'clear' to show all
});

function updatePieChart(categoryFilter = null) {
    const excludedKey = "totalEmissions";
    const rawData = window.localStorage.getItem("emissionData");

    if (!rawData) {
        console.error("No emissionData found in localStorage.");
        return;
    }

    const parsedData = JSON.parse(rawData);
    let categories = [];

    // Normalize filter input to lowercase
    const filter = categoryFilter?.toLowerCase();

    const showAll = !filter || filter === "clear";

    if (!showAll) {
        const categoryData = parsedData[categoryFilter];
        if (!categoryData) {
            console.error(`Category "${categoryFilter}" not found.`);
            return;
        }

        for (let activity in categoryData) {
            if (activity !== excludedKey) {
                categories.push([activity, Number(categoryData[activity])]);
            }
        }
    } else {
        for (let category in parsedData) {
            const categoryData = parsedData[category];
            for (let activity in categoryData) {
                if (activity !== excludedKey) {
                    categories.push([
                        `${category}: ${activity}`,
                        Number(categoryData[activity]),
                    ]);
                }
            }
        }
    }

    const data = anychart.data.set(categories);

    if (!chart) {
        chart = anychart.pie(data);
        chart.title(
            showAll
                ? "Emissions for All Categories"
                : `Emissions for ${categoryFilter}`
        );
        chart.container("visualRep");
        chart.draw();
    } else {
        chart.data(data);
        chart.title(
            showAll
                ? "Emissions for All Categories"
                : `Emissions for ${categoryFilter}`
        );
    }
}

var filter = "";

function filterBy(filters) {
    filter = filters;
    window.localStorage.setItem("filters", filter);
    updatePieChart(filter);
}
