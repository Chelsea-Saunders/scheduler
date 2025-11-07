import { supabase } from '../lib/supabase.mjs';
import { showMessage } from '../lib/ui.mjs';
import { setupCreateAccountForm } from './auth.mjs';
import { applyPhoneFormatterToAll } from './form-utilities.mjs';

console.log("[TRACE] script loaded:", window.location.pathname);

// skip supabase user login on employee-only pages
const path = window.location.pathname;

if (path.includes("employee.html") || path.includes("calendar.html")) {
    console.log("Skipping supabase redirect check on employee login pages");
} else {
    document.addEventListener("DOMContentLoaded", () => {
        console.log("DOM fully loaded, running initializePage...");
        initializePage();

        const loginForm = document.getElementById("login-form");
        const createForm = document.getElementById("create-acct-form");

        if (createForm && !createForm._listenerBound) {
            console.warn("Manually binding setupCreateAccountForm fallback...");
            setupCreateAccountForm(createForm, loginForm);
            createForm._listenerBound = true; // prevent multiple bindings
        }
    });
}

function togglePasswordVisibility(button) {
    const input = button.previousElementSibling;
    const isPassword = input.type === "password";
    const eye = button.querySelector(".icon-eye");
    const eyeHidden = button.querySelector(".icon-eye-hidden");

    input.type = isPassword ? "text" : "password";
    if (eye && eyeHidden) {
        eye.hidden = isPassword;
        eyeHidden.hidden = !isPassword;
    }

    button.setAttribute(
        "aria-label", 
        isPassword ? "Hide password" : "Show password"
    );
}
function showCreateAccount(loginForm, createForm) {
    console.log("showCreateAccount() called");
    loginForm.classList.add("hidden");
    createForm.classList.remove("hidden");
}
function showLogin(createForm, loginForm) {
    createForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
}
function showResetPassword(loginForm, createForm, resetForm) {
    // hide login and create forms
    loginForm.classList.add("hidden");
    createForm.classList.add("hidden");
    // show reset form
    resetForm.classList.remove("hidden");
}
function backToLogin(resetForm, loginForm) {
    // hide reset form
    resetForm.classList.add("hidden");
    // show login form
    loginForm.classList.remove("hidden");
}
//  **** Message and loading ****
function setMessage(messageDiv, text = "", isError = false) {
    if (!messageDiv) return;
    messageDiv.textContent = text;
    messageDiv.classList.toggle("error", !!isError);
}
function setLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.setAttribute("aria-busy", isLoading ? "true" : "false");
}
// ****Resend confirmation email ****
async function resendConfirmationEmail(createForm, resendButton) {
    const email = createForm.querySelector('input[name="email"]')?.value.trim();
    if (!email) {
        showMessage("Please enter your email first.");
        return;
    }

    try {
        const { error } = await supabase.auth.resend({ 
            type: "signup", 
            email,
            options: {
                emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/index.html",
            },
        });

        if (error) {
            console.error("resend failed:", error);
            showMessage("Could not resend confirmation email. Try again later.", true);
            return;
        }

        showMessage("Confirmation email resent! Please check your inbox.");
        resendButton.disabled = true;
        resendButton.textContent = "Email Sent";
    } catch (error) {
        console.error("Unexpected resend error:", error);
        showMessage("Could not resend confirmation email. Try again later.", true);
    }
}
// ***** Login form submission *****
async function handleLogin(event, loginForm, loginButton) {
    event.preventDefault();

    const messageDiv = document.getElementById("status-message");

    setMessage(messageDiv);
    setLoading(loginButton, true);

    try {
        // get input values
        const email = loginForm.email?.value?.trim();
        const password = loginForm.password?.value ?? "";

        //validate presence of both email and password
        if (!email || !password) {
            setMessage("Please enter both email and password.", true);
            return;
        }

        // try signing in with supabase
        let data, error;
        try {
            ({ data, error } = await supabase.auth.signInWithPassword({
            email, 
            password, 
            options: {
                emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/index.html",
            },  
            }));
        } catch (networkError) {
            setMessage("A network error occurred during login. Please try again.", true);
            console.error("supabase connection failed:", networkError);
            return;
        }

        console.log("Supabase sign-in response:", data, error);

        // handle login errors
        if (error) {
            setMessage(error.message || "Login failed. Please try again.", true);
            loginForm.password.value = "";
            loginForm.password?.focus();
            return;
        }

        // ensure we actually have a user and session
        if (!data?.user || !data?.session) {
            setMessage("Login incomplete. Please try again.", true);
            return;
        }


        // grab the user
        const user = data.user;
        console.log("Logged in user ID:", user.id);

        // check user's role in employees table
        const { data: employee, error: roleError } = await supabase
            .from("employees")
            .select("role")
            .eq("user_id", user.id)
            .single();

        if (!employee) {
            setMessage("No employee record found. Access Denied.", true);
            console.warn("No employee found for user:", user.id);
            return;
        }

        if (roleError) {
            setMessage("Could not verify role. Please try again.", true);
            console.error("Role fetch error:", roleError);
            return;
        }

        // redirect based on role
        if (employee?.role === "admin") {
            console.log("Welcome, admin!");
            setMessage("Welcome, admin! Redirecting...");
            await supabase.auth.signOut();
            localStorage.setItem("sessionType");

            setTimeout(() => {
                console.log("redirecting to admin-dashboard...");
                // debugger;
                window.location.href = "admin-dashboard.html";
            }, 1500);
            // console.log("Would redirect to admin-dashboard.html here");
            // window.location.href = "admin-dashboard.html";
        } else {
            console.log("Logged in as an employee");
            setMessage("Logged in as an employee. Redirecting...");
            // console.log("would redirect to calendar.html here");
            // window.location.href = "calendar.html";
            localStorage.setItem("sessionType", "employee");
            
            setTimeout(() => {
                console.log("redirecting to calendar...");
                // debugger;
                window.location.href = "calendar.html";
            }, 1500);
        }

    } catch (error) {
        // handle unexpected errors
        setMessage("An unexpected error occurred. Please try again.", true);
        console.error(error);
    } finally {
        // always reset loading state
        setLoading(loginButton, false);
    }
}

