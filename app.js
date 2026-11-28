
// =====================================
// BUILDING INFORMATION
// =====================================

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


// =====================================
// GLOBAL VARIABLES
// =====================================

let historyRecords = [];
let visibleHistoryRecords = [];

let latestPGAReading = 0;
let waveformPhase = 0;
let waveformTimer = null;

const PGA_WAVEFORM_POINTS = 90;
const PGA_WAVEFORM_INTERVAL_MS = 100;

const maps = {};
const mapMarkers = {};
const seismicCharts = {};


// =====================================
// HTML ESCAPING
// =====================================

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


// =====================================
// PAGE NAVIGATION
// =====================================

function showPage(pageId) {

    document.querySelectorAll(".page-view").forEach(page => {
        page.classList.add("hidden");
    });

    const selectedPage = document.getElementById(pageId);

    if (!selectedPage) {
        console.warn("Page not found:", pageId);
        return;
    }

    selectedPage.classList.remove("hidden");

    document.querySelectorAll(".sidebar nav a").forEach(link => {
        link.classList.remove("active");
    });

    const activeLink = document.querySelector(
        `.sidebar nav a[data-page="${pageId}"]`
    );

    if (activeLink) {
        activeLink.classList.add("active");
    }

    const visibleMapId = {
        dashboardView: "map",
        activityMonitoringView: "activityMap"
    }[pageId];

    if (visibleMapId) {

        setTimeout(() => {

            if (maps[visibleMapId]) {
                maps[visibleMapId].invalidateSize();
            }

            const visibleChartId = pageId === "dashboardView"
                ? "seismicChart"
                : "activityChart";

            if (seismicCharts[visibleChartId]) {
                seismicCharts[visibleChartId].resize();
            }

        }, 150);

    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// =====================================
// SIDEBAR NAVIGATION
// =====================================

function setupNavigation() {

    document.querySelectorAll(".sidebar nav a[data-page]")

        .forEach(link => {

            link.addEventListener("click", event => {

                event.preventDefault();

                showPage(link.dataset.page);

            });

        });

}


// =====================================
// HAMBURGER / SIDEBAR TOGGLE
// =====================================

function setupMenuToggle() {

    const menuToggle = document.getElementById("menuToggle");

    if (!menuToggle) return;

    function updateMenuButton() {

        const isCollapsed =
            document.body.classList.contains("sidebar-collapsed");

        menuToggle.setAttribute(
            "aria-expanded",
            String(!isCollapsed)
        );

        menuToggle.setAttribute(
            "aria-label",
            isCollapsed
                ? "Expand navigation menu"
                : "Collapse navigation menu"
        );

    }

    menuToggle.addEventListener("click", function () {

        document.body.classList.toggle("sidebar-collapsed");

        updateMenuButton();

    });

    document.querySelectorAll(".sidebar nav a[data-page]")

        .forEach(link => {

            link.addEventListener("click", function () {

                if (
                    window.matchMedia("(max-width: 600px)").matches
                ) {

                    document.body.classList.add("sidebar-collapsed");

                    updateMenuButton();

                }

            });

        });

    window.addEventListener("resize", function () {

        if (window.innerWidth > 600) {
            document.body.classList.remove("sidebar-collapsed");
        }

        updateMenuButton();

    });

    updateMenuButton();

}


// =====================================
// STATUS CLASSIFICATION
// =====================================

function determineStatus(pga, tolerance) {

    if (pga >= tolerance) {
        return "Breached";
    }

    if (pga >= tolerance * 0.60) {
        return "Elevated";
    }

    return "Normal";

}


// =====================================
// LEAFLET MAP INITIALIZATION
// =====================================

function initializeMap(mapId = "map") {

    const mapElement = document.getElementById(mapId);

    if (!mapElement || typeof L === "undefined") {

        console.error(
            "Map initialization failed for:",
            mapId,
            "Check Leaflet."
        );

        return;

    }

    if (maps[mapId]) {
        return;
    }

    const mapInstance = L.map(mapId).setView(
        [14.44577, 121.02714],
        16
    );

    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            referrerPolicy: "strict-origin-when-cross-origin"
        }
    ).addTo(mapInstance);

    maps[mapId] = mapInstance;
    mapMarkers[mapId] = {};

    updateMapMarkers();

}


// =====================================
// MAP MARKER COLORS
// =====================================

function getMarkerColor(status) {

    if (status === "Breached") {
        return "#DC3545";
    }

    if (status === "Elevated") {
        return "#E5A000";
    }

    return "#198754";

}


