import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";

// PREVENT UNAUTHORIZED ACCESS TO ADMIN DASHBOARD
async function verifyAdminAccess() {

    try {
        const { data, error: userError } = await supabase.auth.getUser();
        const user = data?.user;

        if (userError || !user) {
            // not logged in
            window.location.href = "index.html";
            return;
        }

        // check if user is admin
        const { data: employee, error: roleError } = await supabase 
            .from("employees")
            .select("role")
            .eq("id", user.id)
            .single();

        if (roleError || employee?.role !== "admin") {
            showMessage("Access denied: Admins only.", true);
            setTimeout(() => {
                window.location.href = "index.html";
            }, 2000);
            return;
        } 

        // admin verified
        console.log("Admin access granted.");
        showMessage("Welcome, Admin!");
        document.body.classList.add("admin-mode");

        // load dashboard 
        await Promise.all([loadEmployees(), loadAppointments()]);

    } catch (error) {
        console.error("Unexpected error during admin verification:", error);
        showMessage("Unexpected error. Please try again.", true);
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
    }
}

// LOAD EMPLOYEES
async function loadEmployees() {
    // implementation for loading employees into the dashboard
    console.log("Loading employees...");
    
    const { data: employees, error } = await supabase
        .from("employees")
        .select("name, email, role")
        .order("name", { ascending: true });
    
    if (error) {
        console.error("Error fetching employees:", error);
        showMessage("Failed to load employee data.", true);
        return;
    }

    console.log(employees);

    // pupulate employee table
    const container = document.getElementById("employee-container");
    if (!container) return;

    container.innerHTML = employees
        .map(
            (employee) => `
                <div class="employee-card">
                    <h3>${employee.name}</h3>
                    <p>${employee.email}</p>
                    <p><strong>${employee.role}</strong></p>
                </div>`
            )
            .join("");
}

// LOAD APPOINTMENTS
async function loadAppointments() {
    // implementation for loading appointments into the dashboard
    console.log("Loading appointments...");

    const { data: appointments, error } = await supabase
        .from("appointments")
        .select("id, name, email, date, time, status")
        .order("time", { ascending: true });

    if (error) {
        console.error("Error loading appointments:", error);
        showMessage("Failed to load appointments.", true);
        return;
    }

    console.log(appointments);

    // populate appointment table
    const container = document.getElementById("appointment-container");
    if (!container) return;

    if (!appointments || appointments.length === 0) {
        container.innerHTML = `<tr><td colspan="5">No appointments found.</td></tr>`;
        return;
    }

    container.innerHTML = appointments
        .map(
            (appointment) => `
                <tr>
                    <td>${appointment.name}</td>
                    <td>${appointment.email}</td>
                    <td>${appointment.date}</td>
                    <td>${appointment.time}</td>
                    <td>${appointment.status}</td>
                </tr>
            `
        )
        .join("");
}

//DOM
document.addEventListener("DOMContentLoaded", async () => {
    await verifyAdminAccess();
});