function handleSupabaseRedirect() {
    // try to find login form dynamically
    const loginForm = document.getElementById("login-form");
    if (!loginForm) {
        console.warn("Login form not found; skipping password recovery UI setup.");
        return;
    }
    const tokenMatch = window.location.hash.match(/access_token=([^&]+)/);
    const accessToken = tokenMatch ? tokenMatch[1] : null;
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const type = hashParams.get("type");

    if (!accessToken) return;

    // clear hash from URL
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

        // handle password recovery
        if (type === "recovery") {
            showPasswordUpdateForm(loginForm);
        }
}
// show password update form
function showPasswordUpdateForm(loginForm) {
    const newPasswordForm = document.createElement("form");
    newPasswordForm.innerHTML = `
        <h2>Set New Password</h2>

            <label for="new-password">New Password:</label>
            <input type="password" id="new-password" name="new-password" required minlength="8" />

            <label for="confirm-password">Confirm Password:</label>
            <input type="password" id="confirm-password" name="confirm-password" required minlength="8" />
            
            <button type="submit">Update Password</button>
        `;

    const main = document.querySelector("main");
    main.innerHTML = "";
    main.appendChild(newPasswordForm);

    newPasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const newPassword = document.getElementById("new-password").value.trim();
        const confirmPassword = document.getElementById("confirm-password").value.trim();

        if (newPassword !== confirmPassword) {
            showMessage("Passwords do not match.", true);
            return;
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            showMessage("Could not update password. Please try again.", true);
            console.error(error);
        } else {
            showMessage("Password updated! Please login with your new password.");
            newPasswordForm.remove();
            loginForm.style.display = "block";
        }
    });
}

