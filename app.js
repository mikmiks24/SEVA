
/* =====================================
   SEVA DASHBOARD JAVASCRIPT
   PUP-INSPIRED RED AND WHITE THEME

   DEMONSTRATION VERSION

   NOTE:
   Sensor values are simulated.
   Actual Raspberry Pi 4 and ADXL355
   integration is not yet implemented.
===================================== */


/* =====================================
   SAMPLE BUILDING DATA

   Replace the sample information with
   verified building records and addresses.
===================================== */

const buildings = [

    {
        id: 1,
        name: "Barangay Hall",
        location: "BF Homes, Parañaque",
        latitude: 14.4485,
        longitude: 121.0190,
        tolerance: 2.0,
        pga: 0.20,
        magnitude: "N/A",
        status: "Normal"
    },

    {
        id: 2,
        name: "Community Center",
        location: "BF Homes, Parañaque",
        latitude: 14.4500,
        longitude: 121.0210,
        tolerance: 2.0,
        pga: 0.30,
        magnitude: "N/A",
        status: "Normal"
    },

    {
        id: 3,
        name: "School Building",
        location: "BF Homes, Parañaque",
        latitude: 14.4460,
        longitude: 121.0170,
        tolerance: 2.0,
        pga: 0.40,
        magnitude: "N/A",
        status: "Normal"
    }

];


/* =====================================
   GLOBAL VARIABLES
===================================== */

// Complete seismic history
let historyRecords = [];

// Leaflet map
let map = null;

// Map markers
const mapMarkers = {};

// Chart.js
let seismicChart = null;


/* =====================================
   HTML ESCAPING
===================================== */

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => {

        const replacements = {

            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"

        };

        return replacements[character];

    });

}


/* =====================================
   PAGE NAVIGATION
===================================== */

