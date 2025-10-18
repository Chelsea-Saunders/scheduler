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

        // detect current path for redirect email
        let redirectTo;
        const host = window.location.origin;

        if (host.includes("localhost")) {
            redirectTo = "http://localhost:5173/update-password.html";
        } else {
            redirectTo = "https://chelsea-saunders.github.io/scheduler/update-password.html";
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {redirectTo });

        if (error) {
            console.error(error);
            showSubmissionMessage("⚠️ Could not send reset email. Please try again.");
        } else {
            showSubmissionMessage("✅ Check your email for reset instructions.");
        }
    });
});