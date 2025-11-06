import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";


// CHECK WHETHER AN EMPLOEE IS ALLOWED TO VIEW THIS PAGE
function verifyEmployeeAccess() {
    const employeeSession = JSON.parse(localStorage.getItem("employeeLoggedIn"));
    const now = Date.now();

    if (!employeeSession || now > employeeSession.expiresAt) {
        console.warn("Employee session expired: automatically logging out.");
        localStorage.removeItem("employeeLoggedIn");
        window.location.href = "./employee.html";
        return false;
    }

    console.log("Employee verified, showing calendar.");
    return true;
}

// logout
function employeeLogout() {
    localStorage.removeItem("employeeLoggedIn");
    // sign out of supabase
    supabase.auth.signOut().catch(error => {
        console.warn("Supabase logout failed", error);
    });
    window.location.href = "index.html";
}

// CREATE CALENDAR
async function loadCalendarSlots() {
    console.log("Loading calendar slots...");

    // Fetch calendar slots from the database
    const { data: slots, error } = await supabase
        .from("appointments")
        .select("*")
        .order("date", { ascending: true })
        .order("time", {ascending: true });

    if (error) {
        showMessage("Failed to load calendar slots.", true);
        console.error("Error loading slots:", error);
        return;
    }

    console.log("slots loaded:", slots);
    renderCalendar(slots);
}

// create calendar
function renderCalendar(slots) {
    const container = document.getElementById("calendar-container");
    if (!container) {
        return;
    }

    if (!slots || slots.length === 0) {
        container.innerHTML = `<p>No available slots.</p>`;
        return;
    }

    container.innerHTML = slots
        .map(slot => `
            <div class="slot ${slot.email ? "booked" : "available"}">
                <p><strong>${slot.date || "Unscheduled"}</strong> - ${slot.label}</p>
                <p>Status: ${slot.email ? "Booked" : "Available"}</p>
                ${slot.email 
                    ? `
                        <p>Booked by: ${slot.email}</p>
                        <button class="delete-button" data-id="${slot.id}">Delete Appointment</button>
                     `
                    :`
                        <button class="book-button" data-id="${slot.id}">Book</button>
                     `
                }
            </div>
        `)
        .join("");

    // attach booking handlers
    document.querySelectorAll(".book-button").forEach((button) => {
        button.addEventListener("click", async (event) => {
            const slotId = event.target.dataset.id;
            await bookSlot(slotId);
        });
    });

    // attach deletion handlers
    document.querySelectorAll(".delete-button").forEach((button) => {
        button.addEventListener("click", async (event) => {
            const slotId = event.target.dataset.id;
            await deleteSlot(slotId);
        });
    });
}

// book slot through supabase
async function bookSlot(slotId) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
        showMessage("You must be logged in to book a slot.", true);
        return;
    }

    const { error } = await supabase
        .from("appointments")
        .update({
            email: user.email, 
            phone: user.phone || null, 
            date: new Date().toISOString().split("T")[0], 
        })
        .eq("id", slotId);

    if (error) {
        showMessage("Failed to book slot. Please try again.", true);
        console.error("Booking error:", error);
        return;
    }

    showMessage("Slot booked successfully!");
    await loadCalendarSlots();
}

async function deleteSlot(slotId) {
    const { error } = await supabase
        .from("appointments")
        .update({ email: null, phone: null })
        .eq("id", slotId);

    if (error) {
        showMessage("Failed to delete booking. Please try again.", true);
        console.error("Deletion error:", error);
        return;
    }

    showMessage("Appointment deleted successfully!");
    await loadCalendarSlots();
}

document.addEventListener("DOMContentLoaded", () => {
    // only run if your calendar setup is varification passed
    if (!verifyEmployeeAccess()) return;
    //logout handler
    const logout = document.getElementById("employee-logout");
    if (logout) {
        logout.addEventListener("click", (event) => {
            event.preventDefault();
            employeeLogout();
            showMessage("Logging out...");

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
        });
    }

    // rest of calendar initialization code here
    console.log("Calendar initialization starting...");
    loadCalendarSlots();
});