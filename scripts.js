/* 
Local Storage:
window.localStorage.setItem();
window.localStorage.getItem();
window.localStorage.removeItem();
window.localStorage.clear();
window.localStorage.key();

//adding value as a variable
let fullName = "chime chibuike princewill";
window.localStorage.setItem("key", fullName);

//adding value as a string
window.localStorage.setItem("key", "chime chibuike princewill" );

let data = window.localStorage.getItem("key");console.log(data);
//chime chibuike princewill

// Remove data
window.localStorage.removeItem('key')

// Clear Storage
window.localStorage.clear()

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
    var totalEmissions = window.localStorage.getItem("totalEmissions");
    var display = document.getElementById("running-total");

    /* Display Total Emissions */
    display.innerText = totalEmissions;
});

function sendToLocal() {
    var dropActivities = document.getElementById("activities").value;
    var inputActivities = document.getElementById("manual-input-field").value;
    var activitiesBlock = document.getElementById("activities");
    var randomNum = Math.floor(Math.random() * (1000 - 100) + 100);
    var totalEmissions = window.localStorage.getItem("totalEmissions");
    var display = document.getElementById("running-total");

    if (
        (dropActivities === "not available" || dropActivities === "") &&
        inputActivities
    ) {
        window.localStorage.setItem(inputActivities, randomNum);

        /* Running Total Emissions */
        var runningTotalEmissions = Number(totalEmissions) + randomNum;
        window.localStorage.setItem("totalEmissions", runningTotalEmissions);
        // console.log(window.localStorage);
        activitiesBlock.innerHTML =
            '<option value=""></option><option value="driving">Driving</option><option value="meat consumption">Meat Consumption</option><option value="electricity use">Electricity Use</option><option value="not available">Not Available</option>';

        /* Display Total Emissions */
        display.innerText = totalEmissions;
    } else if (inputActivities === "" && dropActivities !== "") {
        window.localStorage.setItem(dropActivities, randomNum);

        /* Running Total Emissions */
        var runningTotalEmissions = Number(totalEmissions) + randomNum;
        window.localStorage.setItem("totalEmissions", runningTotalEmissions);

        /* Display Total Emissions */
        display.innerText = totalEmissions;
    } else {
        alert("Please enter something below");
    }
}
