
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
})