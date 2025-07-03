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

    display.textContent = `Total Emissions: ${totalEmissions} CO2e`;
});

function sendToLocal() {
    var dropActivities = document.getElementById("activities");
    var dropCategories = document.getElementById("categories");
    var inputActivities = document.getElementById("manual-input-field");
    var randomNum = Math.floor(Math.random() * (1000 - 100) + 100);
    var totalEmissions = window.localStorage.getItem("totalEmissions");
    var display = document.getElementById("running-total");

    var storedData = localStorage.getItem("emissionData");
    var emissionsData = storedData ? JSON.parse(storedData) : {};

    if (!emissionsData[dropCategories.value]) {
        emissionsData[dropCategories.value] = {};
    }

    /* Input Checker */
    if (
        (dropActivities.value !== "" || dropActivities.value !== "") &&
        inputActivities.value === "" &&
        dropCategories.value !== ""
    ) {
        emissionsData[dropCategories.value][dropActivities.value] = randomNum;
        localStorage.setItem("emissionData", JSON.stringify(emissionsData));

        var runningTotalEmissions = Number(totalEmissions) + randomNum;
        window.localStorage.setItem("totalEmissions", runningTotalEmissions);
        display.textContent = `Total Emissions: ${runningTotalEmissions} CO2e`;
        dropActivities.innerHTML =
            '<option value="">Select Activity</option><option value="eating">eating</option><option value="cooking">cooking</option><option value="driving">driving</option><option value="publicTransport">public transport</option><option value="walking">walking</option><option value="cycling">cycling</option><option value="electricity">electricity</option><option value="heating">heating</option><option value="waterHeating">water heating</option><option value="streaming">streaming</option><option value="">Not available</option>';
        dropCategories.innerHTML =
            '<option value="">Select Category</option><option value="Food">Food</option><option value="Transport">Transport</option><option value="Energy">Energy</option><option value="Waste">Waste</option><option value="Consumption">Consumption</option><option value="Housing">Housing</option><option value="Digital">Digital</option>';
        location.reload();
    } else if (
        (dropActivities.value === "" || dropActivities.value === "") &&
        inputActivities.value !== "" &&
        dropCategories.value !== ""
    ) {
        emissionsData[dropCategories.value][inputActivities.value] = randomNum;
        localStorage.setItem("emissionData", JSON.stringify(emissionsData));

        var runningTotalEmissions = Number(totalEmissions) + randomNum;
        window.localStorage.setItem("totalEmissions", runningTotalEmissions);
        display.textContent = `Total Emissions: ${runningTotalEmissions} CO2e`;
        dropActivities.innerHTML =
            '<option value="">Select Activity</option><option value="eating">eating</option><option value="cooking">cooking</option><option value="driving">driving</option><option value="publicTransport">public transport</option><option value="walking">walking</option><option value="cycling">cycling</option><option value="electricity">electricity</option><option value="heating">heating</option><option value="waterHeating">water heating</option><option value="streaming">streaming</option><option value="">Not available</option>';
        dropCategories.innerHTML =
            '<option value="">Select Category</option><option value="Food">Food</option><option value="Transport">Transport</option><option value="Energy">Energy</option><option value="Waste">Waste</option><option value="Consumption">Consumption</option><option value="Housing">Housing</option><option value="Digital">Digital</option>';
    } else {
        alert("Please make sure to fillout the appropriate fields");
    }
}

/* Pie Chart */
anychart.onDocumentReady(function () {
    updatePieChart();
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

    const filter = categoryFilter?.toLowerCase();

    const showAll = !filter || filter === "clear";

    if (!showAll) {
        const categoryData = parsedData[categoryFilter];
        if (!categoryData) {
            alert(`Category "${categoryFilter}" not found.`);
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
