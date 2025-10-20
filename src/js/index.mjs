import { supabase } from '../lib/supabase.mjs';

// guard against redirect spam
window._isRedirectingToLogin = window._isRedirectingToLogin || false;

function showMessage(message, isError = false) {
    const messageBox = document.getElementById("status-message");
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.classList.remove("hidden");
    messageBox.classList.toggle("error", isError);
    messageBox.classList.add("show");

    setTimeout(() => {
        messageBox.classList.remove("show");
        setTimeout(() => messageBox.classList.add("hidden"), 400);
    }, 3000);
}

async function loadAppointments() {
    const list = document.getElementById("my-appts");
    if (!list) return;
    list.innerHTML = "Loading...";

    try {
        const { data, error } = await supabase.auth.getUser();
        const user = data?.user;

        if (error) {
            console.warn("User not logged in or session missing:", error);
            list.textContent = "Could not varify user. Redirecting to login...";

            if (!window._isRedirectingToLogin) {
                window._isRedirectingToLogin = true;
                showMessage("Please sign in. Redirecting to login...", true);
                setTimeout(() => {
                    window.location.href = "index.html?redirect=scheduler.html";
                }, 1200);
            }
            return;
        }

        // if not signed in, exit
        if (!user) {
            list.textContent = "Please sign in to view appointments.";
            if (!window._isRedirectingToLogin) {
                window._isRedirectingToLogin = true;
                showMessage("Please sign in. Redirecting to login...", true);
                setTimeout(() => {
                    window.location.href = "index.html?redirect=scheduler.html";
                }, 1200);
            }
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
    } catch (error) {
            console.error("Unexpected error loading appointments:", error);
            list.textContent = "Could not load appointments. Please try again later.";
    }
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
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const type = hashParams.get("type");

    supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            loadAppointments();
        } 
    });

    if (accessToken && type === "recovery") {
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
            <input type="password" id="new-password" name="new-password" required minlength="8" />

            <label for="confirm-password">Confirm Password:</label>
            <input type="password" id="confirm-password" name="confirm-password" required minlength="8" />
            
            <button type="submit">Update Password</button>
            `;
            document.querySelector("main").appendChild(newPasswordForm);

            newPasswordForm.addEventListener("submit", async(event) => {
                event.preventDefault();
                const newPassword = document.getElementById("new-password").value.trim();
                const confirmPassword = document.getElementById("confirm-password").value.trim();

                if (newPassword !== confirmPassword) {
                    showMessage("Passwords do not match.", true);
                    return;
                }

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
    // RESEND CONFIRMATION LINK (SHOW)
    const resendLink = document.getElementById("resend-confirmation-link");
    resendLink?.addEventListener("click", async (event) => {
        event.preventDefault();

        const email = createForm.querySelector('input[name="email"]').value.trim();
        if (!email) {
            showMessage("Please enter your email first.");
            return;
        }

        // check if user exits but is unconfirmed
        const { data, error } = await supabase.auth.resend({
            type: "signup", 
            email,
            options: { 
                emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/"
            },
        });

        if (error) {
            console.error("resend failed:", error);
            showMessage("Could not resend confirmation email. Try again later.", ture);
        } else {
            showMessage("Confirmation email resent! Please check your inbox.");
            resendLink.disabled = true;
            resendLink.textContent = "Email Sent";
        }
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
    // RESET FORM FOR RESETTING PASSWORD NOW RESIDES IN AUTH.MJS
    
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
            const { data, error } = await supabase.auth.signInWithPassword({ 
                email, 
                password,
                options: { 
                    emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/"
                } 
            });

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

        const fullName = createForm.querySelector('input[name="name"]').value.trim();
        const email = createForm.querySelector('input[name="email"]').value.trim();
        const password = createForm.querySelector('input[name="password"]').value.trim();

        if (!fullName || !email || !password) {
            showMessage("Please enter your name, email, and password.");
            return;
        }

        try {
            // save name locally in case supabase metadata fails
            localStorage.setItem("fullName", fullName);

            // use PHP mailer on server
            const res = await fetch("backend/sendmail_scheduler.php", {
                method: "POST", 
                headers: { "Content-Type": "application/x-www-form-urlencoded" }, 
                body: new URLSearchParams({
                    type: "signup", 
                    name: fullName,
                    email: email,
                    password: password
                })
            });
            const result = await res.json();

            if (result.ok) {
                showMessage(`Welcome aboard ${fullName}! Please check your email to confirm your account.`);
                createForm.style.display = "none";
                loginForm.style.display = "block";
            } else {
                console.error(result.error);
                showMessage("Could not create an account at this time. Please try again.");
            }
        } catch (error) {
            console.error("Unexpected error:", error);
            showMessage("Something went wrong. Please try again.");
        }
    });
});