// =====================================
// UPDATE GPS MAP MARKERS
// =====================================

function updateMapMarkers() {

    if (
        Object.keys(maps).length === 0 ||
        typeof L === "undefined"
    ) {
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

        Object.entries(maps).forEach(([mapId, mapInstance]) => {

            const markersForMap = mapMarkers[mapId];

            if (markersForMap[building.id]) {

                markersForMap[building.id]
                    .setLatLng([
                        building.latitude,
                        building.longitude
                    ])
                    .setIcon(markerIcon)
                    .setPopupContent(popupContent);

            } else {

                markersForMap[building.id] = L.marker(
                    [
                        building.latitude,
                        building.longitude
                    ],
                    {
                        icon: markerIcon
                    }
                )
                .addTo(mapInstance)
                .bindPopup(popupContent);

            }

        });

    });

}


// =====================================
// BUILDING MONITORING FILTERS
// =====================================

const buildingFilters = {
    building: "all",
    search: ""
};


function getFilteredBuildings() {

    const search = buildingFilters.search.trim().toLowerCase();

    return buildings.filter(building => {

        const buildingMatch =
            buildingFilters.building === "all" ||
            String(building.id) === buildingFilters.building;

        const searchMatch =
            search === "" ||
            building.name.toLowerCase().includes(search) ||
            building.location.toLowerCase().includes(search);

        return buildingMatch && searchMatch;

    });

}


function formatCapture(timestamp) {

    if (!timestamp) {
        return "Waiting...";
    }

    const date = new Date(timestamp);

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    }) + " · " + date.toLocaleTimeString();

}


function updateLastCapture() {

    const element = document.getElementById("bmLastCapture");

    if (!element) return;

    const latest = Math.max(
        0,
        ...buildings.map(b => b.lastCapture || 0)
    );

    element.textContent = formatCapture(latest);

}


// =====================================
// UPDATE BUILDING TABLES
// =====================================

