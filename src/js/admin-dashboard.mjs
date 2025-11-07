import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";

console.log("✅ admin-dashboard.mjs loaded");



// PREVENT UNAUTHORIZED ACCESS TO ADMIN DASHBOARD
async function verifyAdminAccess() {

    try {
        const { data, error: userError } = await supabase.auth.getUser();
        const user = data?.user;

        if (userError || !user) {
            // not logged in
            window.location.href = "admin.html";
            return;
        }

        // check if user is admin
        const { data: employee, error: roleError } = await supabase 
            .from("employees")
            .select("role")
            .eq("user_id", data.user.id)
            .single();

        if (roleError || employee?.role !== "admin") {
            showMessage("Access denied: Admins only.", true);
            setTimeout(() => {
                window.location.href = "admin.html";
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
    const container = document.getElementById("employees-list-container");
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
        .select("id, name, date, time, phone, email, label, scheduler_id")
        .order("date", { ascending: true })
        .order("time", { ascending: true });

    if (error) {
        console.error("Error loading appointments:", error);
        showMessage("Failed to load appointments.", true);
        return;
    }

    console.log(appointments);

    // populate appointment table
    const table = document.getElementById("appointments-table");
    if (!table) return;

    let tbody = table.querySelector("tbody");
    if (!tbody) {
        tbody = document.createElement("tbody");
        table.appendChild(tbody);
    }

    if (!appointments || appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5">No appointments found.</td></tr>`;
        return;
    }

    tbody.innerHTML = appointments
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

async function handleCreateAppt(event) {
    event.preventDefault();

    const form = event.target;
    const date = form.querySelector('input[name="date"]').value;
    const time = form.querySelector('input[name="time"]').value;

    if (!date || !time) {
        showMessage("Please fill out all fields.", true);
        return;
    }

    const { error } = await supabase
        .from("appointments")
        .insert([{ date, time, status: "available"}]);

    if (error) {
        showMessage("Failed to create an appointment.", true);
        console.error("Failed to create appointment:", error);
        return;
    }

    showMessage("Appointment created successfully.");
    console.log("Appointment created:", { date, time });
    form.reset();
    await loadAppointments();
}

// admin logout handler
async function adminLogout() {
    await supabase.auth.signOut();
    window.location.href = "admin.html";
}

// TOGGLE FORM VISIBILITY
function toggleFormVisibility() {
    const addEmployee = document.getElementById("add-employee-button");
    const addEmployeeForm = document.getElementById("add-employee");
    const cancelAddEmployee = document.getElementById("cancel-add");

    addEmployee?.addEventListener("click", () => {
        addEmployeeForm.classList.toggle("hidden");
    });

    cancelAddEmployee?.addEventListener("click", () => {
        addEmployeeForm.classList.add("hidden");
        addEmployeeForm.reset();
    });
}

// add employee form submission
const addEmployeeForm = document.getElementById("add-employee");
async function handleAddEmployee(event) {
    event.preventDefault();

    const name = addEmployeeForm.querySelector('input[name="name"]').value.trim();
    const email = addEmployeeForm.querySelector('input[name="email"]').value.trim();
    const phone = addEmployeeForm.querySelector('input[name="phone"]').value.trim();
    const role = addEmployeeForm.querySelector('input[name="role"]').value.trim();

    if (!name || !email || !role) {
        showMessage("Please fill out Name, email, phone number and position or role of new employee.", true);
        return;
    }
    
    try {
        console.log("Creating supabase auth user...");
        console.log("➡️ handleAddEmployee triggered");

        // create supabase auth user (send confirmation email automatically)
        const { data: user, error: signUpError } = await supabase.auth.signUp({
            email, 
            password: crypto.randomUUID(), // temporary random password
            options: {
                emailRedirectTo: null,
            },
        });

        console.log("Signup response:", user);

        if (signUpError) {
            console.error("Error creating auth user:", signUpError);
            showMessage(`Failed to create employee login: ${signUpError.message}`, true);
            return;
        }

        // wait briefly to ensure supabase has processed new user
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const userId = user?.user?.id;
        if (!userId) {
            showMessage("Signup successful but no user ID returned.", true);
            return;
        }

        console.log("adding employee record for:", userId);

        // send phpMailer email to new employee
        const mailResponse = await fetch("https://rsceb.org/sendmail_scheduler.php", {
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "signup",
                email, 
                name,
                link: "https://chelsea-saunders.github.io/scheduler/update-password.html", 
            }),
        });

        if (!mailResponse.ok) {
            console.error("Mailer network eror:", mailResponse.status, mailResponse.statusText);
            showMessage("Employee created, but notification email failed to send. Please contact support.", true);
        } else {
            const mailData = await mailResponse.json().catch(() => ({}));
            console.log("Mailer response:", mailData);
        }

            // .then((response) => response.json())
            // .then((data) => console.log("Mailer response:", data))
            // .catch((error) => console.error("Mailer error:", error));

        // add employee info to table
        const { error: insertError } = await supabase.from("employees").insert([
            {
                user_id: userId, 
                name, 
                email, 
                phone, 
                role,
            }
        ]);

        if (insertError) {
            console.error("Error inserting employee record:", insertError);
            showMessage(`Failed to add employee record to database: ${insertError.message}`, true);
            return;
        }

        showMessage(`Employee ${name} added. Please have them check their inbox for login setup email ${email}.`);
        await loadEmployees();

        console.log("Signup response:", user);
        if (signUpError) console.log("SignupError:", signUpError);


        addEmployeeForm.reset();
        addEmployeeForm.classList.add("hidden");

    } catch (error) {
        console.error("Error adding employee:", error);
        showMessage("Failed to add employee:", true);
    }
}
// ADD NEW EMPLOYEE BUTTON TO SHOW FORM TOGGLE
function togleAddEmployeeButton() {
    const showFormButton = document.getElementById("show-add-employee-form");
    const addEmployeeForm = document.getElementById("add-employee");
    const cancelButton = document.getElementById("cancel-add");

    // show form when add employee button is clicked
    showFormButton?.addEventListener("click", () => {
        addEmployeeForm.classList.remove("hidden");
        showFormButton.classList.add("hidden");
    });

    // hide form when cancel button is clicked
    cancelButton?.addEventListener("click", () => {
        addEmployeeForm.classList.add("hidden");
        showFormButton.classList.remove("hidden");
        addEmployeeForm.reset();
    });
}

async function waitForElement(selector, timeout = 5000) {
    const start = Date.now();
    while(!document.querySelector(selector)) {
        if (Date.now() - start > timeout) {
            throw new Error(`Element ${selector} not found within ${timeout}ms`);
        }
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return document.querySelector(selector);
}

//DOM
document.addEventListener("DOMContentLoaded", async () => {
    console.log("✅ DOM fully loaded");
    const addEmployeeForm = await waitForElement("#add-employee");
    console.log("🧾 Found addEmployeeForm:", addEmployeeForm);
    addEmployeeForm?.addEventListener("submit", handleAddEmployee);

    await verifyAdminAccess();

    const form = document.getElementById("create-appt-form");
    if (form) {
        form.addEventListener("submit", handleCreateAppt);
    }

    const logout = document.getElementById("admin-logout");
    if (logout) {
        logout.addEventListener("click", adminLogout);
    }

    toggleFormVisibility();
    togleAddEmployeeButton();

    // auto refresh appts every 60 seconds
    setInterval(loadAppointments, 60000);
});