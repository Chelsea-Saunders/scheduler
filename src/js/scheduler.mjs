import { supabase } from "../lib/supabase.mjs";

// PROTECTED: if they're not signed in, send them to the login page
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
    window.location.href = `/login?redirect=/schedule`;
}

// HELPER FUNCTIONS: 
// show date in human format
function toHumanYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
    // start from tomorrow at noon to avoid timezone issues
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
const daysContainer = document.getElementById("pick-a-date");
const availableDays = getNextTuesThurs(15); // next 15 days
const dateButtons = [];

availableDays.forEach(date => {
    const dayButton = document.createElement("button");
    //visible label
    dayButton.textContent = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    //machine value
    dayButton.dataset.ymd = toHumanYMD(date);
    //click handler
    dayButton.addEventListener("click", () => {
        // toggle selected time
        dateButtons.forEach(button => button.classList.remove("selected"));
        dayButton.classList.add("selected");
        // show time slots for that date
        showTimeSlots(date);
    });
    daysContainer.appendChild(dayButton);
    dateButtons.push(dayButton);
});
// preselect first available day on load
if (availableDays.length > 0) {
    dateButtons[0].classList.add("selected");
    showTimeSlots(availableDays[0]);
}
loadMyAppointments();

// show available time slots
async function showTimeSlots(date) {
    const slotsContainer = document.getElementById("time-slots");
    const ymd = toHumanYMD(date);

    slotsContainer.innerHTML = ""; // clear previous

    // fetch booked slots for that date
    const { data: bookedSlots, error } = await supabase 
        .from("appointments")
        .select("time")
        .eq("date", ymd);

    if (error) {
        console.error(error);
        slotsContainer.textContent = "⚠️Could not load time slots. Please try again.";
        return;
    }

    const bookedTimes = (bookedSlots ?? []).map(row => row.time);
    const allTimes = generateTimeSlots("09:00", "17:00", 30); // 9am-5pm, every 30 mins

    allTimes.forEach(time => {
        const timeButton = document.createElement("button");
        timeButton.textContent = time;

        if (bookedTimes.includes(time)) {
            timeButton.disabled = true;
            timeButton.classList.add("booked");
            timeButton.setAttribute("aria-disabled", "true");
        } else {
            timeButton.addEventListener("click", () => {
                selectTimeSlot(date, time);
            });
        }
        slotsContainer.appendChild(timeButton);
    });

    slotsContainer.style.display = "block";
}
// select/book a time slot
async function selectTimeSlot(date, time) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("⚠️ You must be logged in to book an appointment.");
        window.location.href = `/login?redirect=/schedule`;
        return;
    }
    const ymd = toHumanYMD(date);

    // call supabase to book
    try {
        const { error } = await supabase
            .from ("appointments")
            .insert ({ user_id: user.id, date: ymd, time });
            
        if (error) {
            // handle duplicates
            if (error.message?.toLowerCase().includes("duplicate")) {
                alert("❌ That slot is taken. Please choose another time.")
            } else {
                alert("⚠️Could not book that slot. It may have just been taken. Please try another.");
                console.error(error);
            }
            return;
        }
        alert(`✅ Appointment booked for ${date.toDateString()} at ${time}`);
        showTimeSlots(date);
        loadMyAppointments();

    } catch (error) {
        console.error("Unexpected error:", error);
        alert("⚠️Something went wrong. Please try again.");
    }
}
// MY APPOINTMENTS
async function loadMyAppointments() {
    const list = document.getElementById("my-appts");
    list.innerHTML = "Loading...";

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { list.textContent = "Please sign in."; return; }

    const { data, error } = await supabase
        .from("appointments")
        .select("id, date, time")
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
    
    if (error) {
        console.error(error);
        list.textContent = "⚠️Could not load your appointments.";
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
        item.textContent = `${when.toLocaleDateString()} - ${row.time}`;

        // add cancel button
        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", async() => {
            const { error: deleteError } = await supabase.from("appointments").delete().eq("id", row.id);
            if (deleteError) {
                console.error(deleteError);
                alert("⚠️Could not cancel that appointment. Please try again.");
                return;
            }
            loadMyAppointments();
            // if you cancelled the current displayed date, refresh slots
            // find the matching availableDays entry
            const matchingDay = availableDays.find(day => toHumanYMD(day) === row.date);
            if (matchingDay) showTimeSlots(matchingDay);
        });

        item.appendChild(cancelButton);
        list.appendChild(item);
    });
}