function updateBuildingTable() {

    const dashboardTable = document.getElementById("buildingTable");

    if (dashboardTable) {

        dashboardTable.innerHTML = buildings.map(building => `
            <tr>
                <td>${escapeHTML(building.name)}</td>
                <td>${escapeHTML(building.location)}</td>
                <td>${Number(building.pga).toFixed(3)} m/s²</td>
                <td>${Number(building.tolerance).toFixed(2)} m/s²</td>
                <td>${escapeHTML(building.magnitude)}</td>
                <td>
                    <span class="status ${building.status}">
                        ${building.status === "Breached" ? "Threshold Breached" : building.status}
                    </span>
                </td>
            </tr>
        `).join("");

    }

    const pageTable = document.getElementById("buildingTablePage");

    if (!pageTable) return;

    const list = getFilteredBuildings();

    if (list.length === 0) {

        pageTable.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No buildings match the selected filters.
                </td>
            </tr>
        `;

    } else {

        pageTable.innerHTML = list.map(building => {

            const percent = Math.min(
                (building.pga / building.tolerance) * 100,
                100
            );

            const displayedStatus = building.status === "Breached"
                ? "Threshold Breached"
                : building.status;

            return `
                <tr>
                    <td><strong>${escapeHTML(building.name)}</strong></td>
                    <td>${escapeHTML(building.location)}</td>
                    <td class="pga-cell">
                        ${Number(building.pga).toFixed(3)} m/s²
                        <div class="pga-bar">
                            <div class="pga-fill fill-${building.status}"
                                 style="width:${percent.toFixed(0)}%"></div>
                        </div>
                    </td>
                    <td>${Number(building.tolerance).toFixed(2)} m/s²</td>
                    <td>${escapeHTML(building.magnitude)}</td>
                    <td>
                        <span class="status ${building.status}">
                            ${displayedStatus}
                        </span>
                    </td>
                    <td class="capture-cell">${formatCapture(building.lastCapture)}</td>
                </tr>
            `;

        }).join("");

    }

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    setText("bmShown", list.length);

    setText(
        "bmNormal",
        list.filter(b => b.status === "Normal").length
    );

    setText(
        "bmElevated",
        list.filter(b => b.status === "Elevated").length
    );

    setText(
        "bmBreached",
        list.filter(b => b.status === "Breached").length
    );

    setText(
        "bmResultCount",
        `Showing ${list.length} of ${buildings.length} buildings.`
    );

    updateLastCapture();

}


// =====================================
// BUILDING SEARCH + DROPDOWN
// =====================================

function setupBuildingFilters() {

    const combo = document.getElementById("bmCombo");
    const input = document.getElementById("bmSearch");
    const toggle = document.getElementById("bmToggle");
    const list = document.getElementById("bmList");

    if (!combo || !input || !toggle || !list) return;

    let activeIndex = -1;
    let visibleItems = [];

    function getItems() {

        const query = buildingFilters.search.trim().toLowerCase();

        const matches = buildings.filter(building =>
            query === "" ||
            building.name.toLowerCase().includes(query) ||
            building.location.toLowerCase().includes(query)
        );

        const items = matches.map(building => ({
            id: String(building.id),
            name: building.name
        }));

        return query === ""
            ? [{ id: "all", name: "All buildings" }, ...items]
            : items;

    }

    function renderList() {

        visibleItems = getItems();

        if (visibleItems.length === 0) {

            list.innerHTML =
                '<li class="combo-empty">No matching buildings</li>';

            return;

        }

        list.innerHTML = visibleItems.map((item, index) => {

            const selected = item.id === buildingFilters.building;

            return `
                <li role="option"
                    data-id="${item.id}"
                    aria-selected="${selected}"
                    class="${selected ? "selected" : ""} ${index === activeIndex ? "active" : ""}">
                    ${escapeHTML(item.name)}
                </li>
            `;

        }).join("");

    }

    function openList() {

        combo.classList.add("open");
        list.hidden = false;

        input.setAttribute("aria-expanded", "true");

        renderList();

    }

    function closeList() {

        combo.classList.remove("open");
        list.hidden = true;

        input.setAttribute("aria-expanded", "false");

        activeIndex = -1;

    }

    function choose(id) {

        buildingFilters.building = id;
        buildingFilters.search = "";

        const selected = buildings.find(
            building => String(building.id) === id
        );

        input.value = selected ? selected.name : "";

        closeList();

        updateBuildingTable();

    }

    input.addEventListener("input", () => {

        buildingFilters.building = "all";
        buildingFilters.search = input.value;

        activeIndex = -1;

        openList();

        updateBuildingTable();

    });

    input.addEventListener("click", () => {

        if (!combo.classList.contains("open")) {
            openList();
        }

    });

    toggle.addEventListener("click", () => {

        if (combo.classList.contains("open")) {

            closeList();

        } else {

            openList();
            input.focus();

        }

    });

    list.addEventListener("mousedown", event => event.preventDefault());

    list.addEventListener("click", event => {

        const option = event.target.closest("li[data-id]");

        if (option) {
            choose(option.dataset.id);
        }

    });

    input.addEventListener("keydown", event => {

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {

            event.preventDefault();

            if (!combo.classList.contains("open")) {
                openList();
            }

            const step = event.key === "ArrowDown" ? 1 : -1;

            activeIndex =
                (activeIndex + step + visibleItems.length) %
                Math.max(visibleItems.length, 1);

            renderList();

        } else if (event.key === "Enter" && activeIndex >= 0) {

            event.preventDefault();

            choose(visibleItems[activeIndex].id);

        } else if (event.key === "Escape") {

            closeList();

        }

    });

    document.addEventListener("click", event => {

        if (!combo.contains(event.target)) {
            closeList();
        }

    });

}


// =====================================
// SUMMARY CARDS
// =====================================

function updateOverview() {

    const totalEvents = document.getElementById("totalEvents");
    const activeAlerts = document.getElementById("activeAlerts");
    const affectedBuildings = document.getElementById("affectedBuildings");
    const monitoredBuildings = document.getElementById("monitoredBuildings");

    if (totalEvents) {
        totalEvents.textContent = historyRecords.length;
    }

    const alertCount = buildings.filter(
        building =>
            building.status === "Elevated" ||
            building.status === "Breached"
    ).length;

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


// =====================================
// CURRENT SYSTEM ALERT
// =====================================

function updateSystemAlert() {

    const alertBox = document.getElementById("systemAlert");

    if (!alertBox) return;

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


// =====================================
// REAL-TIME SENSOR READINGS
// Demonstration values only.
// =====================================

function updateSensorReadings(pga) {

    const x = (
        Math.random() * 0.10 - 0.05
    ).toFixed(3);

    const y = (
        Math.random() * 0.10 - 0.05
    ).toFixed(3);

    const z = (
        9.81 + (Math.random() * 0.10 - 0.05)
    ).toFixed(3);

    const displayedReadings = {

        pgaValue: Number(pga).toFixed(3),
        pgaValuePage: Number(pga).toFixed(3),

        xValue: x,
        xValuePage: x,

        yValue: y,
        yValuePage: y,

        zValue: z,
        zValuePage: z

    };

    Object.entries(displayedReadings).forEach(([elementId, value]) => {

        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = value;
        }

    });

    const onlineElement = document.getElementById("onlineSensors");
    const offlineElement = document.getElementById("offlineSensors");
    const transmissionElement = document.getElementById("lastTransmission");

    if (onlineElement) {
        onlineElement.textContent = buildings.length;
    }

    if (offlineElement) {
        offlineElement.textContent = 0;
    }

    if (transmissionElement) {
        transmissionElement.textContent = new Date().toLocaleTimeString();
    }

}


// =====================================
// CHART.JS INITIALIZATION
// =====================================

function initializeChart(canvasId = "seismicChart") {

    const canvas = document.getElementById(canvasId);

    if (!canvas || typeof Chart === "undefined") {

        console.error(
            "Chart initialization failed. Check Chart.js."
        );

        return;

    }

    if (seismicCharts[canvasId]) return;

    const context = canvas.getContext("2d");

    seismicCharts[canvasId] = new Chart(context, {

        type: "line",

        data: {

            labels: [],

            datasets: [

                {

                    label: "PGA (m/s²)",

                    data: [],

                    borderColor: "#800000",

                    backgroundColor: "rgba(128, 0, 0, 0.12)",

                    borderWidth: 2,

                    pointRadius: 0,

                    pointHoverRadius: 3,

                    pointBackgroundColor: "#800000",

                    fill: true,

                    tension: 0.22

                }

            ]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            animation: false,

            interaction: {

                intersect: false,

                mode: "nearest"

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

                    suggestedMax: 0.5,

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

                        autoSkip: true,

                        maxTicksLimit: 6,

                        maxRotation: 0,

                        font: {
                            size: 10
                        }

                    }

                }

            }

        }

    });

}


// =====================================
// CONTINUOUS PGA WAVEFORM
// =====================================

function updateChart(pga) {

    const numericPGA = Number(pga);

    if (Number.isFinite(numericPGA)) {

        latestPGAReading = Math.max(0, numericPGA);

    }

}


function startPGAWaveform() {

    if (waveformTimer) {
        clearInterval(waveformTimer);
    }

    waveformTimer = setInterval(() => {

        waveformPhase += 0.20;

        const peak = Math.max(0, latestPGAReading);

        const waveEnvelope =
            0.12 + (0.88 * Math.abs(Math.sin(waveformPhase)));

        const smallVariation =
            0.96 + (Math.random() * 0.04);

        const pgaSample = Number(
            (peak * waveEnvelope * smallVariation).toFixed(3)
        );

        const timestamp = new Date().toLocaleTimeString();

        Object.values(seismicCharts).forEach(chart => {

            chart.data.labels.push(timestamp);

            chart.data.datasets[0].data.push(pgaSample);

            while (chart.data.labels.length > PGA_WAVEFORM_POINTS) {

                chart.data.labels.shift();

                chart.data.datasets[0].data.shift();

            }

            chart.options.scales.y.suggestedMax =
                Math.max(0.1, peak * 1.15);

            chart.update("none");

        });

    }, PGA_WAVEFORM_INTERVAL_MS);

}


// =====================================
// CREATE HISTORY RECORD
// =====================================

function addHistory(building) {

    const record = {

        timestamp: Date.now(),

        building: building.name,

        street: building.location,

        pga: Number(building.pga).toFixed(3),

        status: building.status

    };

    historyRecords.unshift(record);

    if (historyRecords.length > 500) {

        historyRecords = historyRecords.slice(0, 500);

    }

}


// =====================================
// DATE AND TIME FORMATTING
// =====================================

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


// =====================================
// SEISMIC HISTORY TABLE
// =====================================

function updateHistoryTable(records = historyRecords) {

    const table = document.getElementById("historyTable");

    if (!table) return;

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

            <td>${escapeHTML(getRecordDate(record))}</td>

            <td>${escapeHTML(getRecordTime(record))}</td>

            <td>${escapeHTML(record.building)}</td>

            <td>${escapeHTML(record.street || record.location || "")}</td>

            <td>${escapeHTML(record.pga)} m/s²</td>

            <td>
                <span class="status ${record.status}">
                    ${escapeHTML(record.status)}
                </span>
            </td>

        `;

        table.appendChild(row);

    });

}


