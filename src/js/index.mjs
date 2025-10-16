import { supabase } from '../lib/supabase.mjs';

function showMessage(message, isError = false) {
    const messageBox = document.getElementById("status-message");
    messageBox.textContent = message;

    messageBox.classList.remove("hidden");
    if (isError) {
        messageBox.classList.add("error");
    }

    messageBox.classList.add("show");

    // auto hide after 3 seconds
    setTimeout(() => {
        messageBox.classList.remove("show");
        setTimeout(() => messageBox.classList.add("hidden"), 400);
    }, 3000);
}

async function loadAppointments() {
    const list = document.getElementById("my-appts");
    list.innerHTML = "Loading...";

    const { data, error } = await supabase.auth.getUser();
    const user = data?.user;

    if (error) {
        console.warn("User not logged in or session missing:", error);
        list.textContent = "Could not varify user. Redirecting to login...";
        return;
    }
    // if not signed in, exit
    if (!user) {
        list.textContent = "Please sign in.";
        return;
    }

    const { data: appts, error: apptError } = await supabase
        .from("appointments")
        .select("id, date, time")
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

    if (apptError) {
        console.error("Error loading appointments:", error);
        list.textContent = "Could not load appointments. Please try again later.";
        return;
    } 
    if (!appts || appts.length === 0) {
        list.textContent = "You have no upcoming appointments.";
        return;
    }

    list.innerHTML = "";
    appts.forEach(row => {
        const item = document.createElement("div");
        const when = new Date(row.date + "T12:00:00"); // noon to avoid timezone issues
        item.className = "appt";
        item.textContent = `${when.toLocaleDateString()} - ${row.time}`;
        list.appendChild(item);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const showCreateAccountButton = document.getElementById("show-create-account");
    const showLoginButton = document.getElementById("show-login");
    const forgotPasswordLink = document.getElementById("forgot-password");
    const backToLoginLink = document.getElementById("back-to-login");

    const loginForm = document.getElementById("login-form");
    const createForm = document.getElementById("create-acct-form");
    const resetForm = document.getElementById("reset-form");

    const loginButton = loginForm.querySelector('[type="submit"]');
    const messageDiv = document.querySelector("#login-message");

    // const url = new URL(window.location.href);
    const tokenMatch = window.location.hash.match(/access_token=([^&]+)/);
    const accessToken = tokenMatch ? tokenMatch[1] : null;

    loadAppointments();

    if (accessToken) {
        // this means the user clicked the password reset link from email
        showMessage("🔒 Please enter your new password below.");
        loginForm.style.display = "none";
        createForm.style.display = "none";
        resetForm.style.display = "none";

        // show password update UI
        const newPasswordForm = document.createElement("form");
        newPasswordForm.innerHTML = `
            <h2>Set New Password</h2>
            <label for="new-password">New Password:</label>
            <input type="password" id="new-password" name="new-password" required minlength="6" />
            <button type="submit">Update Password</button>
            `;
            document.querySelector("main").appendChild(newPasswordForm);

            newPasswordForm.addEventListener("submit", async(event) => {
                event.preventDefault();
                const newPassword = document.getElementById("new-password").value.trim();

                const { error } = await supabase.auth.updateUser({ password: newPassword });

                if (error) {
                    showMessage("⚠️ Could not update password. Please try again.", true);
                    console.error(error);
                } else {
                    showMessage("✅ Password updated! Please log in with your new password.");
                    newPasswordForm.remove();
                    loginForm.style.display = "block";
                }
            });
    }
    

    // CREATE ACCOUNT (SHOW)
    showCreateAccountButton.addEventListener("click", (event) => {
        event.preventDefault();
        loginForm.style.display = "none";
        createForm.style.display = "block";
    });
    // LOGIN (SHOW)
    showLoginButton.addEventListener("click", (event) => {
        event.preventDefault();
        createForm.style.display = "none";
        loginForm.style.display = "block";
    });
    // RESET PASSWORD (SHOW)
    forgotPasswordLink.addEventListener("click", (event) => {
        event.preventDefault();
        loginForm.style.display = "none";
        createForm.style.display = "none";
        resetForm.style.display = "block";
    });
    // BACK TO LOGIN (SHOW)
    backToLoginLink.addEventListener("click", (event) => {
        event.preventDefault();
        resetForm.style.display = "none";
        loginForm.style.display = "block";
    });
    // RESET FORM FOR RESETTING PASSWORD
    resetForm?.addEventListener("submit", async(event) => {
        event.preventDefault();

        const email = document.getElementById("reset-email").value.trim();
        if (!email) {
            showMessage("⚠️ Please enter your email address.");
            return;
        }

        // detect current path for redirection
        let redirectTo;
        const host = window.location.origin;

        if (host.includes("localhost")) {
            redirectTo = "http://localhost:5173/update-password.html";
        } else {
            redirectTo = "https://Chelsea-Saunders.github.io/scheduler/update-password.html";
        }

        // tell supabase to reset password
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

        if (error) {
            console.error("Reset password error:", error);
            showMessage("⚠️ Could not send reset email. Please try again.");
        } else {
            showMessage("✅ Please check your email for reset instructions.");
            resetForm.reset();
        }
    });
    // MESAGE AND LOADING 
    const setMessage = (text = "", isError = false) => {
        if (!messageDiv) return;
        messageDiv.textContent = text;
        messageDiv.classList.toggle("error", !!isError);
    };

    const setLoading = (isLoading) => {
        if (loginButton) {
            loginButton.disabled = isLoading;
            loginButton.setAttribute("aria-busy", isLoading ? "true" : "false");
        }
    };

    // Where to go after submit
    // determine the correct base path
    const base = window.location.hostname.includes("github.io")
        ? "/scheduler/"
        : "./";
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect") || `${base}scheduler.html`;

    // login form submit 
    loginForm?.addEventListener("submit", async(event) => {
        event.preventDefault();
        setMessage();
        setLoading(true);

        try {
            const email = loginForm.email?.value?.trim();
            const password = loginForm.password?.value ?? "";

            // light, client-side validation
            if (!email || !password) {
                setMessage("Please enter both email and password.", true);
                return;
            }

            // supabase login
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                // invalid login
                setMessage(error.message || "Login failed. Please try again.", true);
                // clear password field
                loginForm.password.value = "";
                loginForm.password?.focus();
                return;
            }

            // safeguard: ensure we have a user before redirecting
            if (!data?.user || !data?.session) {
                setMessage("Login incomplete. Please try again.", true);
                return;
            }
            
            // success...navigate to redirect page
            window.location.assign(redirect);

        } catch (error) {
            setMessage("An unexpected error occurred. Please try again.", true);
            console.error(error);
        } finally {
            setLoading(false);
        }
    });
    // CREATE ACCOUNT (SUBMIT)
    createForm?.addEventListener("submit", async(event) => {
        event.preventDefault();

        const email = createForm.querySelector('input[name="email"]').value.trim();
        const password = createForm.querySelector('input[name="password"]').value.trim();

        if (!email || !password) {
            showMessage("Please enter both email and password.");
            return;
        }

        try {
            const { error } = await supabase.auth.signUp({ email, password });

            if (error) {
                console.error("Error creating account:", error);
                showMessage("⚠️ Could not create account. Please try again.");
            } else {
                showMessage("✅ Account created! Please check your email to confirm your account.");
                // hide create form and show login form
                createForm.style.display = "none";
                loginForm.style.display = "block";
            }
        } catch (error) {
            console.error("Unexpected error:", error);
            showMessage("⚠️ Something went wrong. Please try again.");
        }
    });
});