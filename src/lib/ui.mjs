import { supabase } from "./supabase.mjs";

let messageTimeout;

export function showMessage(message, isError = false) {
    const box = document.getElementById("status-message");
    if (!box) return;
    
    // clear ongoing hide timers
    clearTimeout(messageTimeout);

    // reset message & classes
    box.textContent = message;
    box.classList.remove("hidden", "error", "show");

    // apply error class if needed
    if (isError) box.classList.add("error");
    box.classList.add("show");

    // accessibility: allow screen readers to announce
    box.setAttribute("tabindex", "-1");
    box.focus();

    // auto hide after 3 seconds
    messageTimeout = setTimeout(() => {
        box.classList.remove("show");
        setTimeout(() => box.classList.add("hidden"), 400);
    }, 3000);
}
export async function handleLogin(event, redirectMap) {
    event.preventDefault();

    const email = event.target.querySelector('input[name="email"]').value.trim();
    const password = event.target.querySelector('input[name="password"]').value.trim();

    if (!email || !password) {
        showMessage("Please enter both email and password.", true);
        return;
    }

    // supabase login
    const { data, error } = await supabase.auth.signInWithPassword({ email, pasword });

    if (error) {
        showMessage(`Login failed: ${error.message}`, true);
        console.error(error);
        return;
    }

    const user = data.user;
    console.log("Logged in:", user.email);

    // fetch role from employee table
    const { data: employee, error: roleError } = await supabase
        .from("employees")
        .select("role")
        .eq("id", user.id)
        .single();

        if (rollError) {
            showMessage("Could not verify user role.", true);
            console.error(roleError);
            return;
        }

        const role = employee?.role || "user";
        console.log("Role:", role);

        // redirect based on role
        if (role === "admin" && redirectMap.admin) {
            window.location.assign(redirectMap.admin);
        } else if (role === "employee" && redirectMap.employee) {
            window.location.href = redirectMap.employee;
        } else if (redirectMap.default) {
            window.location.href = redirectMap.default;
        } else {
            showMessage("No matching role redirect found.", true);
        }
}