// =====================================
// HISTORY FILTER FUNCTION
// =====================================

function filterHistoryRecords() {

    const searchInput = document.getElementById("searchHistory");

    const filterSelect = document.getElementById("historyFilter");

    const resultCount = document.getElementById("filterResultCount");

    if (!searchInput || !filterSelect) return;

    const searchValue = searchInput.value.trim().toLowerCase();

    const selectedFilter = filterSelect.value;

    const placeholders = {

        all: "Search all records...",

        date: "Enter date (YYYY-MM-DD)...",

        building: "Enter building name...",

        street: "Enter street or location...",

        time: "Enter time (e.g. 17:30 or 5:30 PM)..."

    };

    searchInput.placeholder =
        placeholders[selectedFilter] || "Search records...";

    const filteredRecords = historyRecords.filter(record => {

        const recordDate = getRecordDate(record).toLowerCase();

        const recordTime = getRecordTime(record).toLowerCase();

        const dateKey = getRecordDateKey(record).toLowerCase();

        const timeKey = getRecordTimeKey(record).toLowerCase();

        const buildingName =
            (record.building || "").toLowerCase();

        const streetLocation =
            (record.street || record.location || "").toLowerCase();

        const pgaValue =
            String(record.pga || "").toLowerCase();

        const statusValue =
            String(record.status || "").toLowerCase();

        if (searchValue === "") {
            return true;
        }

        switch (selectedFilter) {

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

            case "date":

                return (
                    recordDate.includes(searchValue) ||
                    dateKey.includes(searchValue)
                );

            case "building":

                return buildingName.includes(searchValue);

            case "street":

                return streetLocation.includes(searchValue);

            case "time":

                return (
                    recordTime.includes(searchValue) ||
                    timeKey.includes(searchValue)
                );

            default:

                return true;

        }

    });

    // Save matching records for export
    visibleHistoryRecords = filteredRecords;

    updateHistoryTable(filteredRecords);

    if (resultCount) {

        resultCount.textContent =
            `Showing ${filteredRecords.length} of ${historyRecords.length} records.`;

    }

}


