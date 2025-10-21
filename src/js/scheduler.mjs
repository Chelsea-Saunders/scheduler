import { supabase } from "../lib/supabase.mjs";

window.supabase = supabase; // for debugging
window._isRedirectingToLogin = window._isRedirectingToLogin || false;

const holidays = [
    "2025-10-13", // Columbus Day
    "2025-11-11", // Veterans Day
    "2025-11-27", // Thanksgiving
    "2025-12-25", // Christmas
    "2026-01-01", // New Year's Day
    "2026-01-19", // Martin Luther King Jr. Day
    "2026-02-16", // Presidents' Day
    "2026-05-25", // Memorial Day
    "2026-07-03", // Independence Day (observed)
    "2026-09-07", // Labor Day
];

// MY APPOINTMENTS
async function loadMyAppointments() {
    const list = document.getElementById("my-appts");
    list.innerHTML = "Loading...";

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) { 
        console.warn("User not logged in:", userError?.message);

        list.textContent = "Please sign in to view appointments."; 

        if (!window._isRedirectingToLogin) {
            window._isRedirectingToLogin = true;
            showMessage("Please sign in. Redirecting to login...", true);

            // small delay for message visibility
            setTimeout(() => {
                window.location.replace("index.html?redirect=scheduler.html");
            }, 1500);
        }
        return; 
    }

    const { data, error } = await supabase
        .from("appointments")
        .select("id, date, time, user_id")
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
        
    
    if (error) {
        console.error(error);
        list.textContent = "Could not load your appointments.";
        return;
    }

    if (!data || data.length === 0) {
        list.textContent = "You have no upcoming appointments.";
        return;
    }

    list.innerHTML = "";
    data.forEach(row => {
        const item = document.createElement("div");
        const when = new Date(row.date + "T12:00:00"); // avoid timezone issues
        item.className = "appt";
        item.textContent = `${when.toLocaleDateString()} - ${formatTime(row.time)}`;

        // add cancel button
        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", async() => {

            // disable button to prevent double clicking
            cancelButton.disabled = true;
            cancelButton.textContent = "Cancelling...";
            
            // call supabase to delete
            const { error: deleteError } = await supabase
                .from("appointments")
                .delete()
                .eq("id", row.id)
                .eq("user_id", user.id); // ensures user only deletes their own appt

            if (deleteError) {
                // restor button if something goes wrong
                cancelButton.disabled = false;
                cancelButton.textContent = "Cancel";
                // show error message
                console.error(deleteError);
                showMessage("⚠️Could not cancel that appointment. Please try again.");
                return;
            }

            showMessage("Appointment cancelled.");

            await loadMyAppointments();
            // if you cancelled the current displayed date, refresh slots
            // find the matching availableDays entry
            const matchingDay = availableDays.find(
                day => toHumanYMD(day) === row.date
            );
            if (matchingDay) 
            await showTimeSlots(matchingDay);
            await refreshBookedSlots(matchingDay);
        });
        item.appendChild(cancelButton);
        list.appendChild(item);
    });
}

function showMessage(message, isError = false) {
    const messageBox = document.getElementById("status-message");
    messageBox.textContent = message;

    // reset classes
    messageBox.classList.remove("hidden", "error", "show");

    if (isError) messageBox.classList.add("error");
    messageBox.classList.add("show");

    // auto hide after 3 seconds
    setTimeout(() => {
        messageBox.classList.remove("show");
        setTimeout(() => messageBox.classList.add("hidden"), 400);
    }, 3000);
}




// HELPER FUNCTIONS: 
// show date in human format
function toHumanYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function formatTime(timeStr) {
    const [hour, minute] = timeStr.split(":").map(Number);
    const suffix = hour >=12 ? "PM" : "AM";
    const displayHour = ((hour + 11) % 12 + 1);
    return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}
function normalizeHHMM(timeString) {
    const match = String(timeString || "").trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hh = match[1].padStart(2, "0");
    const mm = match[2];
    return `${hh}:${mm}`;
}