// CALL ALL FUNCTIONS HERE TO INITIALIZE LOGIN
async function initializePage() {
    const showCreateAccountButton = document.getElementById("show-create-account");
    const showLoginButton = document.getElementById("show-login");
    const forgotPasswordLink = document.getElementById("forgot-password");
    const backToLoginLink = document.getElementById("back-to-login");
    const resendButton = document.getElementById("resend-confirmation-email");

    const loginForm = document.getElementById("login-form");
    const createForm = document.getElementById("create-acct-form");
    const resetForm = document.getElementById("reset-form");
    const loginButton = loginForm?.querySelector('[type="submit"]');

    const isResetPage = window.location.pathname.includes("update-password.html");

    // determine the correct base path
    const isHosted = /github\.io$/i.test(window.location.hostname);
    const base = isHosted ? "/scheduler/" : "./";

    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            showMessage("Email verified! Please login to continue.");

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    const redirect = params.get("redirect") || `${base}scheduler.html`;
    const { data } = await supabase.auth.getUser();
    const user = data?.user;

    // only redirect away from login/signup pages if already logged in
    const isPageAuthenticated = 
        window.location.pathname.endsWith("index.html") || 
        window.location.pathname === "/scheduler/";

    console.log("createForm element:", createForm);
    console.log("setupCreateAccountForm value:", setupCreateAccountForm);

    // create account 
    if (createForm) {
        setupCreateAccountForm(createForm, loginForm);
    }

    // check if user is clicking on employee login link
    const isEmployeeLogin = window.location.pathname.includes("employee.html");

    // only redirect if not on employee login page
    const sessionType = localStorage.getItem("sessionType");

    if (
        user &&
        isPageAuthenticated && 
        !isEmployeeLogin &&
        !isResetPage
    ) {
        console.log("⚠️ [TRACE] Redirect triggered by", window.location.pathname);

        const sessionType = localStorage.getItem("sessionType");

        if (sessionType === "admin") {
            window.location.href = `${base}admin-dashboard.html`;
        } else if (sessionType === "employee") {
            window.location.href = `${base}calendar.html`;
        } else {
            window.location.href = `${base}scheduler.html`;
        }
    }

    // attach phone formatter
    applyPhoneFormatterToAll();

    // show login form
    showLoginButton?.addEventListener("click", (event) => {
        event.preventDefault();
        showLogin(createForm, loginForm);
    });

    console.log("Show create account button:", showCreateAccountButton);

    // show create account form
    showCreateAccountButton?.addEventListener("click", (event) => {
        event.preventDefault();
        showCreateAccount(loginForm, createForm);
    });

    // show forgot password form
    forgotPasswordLink?.addEventListener("click", (event) => {
        event.preventDefault();
        showResetPassword(loginForm, createForm, resetForm);
    });

    // back to login from reset form
    backToLoginLink?.addEventListener("click", (event) => {
        event.preventDefault();
        backToLogin(resetForm, loginForm);
    });

    // handle reset password form submission
    resetForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = resetForm.querySelector('input[name="email"]').value.trim();
        
        if (!email) {
            showMessage("Please enter your email address.", true);
            return;
        }

        // send reset password email through supabase
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin.includes("localhost")
                ? "http://localhost:5173/reset-password.html"
                : "https://chelsea-saunders.github.io/scheduler/update-password.html"
        });

        if (error) {
            showMessage(`Failed to send reset email: ${error.message}`, true);
            console.error("Password reset email error:", error);
            return;
        }

        showMessage("Reset email sent! Please check your inbox.");
        resetForm.reset();

        setTimeout(() => {
            resetForm.classList.add("hidden");
            loginForm.classList.remove("hidden");
        }, 1500);
    });

    // resend password confirmation email
    resendButton?.addEventListener("click", async (event) => {
        event.preventDefault();
        resendConfirmationEmail(createForm, resendButton);
    });

    // login form submission
    loginForm?.addEventListener("submit", (event) => 
        handleLogin(event, loginForm, loginButton, redirect)
    );

        // show/hide password
    document.querySelectorAll(".show-password").forEach((button) => {
        button.addEventListener("click", () => 
            togglePasswordVisibility(button)
        );
    }); 

    // handle supabase redirect 
    handleSupabaseRedirect();

    // // auto-redirect logged-in users to scheduler
    // supabase.auth.onAuthStateChange((event, session) => {
    //     const base = window.location.hostname.includes("github.io") ? "/scheduler/" : "./";
        
    //     // only redirect if a signin just happened
    //     if (event !== "SIGNED_IN") return;

    //     const sessionType = localStorage.getItem("sessionType");
    //     const path = window.location.pathname;

    //     // never redirect when already on admin or employee pages
    //     if (
    //         path.includes("admin.html") ||
    //         path.includes("admin-dashboard.html") ||
    //         path.includes("employee.html")
    //     ) {
    //         console.log("[TRACE] Skipping redirect on admin/employee pages");
    //         return;
    //     }

    //     // route by session type
    //     if (sessionType === "admin") {
    //         console.log("[TRACE] Admin session -> admin-dashboard.html");
    //         window.location.href = `${base}admin-dashboard.html`;
    //         return;
    //     }
    //     if (sessionType === "employee") {
    //         console.log("[TRACE] Employee session -> calendar.html");
    //         window.location.href = `${base}calendar.html`;
    //         return;
    //     }
    //     // default user
    //     console.log("[TRACE] Default login session -> scheduler.html");
    //     window.location.href = `${base}scheduler.html`;
    // });
}