function showPage(pageId) {

    // Hide all pages
    document.querySelectorAll(".page-view").forEach(page => {

        page.classList.add("hidden");

    });


    // Display selected page
    const selectedPage = document.getElementById(pageId);

    if (!selectedPage) {

        console.warn("Page not found:", pageId);

        return;

    }

    selectedPage.classList.remove("hidden");


    // Update active sidebar link
    document.querySelectorAll(".sidebar nav a").forEach(link => {

        link.classList.remove("active");

    });


    const activeLink = document.querySelector(
        `.sidebar nav a[data-page="${pageId}"]`
    );

    if (activeLink) {

        activeLink.classList.add("active");

    }


    // Refresh map dimensions
    if (pageId === "dashboardView" && map) {

        setTimeout(() => {

            map.invalidateSize();

        }, 150);

    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =====================================
   SIDEBAR NAVIGATION
===================================== */

function setupNavigation() {

    document.querySelectorAll(".sidebar nav a[data-page]")

        .forEach(link => {

            link.addEventListener("click", event => {

                event.preventDefault();

                const pageId = link.dataset.page;

                const scrollTarget = link.dataset.scroll;


                showPage(pageId);


                // Scroll to selected dashboard section
                if (scrollTarget && pageId === "dashboardView") {

                    setTimeout(() => {

                        const target = document.getElementById(scrollTarget);

                        if (target) {

                            target.scrollIntoView({

                                behavior: "smooth",

                                block: "start"

                            });

                        }


                        if (scrollTarget === "mapSection" && map) {

                            map.invalidateSize();

                        }

                    }, 180);

                }

            });

        });

}


/* =====================================
   STATUS CLASSIFICATION

   Demonstration threshold:
   60% of building tolerance = Elevated.

   This threshold must be validated
   against the project's engineering basis.
===================================== */

function determineStatus(pga, tolerance) {

    if (pga >= tolerance) {

        return "Breached";

    }


    if (pga >= tolerance * 0.60) {

        return "Elevated";

    }


    return "Normal";

}


/* =====================================
   LEAFLET MAP INITIALIZATION
===================================== */

function initializeMap() {

    const mapElement = document.getElementById("map");


    if (!mapElement || typeof L === "undefined") {

        console.error(
            "Map initialization failed. Check Leaflet."
        );

        return;

    }


    // BF Homes, Parañaque City
    map = L.map("map").setView(

        [14.44577, 121.02714],

        16

    );


    // OpenStreetMap
    L.tileLayer(

        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom: 19,

            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',

            referrerPolicy:
                "strict-origin-when-cross-origin"

        }

    ).addTo(map);


    updateMapMarkers();

}


/* =====================================
   MAP MARKER COLORS
===================================== */

function getMarkerColor(status) {

    if (status === "Breached") {

        return "#DC3545";

    }

    if (status === "Elevated") {

        return "#E5A000";

    }

    return "#198754";

}


/* =====================================
   UPDATE GPS MAP MARKERS
===================================== */

function updateMapMarkers() {

    if (!map || typeof L === "undefined") {

        return;

    }


    buildings.forEach(building => {

        const markerColor = getMarkerColor(building.status);


        const markerIcon = L.divIcon({

            className: "",

            html: `
                <div style="
                    background: ${markerColor};
                    width: 18px;
                    height: 18px;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 1px 5px rgba(0,0,0,0.45);
                "></div>
            `,

            iconSize: [18, 18],

            iconAnchor: [9, 9]

        });


        const popupContent = `

            <strong>${escapeHTML(building.name)}</strong><br>

            Location: ${escapeHTML(building.location)}<br>

            PGA: ${Number(building.pga).toFixed(3)} m/s²<br>

            Tolerance: ${Number(building.tolerance).toFixed(2)} m/s²<br>

            Status: ${escapeHTML(building.status)}

        `;


        if (mapMarkers[building.id]) {

            mapMarkers[building.id]

                .setLatLng([
                    building.latitude,
                    building.longitude
                ])

                .setIcon(markerIcon)

                .setPopupContent(popupContent);

        } else {

            mapMarkers[building.id] = L.marker(

                [
                    building.latitude,
                    building.longitude
                ],

                {
                    icon: markerIcon
                }

            )

            .addTo(map)

            .bindPopup(popupContent);

        }

    });

}


/* =====================================
   BUILDING MONITORING TABLE
===================================== */

function updateBuildingTable() {

    const table = document.getElementById("buildingTable");

    if (!table) {

        return;

    }


    table.innerHTML = "";


    buildings.forEach(building => {

        const row = document.createElement("tr");


        const displayedStatus =

            building.status === "Breached"

                ? "Threshold Breached"

                : building.status;


        row.innerHTML = `

            <td>
                ${escapeHTML(building.name)}
            </td>

            <td>
                ${escapeHTML(building.location)}
            </td>

            <td>
                ${Number(building.pga).toFixed(3)} m/s²
            </td>

            <td>
                ${Number(building.tolerance).toFixed(2)} m/s²
            </td>

            <td>
                ${escapeHTML(building.magnitude)}
            </td>

            <td>
                <span class="status ${building.status}">
                    ${displayedStatus}
                </span>
            </td>

        `;


               table.appendChild(row);

    });

    updateBuildingSummary();

}

/* =====================================
   BUILDING MONITORING SUMMARY CARDS
===================================== */

function updateBuildingSummary() {

    const count = status =>
        buildings.filter(building => building.status === status).length;

    const setValue = (id, value) => {

        const element = document.getElementById(id);

        if (element) {

            element.textContent = value;

        }

    };

    setValue("bmTotal", buildings.length);
    setValue("bmNormal", count("Normal"));
    setValue("bmElevated", count("Elevated"));
    setValue("bmBreached", count("Breached"));

}

/* =====================================
   SUMMARY CARDS
===================================== */

function updateOverview() {

    const totalEvents =
        document.getElementById("totalEvents");

    const activeAlerts =
        document.getElementById("activeAlerts");

    const affectedBuildings =
        document.getElementById("affectedBuildings");

    const monitoredBuildings =
        document.getElementById("monitoredBuildings");


    // Total recorded readings
    if (totalEvents) {

        totalEvents.textContent = historyRecords.length;

    }


    // Elevated and breached buildings
    const alertCount = buildings.filter(

        building =>

            building.status === "Elevated" ||

            building.status === "Breached"

    ).length;


    // Affected buildings
    const affectedCount = buildings.filter(

        building => building.status !== "Normal"

    ).length;


    if (activeAlerts) {

        activeAlerts.textContent = alertCount;

    }


    if (affectedBuildings) {

        affectedBuildings.textContent = affectedCount;

    }


    if (monitoredBuildings) {

        monitoredBuildings.textContent = buildings.length;

    }


    updateSystemAlert();

}


/* =====================================
   CURRENT SYSTEM ALERT
===================================== */

function updateSystemAlert() {

    const alertBox =
        document.getElementById("systemAlert");


    if (!alertBox) {

        return;

    }


    const breached = buildings.filter(

        building => building.status === "Breached"

    );


    const elevated = buildings.filter(

        building => building.status === "Elevated"

    );


    if (breached.length > 0) {

        alertBox.className = "alert danger-alert";

        alertBox.textContent =

            "THRESHOLD BREACHED: " +

            breached.map(building => building.name).join(", ");


    } else if (elevated.length > 0) {

        alertBox.className = "alert warning-alert";

        alertBox.textContent =

            "WARNING: Elevated seismic activity detected in " +

            elevated.map(building => building.name).join(", ") + ".";


    } else {

        alertBox.className = "alert normal-alert";

        alertBox.textContent =

            "NORMAL: No threshold breach detected.";

    }

}


/* =====================================
   REAL-TIME SENSOR READINGS

   Demonstration values only.
===================================== */

function updateSensorReadings(pga) {

    // Sample axis values
    const x = (

        Math.random() * 0.10 - 0.05

    ).toFixed(3);


    const y = (

        Math.random() * 0.10 - 0.05

    ).toFixed(3);


    const z = (

        9.81 + (Math.random() * 0.10 - 0.05)

    ).toFixed(3);


    // Dashboard sensor elements
    const pgaElement =
        document.getElementById("pgaValue");

    const xElement =
        document.getElementById("xValue");

    const yElement =
        document.getElementById("yValue");

    const zElement =
        document.getElementById("zValue");


    if (pgaElement) {

        pgaElement.textContent =
            Number(pga).toFixed(3);

    }


    if (xElement) {

        xElement.textContent = x;

    }


    if (yElement) {

        yElement.textContent = y;

    }


    if (zElement) {

        zElement.textContent = z;

    }


    // Demonstration connectivity values
    const onlineElement =
        document.getElementById("onlineSensors");

    const offlineElement =
        document.getElementById("offlineSensors");

    const transmissionElement =
        document.getElementById("lastTransmission");


    if (onlineElement) {

        onlineElement.textContent = buildings.length;

    }


    if (offlineElement) {

        offlineElement.textContent = 0;

    }


    if (transmissionElement) {

        transmissionElement.textContent =

            new Date().toLocaleTimeString();

    }

}


/* =====================================
   CHART.JS INITIALIZATION
===================================== */

function initializeChart() {

    const canvas =
        document.getElementById("seismicChart");


    if (!canvas || typeof Chart === "undefined") {

        console.error(
            "Chart initialization failed. Check Chart.js."
        );

        return;

    }


    const context = canvas.getContext("2d");


    seismicChart = new Chart(context, {

        type: "line",

        data: {

            labels: [],

            datasets: [

                {

                    label: "Peak Ground Acceleration (m/s²)",

                    data: [],

                    borderColor: "#800000",

                    backgroundColor: "rgba(128,0,0,0.13)",

                    borderWidth: 2,

                    pointRadius: 3,

                    pointBackgroundColor: "#800000",

                    fill: true,

                    tension: 0.3

                }

            ]

        },


        options: {

            responsive: true,

            maintainAspectRatio: false,


            interaction: {

                intersect: false,

                mode: "index"

            },


            plugins: {

                legend: {

                    display: true,

                    labels: {

                        boxWidth: 12,

                        font: {

                            size: 10

                        }

                    }

                }

            },


            scales: {

                y: {

                    beginAtZero: true,

                    title: {

                        display: true,

                        text: "PGA (m/s²)"

                    },

                    ticks: {

                        font: {

                            size: 10

                        }

                    }

                },


                x: {

                    title: {

                        display: true,

                        text: "Time"

                    },

                    ticks: {

                        font: {

                            size: 10

                        }

                    }

                }

            }

        }

    });

}


/* =====================================
   UPDATE ACTIVITY GRAPH
===================================== */

function updateChart(pga) {

    if (!seismicChart) {

        return;

    }


    const currentTime =

        new Date().toLocaleTimeString();


    seismicChart.data.labels.push(currentTime);


    seismicChart.data.datasets[0].data.push(

        Number(pga.toFixed(3))

    );


    // Keep the latest 15 readings
    if (seismicChart.data.labels.length > 15) {

        seismicChart.data.labels.shift();

        seismicChart.data.datasets[0].data.shift();

    }


    seismicChart.update();

}


/* =====================================
   CREATE HISTORY RECORD
===================================== */

function addHistory(building) {

    const record = {

        timestamp: Date.now(),

        building: building.name,

        street: building.location,

        pga: Number(building.pga).toFixed(3),

        status: building.status

    };


    historyRecords.unshift(record);


    // Limit demonstration history to 500 records
    if (historyRecords.length > 500) {

        historyRecords = historyRecords.slice(0, 500);

    }

}


/* =====================================
   DATE AND TIME FORMATTING
===================================== */

function getRecordDate(record) {

    if (
        typeof record.timestamp === "number" &&
        Number.isFinite(record.timestamp)
    ) {

        return new Date(record.timestamp).toLocaleDateString();

    }


    return record.dateText || "N/A";

}


function getRecordTime(record) {

    if (
        typeof record.timestamp === "number" &&
        Number.isFinite(record.timestamp)
    ) {

        return new Date(record.timestamp).toLocaleTimeString();

    }


    return record.timeText || "N/A";

}


function getRecordDateKey(record) {

    if (
        typeof record.timestamp !== "number" ||
        !Number.isFinite(record.timestamp)
    ) {

        return "";

    }


    const date = new Date(record.timestamp);

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        date.getDate()
    ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


function getRecordTimeKey(record) {

    if (
        typeof record.timestamp !== "number" ||
        !Number.isFinite(record.timestamp)
    ) {

        return "";

    }


    const date = new Date(record.timestamp);

    const hours = String(
        date.getHours()
    ).padStart(2, "0");

    const minutes = String(
        date.getMinutes()
    ).padStart(2, "0");


    return `${hours}:${minutes}`;

}


/* =====================================
   SEISMIC HISTORY TABLE
===================================== */

function updateHistoryTable(records = historyRecords) {

    const table =
        document.getElementById("historyTable");


    if (!table) {

        return;

    }


    table.innerHTML = "";


    if (records.length === 0) {

        const row = document.createElement("tr");

        row.innerHTML = `

            <td colspan="6" class="empty-state">
                No matching records found.
            </td>

        `;

        table.appendChild(row);

        return;

    }


    records.forEach(record => {

        const row = document.createElement("tr");


        row.innerHTML = `

            <td>
                ${escapeHTML(getRecordDate(record))}
            </td>

            <td>
                ${escapeHTML(getRecordTime(record))}
            </td>

            <td>
                ${escapeHTML(record.building)}
            </td>

            <td>
                ${escapeHTML(record.street || record.location || "")}
            </td>

            <td>
                ${escapeHTML(record.pga)} m/s²
            </td>

            <td>
                <span class="status ${record.status}">
                    ${escapeHTML(record.status)}
                </span>
            </td>

        `;


        table.appendChild(row);

    });

}


/* =====================================
   HISTORY FILTER FUNCTION

   Filter options:
   1. All Fields
   2. Date
   3. Building Name
   4. Street / Location
   5. Time

   Filtering happens automatically
   whenever the user types or changes
   the selected filter.
===================================== */

function filterHistoryRecords() {

    const searchInput =
        document.getElementById("searchHistory");

    const filterSelect =
        document.getElementById("historyFilter");

    const resultCount =
        document.getElementById("filterResultCount");


    if (!searchInput || !filterSelect) {

        return;

    }


    const searchValue =

        searchInput.value.trim().toLowerCase();


    const selectedFilter = filterSelect.value;


    // Update search placeholder
    const placeholders = {

        all: "Search all records...",

        date: "Enter date (YYYY-MM-DD)...",

        building: "Enter building name...",

        street: "Enter street or location...",

        time: "Enter time (e.g. 17:30 or 5:30 PM)..."

    };


    searchInput.placeholder =

        placeholders[selectedFilter] || "Search records...";


    // Find matching records
    const filteredRecords = historyRecords.filter(record => {


        // Displayed date and time
        const recordDate =

            getRecordDate(record).toLowerCase();


        const recordTime =

            getRecordTime(record).toLowerCase();


        // Searchable date formats
        const dateKey =

            getRecordDateKey(record).toLowerCase();


        const timeKey =

            getRecordTimeKey(record).toLowerCase();


        const buildingName =

            (record.building || "").toLowerCase();


        const streetLocation =

            (record.street || record.location || "").toLowerCase();


        const pgaValue =

            String(record.pga || "").toLowerCase();


        const statusValue =

            String(record.status || "").toLowerCase();


        // No search value: show every record
        if (searchValue === "") {

            return true;

        }


        switch (selectedFilter) {


            // Search all fields
            case "all":

                return (

                    recordDate.includes(searchValue) ||

                    recordTime.includes(searchValue) ||

                    dateKey.includes(searchValue) ||

                    timeKey.includes(searchValue) ||

                    buildingName.includes(searchValue) ||

                    streetLocation.includes(searchValue) ||

                    pgaValue.includes(searchValue) ||

                    statusValue.includes(searchValue)

                );


            // Search by date
            case "date":

                return (

                    recordDate.includes(searchValue) ||

                    dateKey.includes(searchValue)

                );


            // Search by building name
            case "building":

                return buildingName.includes(searchValue);


            // Search by street or location
            case "street":

                return streetLocation.includes(searchValue);


            // Search by time
            case "time":

                return (

                    recordTime.includes(searchValue) ||

                    timeKey.includes(searchValue)

                );


            default:

                return true;

        }

    });


    // Display matching records
    updateHistoryTable(filteredRecords);


    // Display result count
    if (resultCount) {

        resultCount.textContent =

            `Showing ${filteredRecords.length} of ${historyRecords.length} records.`;

    }

}


/* =====================================
   HISTORY SEARCH AND FILTER EVENTS
===================================== */

function setupHistoryFilters() {

    const searchInput =
        document.getElementById("searchHistory");

    const filterSelect =
        document.getElementById("historyFilter");


    if (!searchInput || !filterSelect) {

        return;

    }


    // Search while typing
    searchInput.addEventListener("input", function () {

        filterHistoryRecords();

    });


    // Filter when dropdown selection changes
    filterSelect.addEventListener("change", function () {

        filterHistoryRecords();

        searchInput.focus();

    });


    // Initial display
    filterHistoryRecords();

}


/* =====================================
   CSV EXPORT
===================================== */

function csvEscape(value) {

    return `"${String(value ?? "").replace(/"/g, '""')}"`;

}


function exportCSV() {

    if (historyRecords.length === 0) {

        alert("No records available to export.");

        return;

    }


    const headers = [

        "Date",

        "Time",

        "Building",

        "Street / Location",

        "PGA",

        "Status"

    ];


    const rows = historyRecords.map(record => [

        getRecordDate(record),

        getRecordTime(record),

        record.building,

        record.street || record.location || "",

        record.pga,

        record.status

    ]);


    const csvContent = [

        headers,

        ...rows

    ]

    .map(row =>

        row.map(value => csvEscape(value)).join(",")

    )

    .join("\r\n");


    const blob = new Blob(

        ["\uFEFF" + csvContent],

        {

            type: "text/csv;charset=utf-8;"

        }

    );


    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");


    link.href = url;

    link.download = "SEVA_Seismic_History.csv";


    document.body.appendChild(link);

    link.click();

    link.remove();


    URL.revokeObjectURL(url);

}


/* =====================================
   CSV IMPORT PARSER
===================================== */

function parseCSVLine(line) {

    const values = [];

    let current = "";

    let insideQuotes = false;


    for (let i = 0; i < line.length; i++) {

        const character = line[i];


        if (character === '"') {

            if (insideQuotes && line[i + 1] === '"') {

                current += '"';

                i++;

            } else {

                insideQuotes = !insideQuotes;

            }

        }

        else if (character === "," && !insideQuotes) {

            values.push(current);

            current = "";

        }

        else {

            current += character;

        }

    }


    values.push(current);

    return values;

}


/* =====================================
   PREPARE IMPORTED HISTORY RECORD
===================================== */

function createImportedRecord(values) {

    let dateText;

    let timeText;

    let building;

    let street;

    let pga;

    let status;


    // New CSV format:
    // Date, Time, Building, Street, PGA, Status

    if (values.length >= 6) {

        dateText = values[0].trim();

        timeText = values[1].trim();

        building = values[2].trim();

        street = values[3].trim();

        pga = values[4].trim();

        status = values[5].trim();

    }


    // Previous CSV format:
    // Date and Time, Building, PGA, Location, Status

    else if (values.length >= 5) {

        const dateTime = values[0].trim();

        building = values[1].trim();

        pga = values[2].trim();

        street = values[3].trim();

        status = values[4].trim();


        const parsedDate = new Date(dateTime);


        if (!Number.isNaN(parsedDate.getTime())) {

            dateText = parsedDate.toLocaleDateString();

            timeText = parsedDate.toLocaleTimeString();

        } else {

            dateText = dateTime;

            timeText = "";

        }

    }

    else {

        return null;

    }


    const numericPGA = Number(pga);


    const validStatuses = [

        "Normal",

        "Elevated",

        "Breached",

        "Offline"

    ];


    if (

        building === "" ||

        !Number.isFinite(numericPGA) ||

        !validStatuses.includes(status)

    ) {

        return null;

    }


    // Try to reconstruct timestamp
    const parsedTimestamp = new Date(

        `${dateText} ${timeText}`

    );


    return {

        timestamp: Number.isNaN(parsedTimestamp.getTime())

            ? null

            : parsedTimestamp.getTime(),

        dateText: dateText,

        timeText: timeText,

        building: building,

        street: street,

        pga: numericPGA.toFixed(3),

        status: status

    };

}


/* =====================================
   CSV IMPORT
===================================== */

function setupCSVImport() {

    const importInput =
        document.getElementById("importCSV");


    if (!importInput) {

        return;

    }


    importInput.addEventListener("change", function (event) {

        const file = event.target.files[0];


        if (!file) {

            return;

        }


        const reader = new FileReader();


        reader.onload = function (loadEvent) {

            try {

                const lines = String(loadEvent.target.result)

                    .replace(/^\uFEFF/, "")

                    .split(/\r?\n/)

                    .filter(line => line.trim() !== "");


                if (lines.length < 2) {

                    alert("The CSV file contains no records.");

                    return;

                }


                let importedCount = 0;


                // Skip the header row
                lines.slice(1).forEach(line => {

                    const values = parseCSVLine(line);


                    const record = createImportedRecord(values);


                    if (!record) {

                        return;

                    }


                    historyRecords.unshift(record);

                    importedCount++;

                });


                // Keep maximum 500 records
                if (historyRecords.length > 500) {

                    historyRecords = historyRecords.slice(0, 500);

                }


                // Update dashboard and history
                updateOverview();

                filterHistoryRecords();


                alert(

                    `${importedCount} record(s) successfully imported.`

                );


            }

            catch (error) {

                console.error("CSV import error:", error);

                alert(

                    "Unable to import CSV. Please check the file format."

                );

            }

            finally {

                event.target.value = "";

            }

        };


        reader.onerror = function () {

            alert("Unable to read the selected file.");

            event.target.value = "";

        };


        reader.readAsText(file);

    });

}


/* =====================================
   DEMONSTRATION SENSOR DATA

   Generates simulated PGA readings.

   NOT actual ADXL355 readings.
===================================== */

function simulateSensorData() {

    buildings.forEach(building => {


        // Simulated PGA from 0.00 to 2.40 m/s²
        building.pga = Math.random() * 2.4;


        // Determine building status
        building.status = determineStatus(

            building.pga,

            building.tolerance

        );


        // Add historical record
        addHistory(building);

    });


    // Limit history to 500 records
    if (historyRecords.length > 500) {

        historyRecords = historyRecords.slice(0, 500);

    }


    // Update building table
    updateBuildingTable();


    // Update GPS map
    updateMapMarkers();


    // Update summary cards
    updateOverview();


    // Get highest PGA
    const highestPGA = Math.max(

        ...buildings.map(building => building.pga)

    );


    // Update sensor readings
    updateSensorReadings(highestPGA);


    // Update activity graph
    updateChart(highestPGA);


    // Refresh history filtering and table
    filterHistoryRecords();

}


/* =====================================
   INITIALIZE APPLICATION
===================================== */

document.addEventListener("DOMContentLoaded", function () {


    // Sidebar navigation
    setupNavigation();


    // History filter and search
    setupHistoryFilters();


    // CSV import
    setupCSVImport();


    // Initialize Chart.js
    initializeChart();


    // Initialize Leaflet
    initializeMap();


    // Initial building table
    updateBuildingTable();


    // Initial summary cards
    updateOverview();


    // Initial simulated sensor readings
    simulateSensorData();


    // Update demonstration readings every 10 seconds
    setInterval(simulateSensorData, 10000);


});


/* =====================================
   HTML BUTTON ACCESS
===================================== */

window.showPage = showPage;

window.exportCSV = exportCSV;
