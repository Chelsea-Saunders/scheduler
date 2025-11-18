import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";

window.supabase = supabase; // for debugging
window._isRedirectingToLogin = window._isRedirectingToLogin || false;

const holidays = [
    "2025-10-13", // Columbus Day
    "2025-11-11", // Veterans Day
    "2025-11-27", // Thanksgiving
    "2025-11-28", // Black Friday
    "2025-12-24", // Christmas Eve (observed)
    "2025-12-25", // Christmas
    "2026-01-01", // New Year's Day
    "2026-01-19", // Martin Luther King Jr. Day
    "2026-02-16", // Presidents' Day
    "2026-05-25", // Memorial Day
    "2026-07-03", // Independence Day (observed)
    "2026-09-07", // Labor Day
];

function setupDateButtons() {
    const tuesdayContainer = document.getElementById("tuesday-slots");
    const thursdayContainer = document.getElementById("thursday-slots");
    const availableDays = getNextTuesThurs(15); // next 15 days
    const dateButtons = [];
    const loadingMsg = document.querySelector("#pick-a-date .loading");

    if (loadingMsg) {
            loadingMsg.classList.add("fade-out");
            // wait for fade out then remove
            setTimeout(() => {
                loadingMsg.remove();
            }, 500);
        }

    availableDays.forEach(date => {
        const ymd = toHumanYMD(date); // machine friendly
        const label = date.toLocaleDateString("en-US", {  //human friendly
            weekday: "short", 
            month: "short", 
            day: "numeric",
        });
        const button = document.createElement("button");
        button.textContent = label; // user sees "Tue, Oct 24"
        button.dataset.ymd = ymd;   // dataset holds "2025-10-24"

        // skip holidays
        if (holidays.includes(ymd)) {
            button.textContent += " (Holiday)";
            button.disabled = true; 
            button.classList.add("holiday");
        }

        button.addEventListener("click", () => {
            dateButtons.forEach(btn => btn.classList.remove("selected"));
            button.classList.add("selected");
            showTimeSlots(date);
        });
        if (date.getDay() === 2) {
            tuesdayContainer.appendChild(button);
        } else if (date.getDay() === 4) {
            thursdayContainer.appendChild(button);
        }
        dateButtons.push(button);
    });
}

let isLoadingAppointments = false; 

// MY APPOINTMENTS
async function loadAppointments() {
    if (isLoadingAppointments) return; //prevent duplicate loads
    isLoadingAppointments = true; // lock while running

    const list = document.getElementById("my-appts");
    if (!list) return;
    list.innerHTML = "Loading...";

    try {
        // check current supabase session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (sessionError) {
            console.warn("Session error:", sessionError);
            list.textContent = "Session expired. Please sign in again.";
            showMessage("Please sign in again.", true);

            setTimeout(() => {
                window.location.href = "index.html?redirect=scheduler.html";
            }, 1500);
            return;
        }

        if (!user) { 
            console.warn("User not logged in:");
            setListMessage(list, "Please sign in to view appointments.", true); 

            if (!window._isRedirectingToLogin) {
                window._isRedirectingToLogin = true;
                showMessage("Please sign in. Redirecting to login...", true);

                setTimeout(() => {
                    window.location.replace("index.html?redirect=scheduler.html");
                }, 1500);
            }
            return; 
        }

        // fetch appointments for user
        const { data, error } = await supabase
            .from("appointments")
            .select("id, date, time, user_id")
            .eq("user_id", user.id)
            .order("date", { ascending: true })
            .order("time", { ascending: true });
        
        if (error) {
            console.error(error);
            setListMessage(list, "Could not load your appointments.", true);
            return;
        }

        if (!data || data.length === 0) {
            setListMessage(list, "You have no upcoming appointments.", true);
            return;
        }

        // show appointments list
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
                    // restore button if something goes wrong
                    cancelButton.disabled = false;
                    cancelButton.textContent = "Cancel";
                    // show error message
                    console.error(deleteError);
                    showMessage("Could not cancel that appointment. Please try again.");
                    return;
                }

                showMessage("Appointment cancelled.");

                // add fade out effect
                item.style.transition = "opacity 0.5s ease";
                item.style.opacity = "0";
                setTimeout(() => item.remove(), 500);

                await sendAppointmentEmail(
                    "cancel", 
                    user.email, 
                    user.user_metadata?.name || "", 
                    row.date, 
                    formatTime(row.time)
                );

                // small delay so supabase catches up
                await new Promise(res => setTimeout(res, 500));
                await loadAppointments();

                const matchingDay = new Date(row.date + "T12:00:00");
                await showTimeSlots(matchingDay);
            });

            item.appendChild(cancelButton);
            list.appendChild(item);
        });
    } catch (error) {
        console.error("Unexpected error loading appointments:", error);
        list.textContent = "Could not load your appointments. Please try again.";
    } finally {
        // unlock
        isLoadingAppointments = false;
    }
}

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

