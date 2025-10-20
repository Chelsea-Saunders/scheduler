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

        try {
            // use PHP mailer on server
            const res = await fetch("https://rsceb.org/backend/sendmail_scheduler.php", {
                method: "POST", 
                headers: { 
                    "Content-Type": "application/x-www-form-urlencoded" 
                }, 
                body: new URLSearchParams({
                    type: "recovery", 
                    email: email
                })
            });

            const result = await res.json();

            if (result.ok) {
                showSubmissionMessage("Check your email for reset instructions.");
            } else {
                console.error(result.error);
                showSubmissionMessage("Could not send reset password email. Please try again.");
            }
        } catch (error) {
            console.error("Error sending reset password email", error);
            showSubmissionMessage("Something went wrong. Please try again later.");
        }
    });
});