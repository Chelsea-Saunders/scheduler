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
        const resetButton = resetForm.querySelector("button[type='submit']");

        if (!email) {
            showSubmissionMessage("Please enter a valid email address.");
            return;
        }

        resetButton.disabled = true;
        resetButton.textContent = "Sending...";
        
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: "https://chelsea-saunders.github.io/scheduler/update-password.html"
            });

            if (error) {
                console.error("Password reset error:", error);

                // handle rate limit
                if (error.message?.toLowerCase().includes("rate limit")) {
                    showSubmissionMessage("Too many requests. Please wait before trying again.", true);
                } else {
                    showSubmissionMessage("Password reset failed: " + error.message, true);
                }
                
                resetButton.textContent = "Send Reset Link";
                resetButton.disabled = false;
                return;
            }

            showSubmissionMessage("Password reset link sent to youre email. Check your inbox.");
            resetButton.textContent = "Check your inbox";
            setTimeout(() => {
                resetButton.textContent = "Send Reset Link";
                resetButton.disabled = false;
            }, 2000);
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