// Show more times when toggled
function setupShowMoreToggle(containerId, buttonId) {
    const container = document.getElementById(containerId);
    const button = document.getElementById(buttonId);

    if (!container || !button) return;

    button.addEventListener("click", () => {
        const isExpanded = container.classList.toggle("expanded");
        button.textContent = isExpanded ? "Show Less" : "Show More";
    });
}
setupShowMoreToggle("tuesday-slots", "show-more-tues");
setupShowMoreToggle("thursday-slots", "show-more-thurs");

// refresh list of booked time slots for a given date
let bookedTimesCache = [];

async function fetchBookedSlots(date) {
    const ymd = toHumanYMD(date);

    // get current user
    const { data: { session }, error: userError } = await supabase.auth.getSession();
    const user = session?.user;
    if (userError || !user) {
        if(!window._showLoginMessage) {
            showMessage("You must be logged in to view your booked slots.", true);
            window._showLoginMessage = true;
        }
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
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
                await fetchBookedSlots(date);
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
            sendAppointmentEmail(
                "appointment", 
                user.email, 
                user.user_metadata?.name || "", 
                date.toDateString(),
                formatTime(time)
            );

            await loadAppointments();
            await fetchBookedSlots(date);
            await showTimeSlots(date);

    } catch (error) {
        console.error("Unexpected error:", error);
        showMessage("Something went wrong. Please try again.");
    }
}

async function showTimeSlots(date) {

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
    const bookedTimes = (await fetchBookedSlots(date)) ?? [];

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

    heading.textContent = `Welcome ${displayName}! Let's schedule your 6-month checkup!`;
    loadAppointments();
}

// ensure user is logged in
async function checkUserOrRedirect() {
    let { data: { session } } = await supabase.auth.getSession();
    let user = session?.user;

    // retry for up to 2 seconds if supabase hasn't loaded the session yet
    let tries = 0;
    while (!user && tries < 10) {
        await new Promise(res => setTimeout(res, 200));
        ({ data: { session } } = await supabase.auth.getSession());
        user = session?.user;
        tries ++;
    }

    if (!user) {
        console.warn("No user session found, redirecting to login.");
        window.location.href = `index.html?redirect=scheduler.html`;
        return null;
    }
    console.log("Session confirmed for user:", user.email);
    return user;
}

// fills metadata name if not saved at signup
async function updateMissingNameMetadata(user) {
    if (!user.user_metadata?.name) {
        const cached = localStorage.getItem("fullName");
        if (cached) {
            await supabase.auth.updateUser({ data: { name: cached } });
            const { data: { session } } = await supabase.auth.getSession();
            const refreshed = session?.user;
            return refreshed;
        }
    }
    return user;
}

// ensure appointments refresh automatically when supabase detects a new session
function initAuthListener() {
    supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            console.log("Session active -> staying on page.");
            loadAppointments();
        } else {
            console.log("Session lost -> redirecting to login.");
            window.location.href = "index.html?redirect=scheduler.html";
        }
    });
}

// clearing textContent on lists
function setListMessage(list, message, isError = false) {
    list.textContent = message;
    list.classList.toggle("error", isError);
}

// send apointment notification email
async function sendAppointmentEmail(type, email, fullName, date, time) {
    try {
        const response = await fetch("https://rsceb.org/sendmail_scheduler.php", {
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ 
            type, 
            email, 
            name: fullName, 
            date, 
            time,
        }),
    });

        if (!response.ok) {
            console.error(`Email request failed with status ${response.status}`);
            showMessage(`Could not send ${type} email. Please contact support.`, true);
            return;
        }

        const result = await response.json();

        if (!result.ok) {
            console.error(`Email server returned error: ${result.error} || result.message`);
            showMessage(`Could not send ${type} email. Please contact support.`, true);
            return;
        }
        console.log(`${type} email send for ${email} on ${date} at ${time}`);
    } catch (error) {
        console.error(`Failed to send ${type} email:`, error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    let user = await checkUserOrRedirect();
    if (!user) return;

    user = await updateMissingNameMetadata(user);

    applyGreeting(user);
    initAuthListener();
    setupDateButtons();

    // load their appointments once on page load
    await loadAppointments();
});