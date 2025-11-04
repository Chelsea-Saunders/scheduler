import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";

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
    const form = document.getElementById("admin-login-form");
    
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value.trim();

        if (!email || !password) {
            showMessage("Please enter both email and password.");
            console.warn("Email or password missing");
            return;
        }
        // supabase login check
        const { data, error } = await supabase.auth.signInWithPassword({
            email, 
            password,
            options: {
                emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/admin.html",
            }
        });
        if (error) {
            console.error("Login error:", error);
            showMessage("Login failed", true);
            return;
        } else if (data?.user) {
            showMessage("Login successful! Redirecting...", false);
            setTimeout(() => {
                window.location.assign("admin-dashboard.html");
            }, 1000);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    togglePasswordVisible();
    submitButton();
});