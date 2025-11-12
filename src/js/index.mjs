import { supabase } from '../lib/supabase.mjs';
import { showMessage } from '../lib/ui.mjs';

// guard against redirect spam
window._isRedirectingToLogin = window._isRedirectingToLogin || false;
// const loginForm = document.getElementById("login-form");

function togglePasswordVisibility(button) {
    const input = button.previousElementSibling;
    const isPassword = input.type === "password";
    const eye = button.querySelector(".icon-eye");
    const eyeHidden = button.querySelector(".icon-eye-hidden");

    input.type = isPassword ? "text" : "password";
    eye.style.display = isPassword ? "none" : "inline";
    eyeHidden.style.display = isPassword ? "inline" : "none";

    button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
}
function showCreateAccount(loginForm, createForm) {
    loginForm.style.display = "none";
    createForm.style.display = "block";
}
function showLogin(createForm, loginForm) {
    createForm.style.display = "none";
    loginForm.style.display = "block";
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
async function handleLogin(event, loginForm, loginButton,  redirect) {
    event.preventDefault();

    const messageDiv = document.getElementById("status-message");

    setMessage(messageDiv);
    setLoading(loginButton, true);

    try {
        const email = loginForm.email?.value?.trim();
        const password = loginForm.password?.value ?? "";

        if (!email || !password) {
            setMessage(messageDiv, "Please enter both email and password.", true);
            return;
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email, 
            password, 
            options: {
                emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/index.html", 
            },
        });

        if (error) {
            setMessage(messageDiv, error.message || "Login failed. Please try again.", true);
            loginForm.password.value = "";
            loginForm.password?.focus();
            return;
        }

        if (!data?.user || !data?.session) {
            setMessage(messageDiv, "Login incomplete. Please try again.", true);
            return;
        }

        window.location.assign(redirect);
    } catch (error) {
        setMessage(messageDiv, "An unexpected error occurred. Please try again.", true);
        console.error(error);
    } finally {
        setLoading(loginButton, false);
    }
}
// ***** Create account submission *****
async function handleCreateAccount(event, createForm, loginForm) {
    event.preventDefault();
    const fullName = createForm.querySelector('input[name="name"]').value.trim();
    const email = createForm.querySelector('input[name="email"]').value.trim();
    const password = createForm.querySelector('input[name="password"]').value.trim();

    if (!fullName || !email || !password) {
        showMessage("Please enter your name, email, and password.", true);
        return;
    }

    try {
        // ensure old sessions are cleared out before signup
        await supabase.auth.nOut();
        
        localStorage.setItem("fullName", fullName);

        const res = await fetch("https://rsceb.org/sendmail_scheduler.php", {
            method: "POST", 
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                type: "signup", 
                name: fullName, 
                email, 
                password,
            }),
        });

        // check for http errors
        if (!res.ok) {
            console.error("Server returned HTTP error:", res.status, res.statusText);
            showMessage("Server error: Please try again later.", true);
            return;
        }

        // parse JSON safely
        let result;
        try {
            result = await res.json();
        } catch {
            showMessage("Server returned an unexpected response. Please try again.", true);
            console.error("Invalid JSON response from server");
            return;
        }

        // add rate limit/supabase error message handling
        if (result?.error && result.error.toLowerCase().includes("rate limit")) {
            showMessage(
                "You've requested too many confirmation emails. Please wait a few minutes before trying again.", 
                true
            );
            console.warn("Rate limit triggered:", result.error);
            return;
        }

        if (result.ok) {
            showMessage(`Welcome aboard, ${fullName}! Please check your inbox to confirm your account.`);
            createForm.classList.add("hidden");
            loginForm?.classList.remove("hidden");
        } else if (result.error){
            console.error(result.error);
            showMessage("Signup failed: " + result.error, true);
        } else {
            showMessage("Request completed, but server returned no result. Please check your email.", false);
        }
    } catch (error) {
        console.error("Unexpected network or fetch error:", error);
        showMessage("Network error: Please try again.", true);
    }
}
function handleSupabaseRedirect() {
    const tokenMatch = window.location.hash.match(/access_token=([^&]+)/);
    const accessToken = tokenMatch ? tokenMatch[1] : null;
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const type = hashParams.get("type");

    if (!accessToken) return;

    // clear hash from URL
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

        // handle password recovery
        if (accessToken && type === "recovery") {
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

document.addEventListener("DOMContentLoaded", async () => {
    const showCreateAccountButton = document.getElementById("show-create-account");
    const showLoginButton = document.getElementById("show-login");
    const forgotPasswordLink = document.getElementById("forgot-password");
    const backToLoginLink = document.getElementById("back-to-login");
    const resendButton = document.getElementById("resend-confirmation-email");

    const loginForm = document.getElementById("login-form");
    const createForm = document.getElementById("create-acct-form");
    const resetForm = document.getElementById("reset-form");
    const loginButton = loginForm.querySelector('[type="submit"]');

    const isResetPage = window.location.pathname.includes("update-password.html");

    // determine the correct base path
    const base = window.location.hostname.includes("github.io")
        ? "/scheduler/"
        : "./";
    const params = new URLSearchParams(window.location.search);
    if (params.get("varified") === "true") {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            showMessage("Email verified! Please login to continue.");
        }
    }
    const redirect = params.get("redirect") || `${base}scheduler.html`;

    let user = null;
    for (let i = 0; i < 5; i++) { // try up to 5 times
        const { data } = await supabase.auth.getUser();
        user = data.user || null;
        if (user) break;
        await new Promise(res => setTimeout(res, 200)); // wait 0.5sec before retry
    }

    // only redirect away from login/signup pages if already logged in
    const isPageAuthenticated = 
        window.location.pathname.endsWith("index.html") || 
        window.location.pathname === "/scheduler/";
    
    if (user && isPageAuthenticated && !isResetPage) {
        window.location.href = `${base}scheduler.html`;   
    }

    // show create account form
    showCreateAccountButton?.addEventListener("click", (event) => {
        event.preventDefault();
        showCreateAccount(loginForm, createForm);
    });

    // show login form
    showLoginButton?.addEventListener("click", (event) => {
        event.preventDefault();
        showLogin(createForm, loginForm);
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

    // resend password button
    resendButton?.addEventListener("click", async (event) => {
        event.preventDefault();
        resendConfirmationEmail(createForm, resendButton);
    });

    // login form submission
    loginForm?.addEventListener("submit", (event) => 
        handleLogin(event, loginForm, loginButton, redirect)
    );

    // create account form submission
    createForm?.addEventListener("submit", (event) => 
        handleCreateAccount(event, createForm, loginForm)
    );

        // show/hide password
    document.querySelectorAll(".show-password").forEach(button => {
        button.addEventListener("click", () => togglePasswordVisibility(button));
    }); 

    // handle supabase redirect 
    handleSupabaseRedirect();

    // auto-redirect logged-in users to scheduler
    supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user && !window.location.pathname.includes("scheduler.html")) {
            window.location.assign(redirect);
        }
    });
});