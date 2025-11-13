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
            console.log("Submitting signup to supabase:", email);

            const { data, error } = await supabase.auth.signUp({
                email, 
                password, 
                options: {
                    emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/",
                },
            });

            console.log("Supabase respoonse:", data, error);

            if (error) {
                console.error("Sign up error:", error);
                showSubmissionMessage("Signup failed: " + error.message, true);
                return;
            } 

            // successful signup
            createForm.reset();
            showSubmissionMessage(
                "Account created! Please check your email to confirm your account.", 
                false
            );
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
    // create acct
    const showCreateLink = document.getElementById("show-create-account");
    const showLoginLink = document.getElementById("show-login");
    const forgotPasswordLink = document.getElementById("forgot-password");
    const backToLoginLink = document.getElementById("back-to-login");

    // setup forms
    if (loginForm) setupLoginForm(loginForm);
    if (createForm) setupCreateAccountForm(createForm);
    if (resetForm) setupResetForm(resetForm);

    // show "create acct"
    showCreateLink?.addEventListener("click", (event) => {
        event.preventDefault();
        loginForm?.classList.add("hidden");
        createForm?.classList.remove("hidden");
        resetForm?.classList.add("hidden");
    });

    // show "login"
    showLoginLink?.addEventListener("click", (event) => {
        event.preventDefault();
        createForm?.classList.add("hidden");
        loginForm?.classList.remove("hidden");
        resetForm?.classList.add("hidden");
    });

    // show "reset password"
    forgotPasswordLink?.addEventListener("click", (event) => {
        event.preventDefault();
        loginForm?.classList.add("hidden");
        resetForm?.classList.remove("hidden");
        createForm?.classList.add("hidden");
    });

    // back to login from reset
    backToLoginLink?.addEventListener("click", (event) => {
        event.preventDefault();
        resetForm?.classList.add("hidden");
        loginForm?.classList.remove("hidden");
    });
});