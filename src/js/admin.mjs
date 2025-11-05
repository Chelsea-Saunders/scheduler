import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";
import { validateEmail, applyPhoneFormatterToAll, validatePhone, validatePassword } from "./form-utilities.mjs";
import { handleLogin } from "./auth.mjs";

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
    
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const name = form.querySelector('input[name="name"]').value.trim();
            const email = document.getElementById("login-email").value.trim();
            const password = form.querySelector('input[name="password"]').value.trim()
            const phone = form.querySelector('input[name="phone"]').value.trim();

            // validate email
            const emailCheck = validateEmail(email);
            if (!emailCheck.valid) {
                showMessage(`Email error: ${emailCheck.message}`, true);
                return;
            }
            // validate phone
            const phoneCheck = validatePhone(phone);
            if (!phoneCheck.valid) {
                showMessage(`Phone error: ${phoneCheck.message}`, true);
                return;
            }

            // validate password
            const checkPassword = validatePassword(password);
            if (!checkPassword.valid) {
                showMessage(`Password error: ${checkPassword.message}`, true);
                return;
            }

            // passed validation: proceed with login to insert into supabase
            try {
                const { data, error } = await supabase
                    .from("employees")
                    .insert([{ name, email}]);

                if (error) {
                    console.error("Insert error:", error);
                    showMessage("Could not add employee. Try again later.", true);
                } else {
                    showMessage(`Employee: ${name} added successfully!`, false);
                    form.reset();
                }
            }catch (error) {
                console.error("Network or fetch error:", error);
                showMessage("Network error. Please try again later.", true);
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    applyPhoneFormatterToAll();
    togglePasswordVisible();
    submitButton();
    handleLogin(event, {
        default: "scheduler.html",
    });
});