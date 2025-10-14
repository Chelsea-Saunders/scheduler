import { supabase } from '../lib/supabase.mjs';

async function loadAppointments() {
    const { data, error } = await supabase.from('appointments').select('*');
    if (error) {
        console.error(error);
    } 
    else {
        console.log("Appointments:", data);
    }
}
loadAppointments();

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
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect") || "schedule.html";

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
            alert("Please enter both email and password.");
            return;
        }

        try {
            const { error } = await supabase.auth.signUp({ email, password });

            if (error) {
                console.error("Error creating account:", error);
                alert("⚠️ Could not create account. Please try again.");
            } else {
                alert("✅ Account created! Please check your email to confirm your account.");
                // hide create form and show login form
                createForm.style.display = "none";
                loginForm.style.display = "block";
            }
        } catch (error) {
            console.error("Unexpected error:", error);
            alert("⚠️ Something went wrong. Please try again.");
        }
    });
});