// GENERATE AVAILABLE SLOTS
function generateTimeSlots(start, end, intervalMinutes) {
    const times = [];
    let [hour, minute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    
    while (hour < endHour || (hour === endHour && minute < endMinute)) {
        const hr = hour.toString().padStart(2, "0");
        const min = minute.toString().padStart(2, "0");
        times.push(`${hr}:${min}`);
        minute += intervalMinutes;
        if (minute >= 60) {
            minute -= 60;
            hour += 1;
        }
    }
    return times;
}
// get next few weeks to schedule
function getNextTuesThurs(weeks = 15) {
    const out = [];
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    const needed = weeks * 2; // 2 days per week
    let day = new Date(start);

    while (out.length < needed) {
        const dow= day.getDay(); // 0=Sun, 1=Mon, 2=Tues...
        if (dow === 2 || dow === 4) out.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }
    return out;
}

// CREATE DATE BUTTONS
const tuesdayContainer = document.getElementById("tuesday-slots");
const thursdayContainer = document.getElementById("thursday-slots");
const availableDays = getNextTuesThurs(15); // next 15 days
const dateButtons = [];

availableDays.forEach(date => {
    const ymd = toHumanYMD(date);
    // skip hoidays
    if (holidays.includes(ymd)) {
        const dayButton = document.createElement("button");
        dayButton.textContent = `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} (Holiday)`;
        dayButton.disabled = true;
        dayButton.classList.add("holiday");
        if (date.getDay() === 2) tuesdayContainer.appendChild(dayButton);
        else if (date.getDay() === 4) thursdayContainer.appendChild(dayButton);
        return;
    }
    const dayButton = document.createElement("button");
    const label = date.toLocaleDateString("en-US", {
        weekday: "short", 
        month: "short", 
        day: "numeric",
    });
    dayButton.textContent = label;
    dayButton.dataset.ymd = toHumanYMD(date);

    dayButton.addEventListener("click", () => {

        // clear previous selection
        dateButtons.forEach(btn => btn.classList.remove("selected"));
        dayButton.classList.add("selected");

        // show times for that specific day
        showTimeSlots(date);
    });

    // add to correct container
    if (date.getDay() === 2) tuesdayContainer.appendChild(dayButton);
    else if (date.getDay() === 4) thursdayContainer.appendChild(dayButton);

    dateButtons.push(dayButton);
});

// Show more times when toggled
function setupShowMoreToggle(containerId, buttonId) {
    const container = document.getElementById(containerId);
    const button = document.getElementById(buttonId);

    if (!container || !button) return;

    button.addEventListener("click", () => {
        const isExpanded = container.classList.toggle("expanded");
        button.textContent = isExpanded ? "Show less" : "Show more";
    });
}
setupShowMoreToggle("tuesday-slots", "show-more-tues");
setupShowMoreToggle("thursday-slots", "show-more-thurs");

// refresh list of booked time slots for a given date
let bookedTimesCache = [];

async function refreshBookedSlots(date) {
    const ymd = toHumanYMD(date);

    // get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.warn("No logged in user, show only global bookings.");
        showMessage("You must be logged in to view your booked slots.", true);
    }

    // get all booked times for that date (share calendar)
    const { data: allBookings, error } = await supabase
        .from ("appointments")
        .select("time, user_id")
        .eq("date", ymd);

    if (error) {
        console.error("Error fetching booked times:", error);
        bookedTimesCache = [];
        return bookedTimesCache;
    }

    // show lost of all booked times
    const allBooked = (allBookings ?? [])
        .map(row => normalizeHHMM(row.time))
        .filter(Boolean);

    // store which ones belong to the current user (for cancel buttons)
    const myBooked = (allBookings ?? [])
        .filter(row => user && row.user_id === user.id)
        .map(row => normalizeHHMM(row.time));

    bookedTimesCache = allBooked;
    window._myBookedTimes = myBooked; 

    return bookedTimesCache;
}

// select/book a time slot
async function selectTimeSlot(date, time) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showMessage("You must be logged in to book an appointment.");
        window.location.href = `index.html?redirect=scheduler.html`;
        return;
    }
    // format date as YYYY-MM-DD
    const ymd = toHumanYMD(date);

    // call supabase to book
    try {
        const { data, error, status } = await supabase
            .from ("appointments")
            .insert ([
                { 
                    user_id: user.id, 
                    date: ymd, 
                    time,
                    label: "Consultation",
                    duration_minutes: 30,
                },
            ]);

            // handle duplicate / conflict (409)
            if (status === 409 || (error && error.message?.includes("duplicate"))) {
                showMessage("That time slot is already booked. Please choose another time.", true);
                await refreshBookedSlots(date);
                await showTimeSlots(date);
                return;
            }
            
            // any other errors
            if (error) {
                console.error("Insert failed:", error);
                showMessage("Could not book that time slot. Please try again.", true);
                return;
            }

            // Success message
            showMessage(`Appointment booked for ${date.toDateString()} at ${formatTime(time)}`);

            // small delay so supabase catches up
            await new Promise(res => setTimeout(res, 600));

            // always refresh from live data after booking
            await loadMyAppointments();
            await refreshBookedSlots(date);
            await showTimeSlots(date);

    } catch (error) {
        console.error("Unexpected error:", error);
        showMessage("Something went wrong. Please try again.");
    }
}