// =====================================
// HISTORY SEARCH AND FILTER EVENTS
// =====================================

function setupHistoryFilters() {

    const searchInput = document.getElementById("searchHistory");

    const filterSelect = document.getElementById("historyFilter");

    if (!searchInput || !filterSelect) return;

    searchInput.addEventListener("input", function () {

        filterHistoryRecords();

    });

    filterSelect.addEventListener("change", function () {

        filterHistoryRecords();

        searchInput.focus();

    });

    filterHistoryRecords();

}


// =====================================
// HISTORY EXPORT: PDF AND EXCEL
// =====================================

function getHistoryExportRows() {

    return visibleHistoryRecords.map(record => [

        getRecordDate(record),

        getRecordTime(record),

        record.building || "",

        record.street || record.location || "",

        Number(record.pga ?? 0),

        record.status || ""

    ]);

}


// =====================================
// CLOSE EXPORT MENU
// =====================================

function closeExportMenu() {

    const menu = document.getElementById("exportOptions");

    const toggle = document.getElementById("exportToggle");

    if (menu) {
        menu.hidden = true;
    }

    if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
    }

}


// =====================================
// SETUP EXPORT DROPDOWN
// =====================================

function setupExportMenu() {

    const dropdown = document.getElementById("exportDropdown");

    const toggle = document.getElementById("exportToggle");

    const menu = document.getElementById("exportOptions");

    if (!dropdown || !toggle || !menu) return;

    toggle.addEventListener("click", event => {

        event.stopPropagation();

        const shouldOpen = menu.hidden;

        menu.hidden = !shouldOpen;

        toggle.setAttribute(
            "aria-expanded",
            String(shouldOpen)
        );

    });

    document.addEventListener("click", event => {

        if (!dropdown.contains(event.target)) {
            closeExportMenu();
        }

    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeExportMenu();
        }

    });

}


// =====================================
// EXPORT PDF
// =====================================

