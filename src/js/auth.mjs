import { validateForm, showSubmissionMessage } from "./form-utilities.mjs";
import { supabase } from "../lib/supabase.mjs";

// await supabase.auth.resetPasswordForEmail(email);
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const createForm = document.getElementById("create-acct-form");
    const resetForm = document.getElementById("reset-form");

    // LOGIN submit
    loginForm?.addEventListener("submit", (event) => {
        if (!validateForm(loginForm)) {
            event.preventDefault();
            showSubmissionMessage("Please correct the highlighted fields.");
        }
    });

    // CREATE ACCOUNT submit
    createForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!validateForm(createForm)) {
            event.preventDefault();
            showSubmissionMessage("Please correct the highlighted fields.");
        }
    });

    // RESET PASSWORD submit
    resetForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateForm(resetForm)) {
            showSubmissionMessage("Please correct the highlighted fields.");
            return;
        }

        const email = resetForm.querySelector('input[name="email"]').value.trim();
        if (!email) {
            showSubmissionMessage("Please enter a valid email address.");
            return;
        }

        // get a reference to button
        const resetButton = resetForm.querySelector("button[type='submit']");
        
        try {
            // disable and update text while sending
            resetButton.disabled = true;
            resetButton.textContent = "Sending...";

            const res = await fetch("https://rsceb.org/backend/sendmail_scheduler.php", {
                method: "POST", 
                headers: { "Content-Type": "application/x-www-form-urlencoded" }, 
                body: new URLSearchParams({
                    type: "recovery", 
                    email: email
                })
            });

            const resultText = await res.text();
            console.log("Raw response text:", resultText);

            let result = {};
            try {
                result = JSON.parse(resultText);
            } catch {
                console.warn("Non-JSON response (using fallback)");
            }

            if (result.ok) {
                showSubmissionMessage("Check your email for reset instructions.");
            } else if (result.error) {
                console.error("Server error:", result.error);
                showSubmissionMessage("WARNING: " + result.error, true);
            } else {
                showSubmissionMessage("Request sent! Please check your email.", false);
            }
        } catch (error) {
            console.error("Network or fetch error", error);
            showSubmissionMessage("Network error:  please try again later.", true);
        } finally {
            // re-enable button and restore text
            resetButton.disabled = false;
            resetButton.textContent = "Send Reset Link";
        }
    });
});