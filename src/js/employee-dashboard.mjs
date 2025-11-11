import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";
import { initScheduler } from "./lib/scheduler-view.mjs";

// ensure user is logged in and load scheduler
async function verifyEmployeeAccess() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            showMessage("Please sign in to access this page.", true);
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
            return null;
        }

        // check role in employee table
        const { data: employee, error: roleError } = await supabase
            .from("employees")
            .select("role, name")
            .eq("user_id", user.id)
            .single();

        if (roleError || !employee) {
            showMessage("Access denied. Employees record not found.", true);
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
            return null;
        }

        if (employee.role !== "employee" && employee.role !== "admin") {
            showMessage("Access denied. Employees only.", true);
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
            return null;
        }

        // greeting
        const heading = document.querySelector("h1");
        if (heading) {
            heading.textContent = `Welcome, ${employee.name || "Team Member"}!`;
        }
        return { user, role: employee.role };
    } catch (error) {
        console.error("Error verifying employee access:", error);
        showMessage("An error occurred. Please try again.", true);
        return null;
    }
}

// LOGOUT BUTTON
function setupLogout() {
    const logout = document.getElementById("admin-logout");
    if (!logout) return;

    logout.addEventListener("click", async () => {
        const { error } = await supabase.auth.signOut();
        if (error ) {
            console.error("Logout error:", error);
            showMessage("Logout failed. Please try again.", true);
        } else {
            showMessage("Logging out...");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
        }
    });
}

// MAIN
document.addEventListener("DOMContentLoaded", async () => {
    const session = await verifyEmployeeAccess();
    if (!session) return;

    // initialize scheduler with employee role
    await initScheduler({ role: session.role });

    // setup logout 
    setupLogout();
});