async function showTimeSlots(date) {

    const ymd = toHumanYMD(date);
    const slotsContainer = document.getElementById("time-slots");
    const timeSection = document.getElementById("time-section");

    // hide time slots until date is selected
    timeSection.classList.remove("active");
    slotsContainer.innerHTML = "";

    document.getElementById("pick-a-date").style.display = "none";

    // header
    const selectedDateHeader = document.getElementById("selected-dates");
    selectedDateHeader.textContent = date.toLocaleDateString("en-US", {
        weekday: "long", 
        month: "long", 
        day: "numeric",
        year: "numeric"
    });
    // make visible in css
    selectedDateHeader.style.display = "block";
    // triggers fade-in in css
    selectedDateHeader.classList.add("visible");

    // get booked times from supabase
    const bookedTimes = (await refreshBookedSlots(date)) ?? [];


        // ------------TEST----------------
    // if (window.DEBUG_SCHEDULER) {
    //     console.group("🕓 DEBUG booked slot comparison for " + toHumanYMD(date));
    //     const { data: rawData } = await supabase
    //         .from("appointments")
    //         .select("user_id, time, date")
    //         .eq("date", toHumanYMD(date));
    //     console.table(rawData);

    //     const normalizedDebug = rawData.map(row => ({
    //         raw_time: row.time,
    //         normalized: normalizeHHMM(row.time),
    //         user_id: row.user_id
    //     }));
    //     console.table(normalizedDebug);

    //     const allTimesDebug = generateTimeSlots("09:00", "17:00", 30);
    //     allTimesDebug.forEach(time => {
    //         const normalized = normalizeHHMM(time);
    //         const isBooked = bookedTimes.includes(normalized);
    //         console.log(`${normalized} => ${isBooked ? "BOOKED" : "available"}`);
    //     });
    //     console.groupEnd();
    // }

// ------------------END TEST------------------





    // create time slot buttons
    const allTimes = generateTimeSlots("09:00", "17:00", 30);
    allTimes.forEach(time => {
        const normalized = normalizeHHMM(time);
        const timeButton = document.createElement("button");
        timeButton.classList.add("slot-button");
        timeButton.textContent = formatTime(normalized);

        // if this time slot is booked by anyone (global calendar)
        if (bookedTimes.includes(normalized)) {
            timeButton.disabled = true;
            timeButton.classList.add("booked");
            timeButton.textContent += " (Booked)";

            // but if it's booked by current user, allow cancel
            if (window._myBookedTimes?.includes(normalized)) {
                timeButton.classList.remove("booked");
                timeButton.classList.add("mine");
                timeButton.textContent = `${formatTime(normalized)} (Your booking)`;
            }
        } else {
            timeButton.addEventListener("click", () => selectTimeSlot(date, time));
        }
        slotsContainer.appendChild(timeButton);
    });

    if (allTimes.length > 0) {
        requestAnimationFrame(() => {
            setTimeout(() => timeSection.classList.add("active"), 150);
        });
    }
}

document.getElementById("back-to-dates")?.addEventListener("click", () => {
    // show day selection again
    document.getElementById("pick-a-date").style.display = "block";

    // hide the time section
    document.getElementById("time-section").classList.remove("active");

    // fade out the selected date text smoothly
    const selectedDateHeader = document.getElementById("selected-dates");
    selectedDateHeader.classList.remove("visible");
    setTimeout(() => {
        selectedDateHeader.textContent = "";
    }, 400);

    // clear any time slot selection
    document.getElementById("time-slots").innerHTML = "";
});
function applyGreeting(user) {
    const heading = document.getElementById("welcome-heading");
    const displayName = 
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Friend";

    heading.textContent = `Welcome ${displayName}! Let's schedule your 6-month cleaning!`;
    loadMyAppointments();
}



document.addEventListener("DOMContentLoaded", async () => {
    // PROTECTED: if they're not signed in, send them to the login page
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = `index.html?redirect=scheduler.html`;
        return;
    } 
    // one-time repair if metadata didn't stick at sign up
    if (!user.user_metadata?.name) {
        const cached = localStorage.getItem("fullName");
        if (cached) {
            await supabase.auth.updateUser({ data: { name: cached } });
            // refetch fresh user after update
            const refreshed = (await supabase.auth.getUser()).data.user;
            applyGreeting(refreshed);
            return;
        }
    }
    applyGreeting(user);

    supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            loadMyAppointments();
        }
    });
});