function exportHistoryPDF() {

    closeExportMenu();

    const rows = getHistoryExportRows();

    if (rows.length === 0) {

        alert("There are no matching seismic history records to export.");

        return;

    }

    if (!window.jspdf || !window.jspdf.jsPDF) {

        alert(
            "The PDF export library could not be loaded. Check your internet connection and reload the page."
        );

        return;

    }

    const { jsPDF } = window.jspdf;

    const report = new jsPDF({
        orientation: "landscape"
    });

    report.setFontSize(16);

    report.text(
        "SEVA - Seismic Activity History",
        14,
        16
    );

    report.setFontSize(9);

    report.text(
        `Generated: ${new Date().toLocaleString()}`,
        14,
        23
    );

    report.text(
        `Records: ${rows.length}`,
        14,
        28
    );

    if (typeof report.autoTable !== "function") {

        alert(
            "The PDF table plugin could not be loaded. Check your internet connection and reload the page."
        );

        return;

    }

    report.autoTable({

        startY: 34,

        head: [[
            "Date",
            "Time",
            "Building",
            "Street / Location",
            "PGA (m/s²)",
            "Status"
        ]],

        body: rows,

        theme: "grid",

        styles: {

            font: "helvetica",

            fontSize: 8,

            cellPadding: 3,

            overflow: "linebreak"

        },

        headStyles: {

            fillColor: [128, 0, 0],

            textColor: [255, 255, 255],

            fontStyle: "bold"

        },

        alternateRowStyles: {

            fillColor: [248, 244, 244]

        },

        margin: {

            left: 14,

            right: 14

        }

    });

    report.save("SEVA_Seismic_History.pdf");

}


// =====================================
// EXPORT EXCEL
// =====================================

function exportHistoryExcel() {

    closeExportMenu();

    const rows = getHistoryExportRows();

    if (rows.length === 0) {

        alert("There are no matching seismic history records to export.");

        return;

    }

    if (typeof XLSX === "undefined") {

        alert(
            "The Excel export library could not be loaded. Check your internet connection and reload the page."
        );

        return;

    }

    const headers = [

        "Date",

        "Time",

        "Building",

        "Street / Location",

        "PGA (m/s²)",

        "Status"

    ];

    const worksheet = XLSX.utils.aoa_to_sheet([

        headers,

        ...rows

    ]);

    worksheet["!cols"] = [

        { wch: 14 },

        { wch: 14 },

        { wch: 22 },

        { wch: 28 },

        { wch: 15 },

        { wch: 16 }

    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(

        workbook,

        worksheet,

        "Seismic History"

    );

    XLSX.writeFile(

        workbook,

        "SEVA_Seismic_History.xlsx"

    );

}


// =====================================
// DEMONSTRATION SENSOR DATA
//
// Generates simulated PGA readings.
// NOT actual ADXL355 readings.
// =====================================

function simulateSensorData() {

    buildings.forEach(building => {

        // Simulated PGA from 0.00 to 2.40 m/s²
        building.pga = Math.random() * 2.4;

        // Determine building status
        building.status = determineStatus(

            building.pga,

            building.tolerance

        );

        // Record capture time
        building.lastCapture = Date.now();

        // Add historical record
        addHistory(building);

    });

    // Limit history to 500 records
    if (historyRecords.length > 500) {

        historyRecords = historyRecords.slice(0, 500);

    }

    // Update building tables
    updateBuildingTable();

    // Update GPS maps
    updateMapMarkers();

    // Update summary cards
    updateOverview();

    // Get highest PGA
    const highestPGA = Math.max(

        ...buildings.map(building => building.pga)

    );

    // Update sensor readings
    updateSensorReadings(highestPGA);

    // Update PGA waveform source value
    updateChart(highestPGA);

    // Refresh history table and filters
    filterHistoryRecords();

}


// =====================================
// INITIALIZE APPLICATION
// =====================================

document.addEventListener("DOMContentLoaded", function () {

    // Sidebar navigation
    setupNavigation();

    // Sidebar hamburger toggle
    setupMenuToggle();

    // History filter and search
    setupHistoryFilters();

    // Export format menu
    setupExportMenu();

    // Building search + dropdown
    setupBuildingFilters();

    // Initialize dashboard charts
    initializeChart("seismicChart");

    initializeChart("activityChart");

    // Initialize maps
    initializeMap("map");

    initializeMap("activityMap");

    // Initial building table
    updateBuildingTable();

    // Initial summary cards
    updateOverview();

    // Initial simulated sensor readings
    simulateSensorData();

    // Start continuously scrolling PGA waveform
    startPGAWaveform();

    // Update demonstration readings every 10 seconds
    setInterval(simulateSensorData, 10000);

});


// =====================================
// HTML BUTTON ACCESS
// =====================================

window.showPage = showPage;

window.exportHistoryPDF = exportHistoryPDF;

window.exportHistoryExcel = exportHistoryExcel;
