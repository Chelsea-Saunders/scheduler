import { supabase } from "./supabase.mjs";
import { showMessage } from "./ui.mjs";

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

export async function initScheduler({ role = "user" } = {}) {
    const user = await getCurrentUser();
    if (!user) {
        showMessage("User not logged in. Please log in to access the scheduler.", true);
        return;
    }

    if (document.getElementById("tuesday-slots") && document.getElementById("thursday-slots")) {
        setupDateButtons();
    }
    await loadAppointments(user, role);
    initAuthListener();

    // if needed show admin/employee tools
    if (role !== "user") {
        setupAdminControls(role);
    }
}

// AUTHENTICATE USER
async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
        showMessage("Please log in first.", true);
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1500);
    }
    return user;
}

// LOAD APPOINTMENTS
async function loadAppointments(user, role) {
    const table = document.getElementById("appointments-table");
    const list = document.getElementById("my-appts");

    if (table) {
        // table version for dashboards
        let tbody = table.querySelector("tbody");
        if (!tbody) {
            tbody = document.createElement("tbody");
            table.appendChild(tbody);
        }
        tbody.innerHTML = "<tr><td colspan='6'>Loading appointments...</td></tr>";
    } else if (list) {
        // list version for users
        list.textContent = "Loading appointments...";
    }

    let query = supabase
        .from("appointments")
        .select("*")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
    
    // restrict users to their own appointments
    if (role === "user") {
        query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error loading appointments:", error);
        showMessage("Could not load appointments.", true);
        return;
    }

    if (table) {
        // populate table
        const tbody = table.querySelector("tbody");
        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="6">No appointments found.</td><tr>`;
            return;
        }

        tbody.innerHTML = data
            .map(
                (appointment) => `
                    <tr>
                        <td>${appointment.name}</td>
                        <td>${appointment.email}</td>
                        <td>${appointment.date}</td>
                        <td>${appointment.time}</td>
                        <td>${appointment.status || "-"}></td>
                        <td>
                            ${(role !== "user" || appointment.user_id === user.id)
                                ?`<button class="delete-appt" data-id="${appointment.id}">Delete</button>`
                                : ""
                            }
                        </td>
                    </tr>`
                ).join("");

        // hook up delete buttons
        tbody.querySelectorAll(".delete-appt").forEach((button) => {
            button.addEventListener("click", async () => {
                await deleteAppointment(button.dataset.id);
            });
        });
    } else if (list) {
        // populate list
        list.innerHTML = "";
        if (!data.length) {
            list.textContent = "No appointments found.";
            return;
        }
        data.forEach((appointment) => {
        const item = document.createElement("div");
        item.className = "appointment";
        item.textContent = `
            ${appointment.time} :
            ${appointment.name} :
            ${appointment.date} :
            ${appointment.email} 
        `;

        // allow deletion if != user or it if't their own 
        if (role !== "user" || appointment.user_id === user.id) {
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.classList.add("delete-button");
            deleteButton.addEventListener("click", () => deleteAppointment(appointment.id));
            item.appendChild(deleteButton);
        }

        list.appendChild(item);
    });
}
}
// RELOAD APPTS
async function reloadAppointments() {
    const user = await getCurrentUser();
    const { data: employee } = await supabase
        .from("employees")
        .select("role")
        .eq("user_id", user.id)
        .single();

    await loadAppointments(user, employee?.role || "user");
}

// DELETE APPOINTMENT AND REFRESH
async function deleteAppointment(id) {
    const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);
    
    if (error) {
        showMessage("There was a problem deleting the appointment. Please try again.", true);
        console.error("deletion error:", error);
    } else {
        showMessage("Appointment deleted.");
        // reload appointments
        await reloadAppointments();
    }
}

// ADMIN/EMPLOYEE CONTROLS
function setupAdminControls(role) {
    const section = document.getElementById("admin-controls");
    if (!section) return;

    if ((role === "admin" || role === "employee") && !section.querySelector("button")) {
        const createButton = setupCreateAppointmentModal();
        section.appendChild(createButton);
    }
}

// SETUP DATE BUTTONS
function setupDateButtons() {
    const tuesdayContainer = document.getElementById("tuesday-slots");
    const thursdayContainer = document.getElementById("thursday-slots");
    if (!tuesdayContainer || !thursdayContainer) return;

    const availableDays = getNextTuesThurs(15); // next 15 days
    const dateButtons = [];

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
            showMessage(`Selected ${label}`);
        });

        if (date.getDay() === 2) tuesdayContainer.appendChild(button);
        else if (date.getDay() === 4) thursdayContainer.appendChild(button);

        dateButtons.push(button);
    });
}

// GET ONLY TUESDAYS AND THURSDAYS
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
function toHumanYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// AUTH STATE LISTENER
function initAuthListener() {
    supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
            showMessage("Session expired. Redirecting...", true);
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
        }
    });
}

// CREATE APPOINTMENT 
export function setupCreateAppointmentModal() {
    const modal = document.getElementById("create-appointment-modal");
    const form = document.getElementById("create-appointment");
    const cancelButton = document.getElementById("cancel-appointment");

    if (!modal || !form) return;

    // open modal
    const openButton = document.createElement("button");
    openButton.textContent = "New Appointment";
    openButton.addEventListener("click", () => {
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
    });

    // close modal
    cancelButton?.addEventListener("click", () => {
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
        form.reset();
    });

    // handle form submission
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = form.querySelector("#name").value.trim();
        const email = form.querySelector("#email").value.trim();
        const date = form.querySelector("#date").value;
        const time = form.querySelector("#time").value;
        const duration = 30;

        if (!name || !email || !date || !time) {
            showMessage("Please fill out all fields.", true);
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const adminUser = session?.user;
        if (!adminUser) {
            showMessage("Session expired. Please log in again.", true);
            return;
        }
        const { error } = await supabase
            .from("appointments")
            .insert([{
                user_id: adminUser.id,  // booked by admin
                name, 
                email, 
                date, 
                time, 
                duration_minutes: duration, 
                label: "Manual entry"
            }]);

            if (error) {
                console.error("Create appointment error:", error);
                showMessage("Failed to create appointment.", true);
            } else {
                showMessage("Appointment created successfully!");
                form.reset();
                modal.classList.add("hidden");
                modal.setAttribute("aria-hidden", "true");
                await loadAppointments(adminUser, "admin");
            }
    });
    return openButton;
}