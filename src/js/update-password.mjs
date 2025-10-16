import { supabase } from "../lib/supabase.mjs";

document.addEventListener("DOMContentLoaded", () => {
    // parse token from URL hash
    const tokenMatch = window.location.hash.match(/access_token=([^&]+)/);
    const accessToken = tokenMatch ? tokenMatch[1] : null;

    // if there's no token match, redirect to login
    if (!accessToken) {
        window.location.href = "index.html";
    }

    // reference the form and inputs
    const form = document.getElementById("update-password-form");
    const messageBox = document.getElementById("status-message");

    // message function
    function showMessage(message, isError = false) {
        messageBox.textContent = message;
        messageBox.classList.toggle("error", isError);
        messageBox.classList.remove("hidden");
    }

    // form submission
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const newPassword = document.getElementById("new-password").value.trim();
        const confirmPassword = document.getElementById("confirm-password").value.trim();

        // validate that passwords match
        if (newPassword !== confirmPassword) {
            showMessage("⚠️ Passwords do not match.", true);
            return;
        }

        // disable submission button and show loading state
        const submitButton = form.querySelector("button");
        submitButton.disabled = true;
        submitButton.textContent = "Updating...";
        form.style.opacity = "0.7";

        // show create new password form and handle submission
        const { error } = await supabase.auth.updateUser({ 
            password: newPassword 
        });

        if (error) {
            console.error("Password update failed:", error);
            showMessage("⚠️ Could not update password. Please try again.", true);

            // re-enable button
            submitButton.disabled = false;
            submitButton.textContent = "Update Password";
            form.style.opacity = "1";
            return;
        }

        // success message
        showMessage("✅ Password updated! Redirecting to login...");
        // reset form
        form.reset();
        form.style.opacity = "1";

        // take us back to the sign in page
        setTimeout(() => window.location.assign("index.html"), 2000);
    });

    // auto-focus the new password field
    document.getElementById("new-password").focus();
});