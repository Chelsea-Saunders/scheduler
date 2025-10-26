import { validateForm, showSubmissionMessage } from "./form-utilities.mjs";
import { supabase } from "../lib/supabase.mjs";

function setupLoginForm(loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateForm(loginForm)) {
            event.preventDefault();
            showSubmissionMessage("Please correct the highlighted fields.");
        }

        const email = loginForm.querySelector('input[name="email"]').value.trim();
        const password = loginForm.querySelector('input[name="password"]').value.trim();

        if (!email || !password) {
            showSubmissionMessage("Please enter both email and password.");
            return;
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email, 
                password, 
                options: {
                    emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/index.html",
                },
            });

            if (error) {
                console.error("Login error:", error);
                showSubmissionMessage("Login failed: " + error.message, true);
                return;
            }

            if (data?.user) {
                showSubmissionMessage("Login successful! Redirecting...");
                window.location.href = "scheduler.html";
            }
        } catch (error) {
            console.error("Unexpected login error:", error);
            showSubmissionMessage("Something went wrong. Please try again later.", true);
        }
    });
}
function setupCreateAccountForm(createForm) {
    createForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!validateForm(createForm)) {
            showSubmissionMessage("Please correct the highlighted fields.");
            return;
        }

        const email = createForm.querySelector('input[name="email"]').value.trim();
        const password = createForm.querySelector('input[name="password"]').value.trim();

        if (!email || !password) {
            showSubmissionMessage("Please enter both email and password.");
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email, 
                password, 
                options: {
                    emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/index.html",
                },
            });

            if (error) {
                console.error("Sign up error:", error);
                showSubmissionMessage("Signup failed: " + error.message, true);
            } else {
                showSubmissionMessage("Signup successful! Check your inbox for confirmation link.");
                createForm.reset();
            }
        } catch (error) {
            console.error("Unexpected signup error:", error);
            showSubmissionMessage("Something went wrong. Please try again later.", true);
        }
    });
}
function setupResetForm(resetForm) {
    resetForm.addEventListener("submit", async (event) => {
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

            const res = await fetch("https://rsceb.org/sendmail_scheduler.php", {
                method: "POST", 
                headers: { "Content-Type": "application/x-www-form-urlencoded" }, 
                body: new URLSearchParams({
                    type: "recovery", 
                    email: email
                })
            });

            const resultText = await res.text();

            let result = {};
            try {
                result = JSON.parse(resultText);
            } catch {
                console.warn("Non-JSON response (using fallback)");
            }

            // success
            if (result.ok) {
                showSubmissionMessage("Reset link sent! Check your inbox.");
                // reset the form
                resetForm.reset();
                //show confirmation message
                resetButton.textContent = "Check your inbox!";
                setTimeout(() => {
                    resetButton.textContent = "Send Reset Link";
                    resetButton.disabled = false;
                }, 2000);
                return;
            } 
            // server side error
            if (result.error) {
                console.error("Server error:", result.error);
                showSubmissionMessage("WARNING: " + result.error, true);
                resetButton.textContent = "Error";
                setTimeout(() => {
                    resetButton.textContent = "Server Error";
                    resetButton.disabled = false;
                }, 2000);
                return;
            } 
            // generic failure
            showSubmissionMessage("Request sent! Please check your email.", false);
            resetButton.textContent = "Send Reset Link";
            resetButton.disabled = false;

        } catch (error) {
            console.error("Network or fetch error", error);
            showSubmissionMessage("Network error:  please try again later.", true);
            // re-enable button and restore text
            resetButton.textContent = "Send Reset Link";
            resetButton.disabled = false;
        } 
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const createForm = document.getElementById("create-acct-form");
    const resetForm = document.getElementById("reset-form");

    if (loginForm) setupLoginForm(loginForm);
    if (createForm) setupCreateAccountForm(createForm);
    if (resetForm) setupResetForm(resetForm);
});