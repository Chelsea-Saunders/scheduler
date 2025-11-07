import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";
import { validateEmail, validatePassword } from "./form-utilities.mjs";

// TOGGLE PASSWORD VISIBILITY
function togglePasswordVisible() {
    const passwordInput = document.getElementById("login-password");
    const toggleButton = document.querySelector(".show-password");
    if (!passwordInput || !toggleButton) return;

    const eyeOpen = toggleButton.querySelector(".icon-eye");
    const eyeClosed = toggleButton.querySelector(".icon-eye-hidden");

    toggleButton.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";

        // toggle input type
        passwordInput.type = isPassword ? "text" : "password";

        // toggle icons
        eyeOpen.style.display = isPassword ? "none" : "inline";
        eyeClosed.style.display = isPassword ? "inline" : "none";

        //update aria-label
        toggleButton.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    });
}

// SUBMIT LOGIN LISTENER
async function submitButton () {
    console.log("Looking for admin login form...");
    const form = document.getElementById("admin-login-form");
    console.log("Found admin login form?", form);
    
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            console.log("form submitted");

            const email = document.getElementById("login-email").value.trim();
            const password = form.querySelector('input[name="password"]').value.trim();

            // validate email
            const emailCheck = validateEmail(email);
            console.log("Email validation:", emailCheck);
            if (!emailCheck.valid) {
                showMessage(`Email error: ${emailCheck.message}`, true);
                return;
            }

            // validate password
            const checkPassword = validatePassword(password);
            console.log("Password validation:", checkPassword);
            if (!checkPassword.valid) {
                showMessage(`Password error: ${checkPassword.message}`, true);
                return;
            }

            // proceed with supabase login
            try {
                console.log("Attempting admin login ...");
                const { data, error } = await supabase.auth.signInWithPassword({
                    email, 
                    password,
                });
                console.log("sign in response:", data, error);

                if (error) {
                    console.error("Login error:", error);
                    showMessage(`Login failed: ${error.message}`, true);
                    return;
                }

                console.log("User ID from auth:", data.user.id);

                // if data.user is missing...throw error
                if (!data.user) {
                    showMessage("Unexpected login response: Please try again.", true);
                    return;
                }

                // after successful login: double check 
                const { data: employee, error: roleError } = await supabase
                    .from("employees")
                    .select("role", { head: false })
                    .eq("user_id", data.user.id)
                    .maybeSingle();

                console.log("Employee roll fetch:", employee, "Error:", roleError);

                if (roleError || employee?.role !== "admin") {
                    showMessage("Access denied: Admins only.", true);
                    await supabase.auth.signOut();
                    return;
                }

                console.log("Admin verified:", employee.role);
                showMessage("Login successful! Redirecting...");

                localStorage.setItem("sessionType", "admin");

                console.log("Reached redirect step - about to navigate...");
                // window.location.href = "admin-dashboard.html";
                setTimeout(() => {
                    window.location.href = "admin-dashboard.html";
                }, 1500);

            }catch (error) {
                console.error("Unexpected error:", error);
                showMessage("Unexpected error during login.", true);
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    togglePasswordVisible();
    submitButton();
});