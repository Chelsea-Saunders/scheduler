import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";

function getForm() {
    return document.getElementById("update-password-form");
}
function getNewPasswordInput() {
    return document.getElementById("new-password");
}
function getConfirmPasswordInput() {
    return document.getElementById("confirm-password");
}
function getSubmitButton() {
    return getForm().querySelector("button");
}

// form submission handler
function disableSubmitButton() {
    const button = getSubmitButton();
    button.disabled = true;
    button.textContent = "Updating...";
    getForm().style.opacity = "0.7";
}

function enableSubmitButton() {
    const button = getSubmitButton();
    button.disabled = false;
    button.textContent = "Update Password";
    getForm().style.opacity = "1";
}

// validation
function validatePasswords(newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
        showMessage("Passwords do NOT match.", true);
        return false;
    }
    return true;
}

// password update
async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });
    return error;
}

// error handling
function handlePasswordUpdateError(error) {
    console.error("Password update failed:", error);

    if (!error?.message) {
        showMessage("Could not update password. Please try again.", true);
        return;
    }
    if (error.message.includes("different from old password")) {
        showMessage("Your new password must be different from your current password.", true);
    } else if (error.message.includes("invalid or expired")) {
        showMessage("The reset link has expired. Please request a new password reset.", true);
    } else {
        showMessage("Could not update password. Please try again.", true);
    }
}

// success 
async function handlePasswordUpdateSuccess() {
    showMessage("Password updated! Redirecting to login...");
    getForm().reset();
    getForm().style.opacity = "1";

    try {
        // sign out user and let them log in
        await supabase.auth.signOut();
    } catch (error) {
        console.warn("Sign-out after password reset failed:", error);
    }

    // redirect to login
    setTimeout(() => {
        window.location.assign("index.html")
    }, 2000);
}

// form submission handler
async function handleFormSubmission(event) {
    event.preventDefault();

    const newPassword = getNewPasswordInput().value.trim();
    const confirmPassword = getConfirmPasswordInput().value.trim();

    if (!validatePasswords(newPassword, confirmPassword)) {
        return;
    }

    disableSubmitButton();

    const error = await updatePassword(newPassword);

    if (error) {
        handlePasswordUpdateError(error);
        enableSubmitButton();
        return;
    }
    handlePasswordUpdateSuccess();
}
// main
async function initializePasswordResetPage() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (window.location.hash.includes("type=signup")) {
        console.log("Signup link detected - forcing logout before password setup.");

        // sign out to prevent redirect to dashboard
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.warn("No existing session or failed to clear:", error);
        }
    }
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");

    const form = getForm();

    // reset form (user enters email to get reset link)
    if ((type !== "recovery" && type !== "signup") || !accessToken || !refreshToken) {
        console.log("Password reset request mode(no recovery token detected).");

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const emailInput = document.getElementById("email");
            const email = emailInput?.value?.trim();
            if (!email) {
                showMessage("Please enter your email address.", true);
                return;
            }

            const button = getSubmitButton();
            button.disabled = true;
            button.textContent = "Sending...";

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: "https://chelsea-saunders.github.io/scheduler/update-password.html", 
            });

            if (error) {
                console.error("Failed to send recovery link:", error);
                showMessage("Failed to send recovery link. Please request a new one.", true);
                button.disabled = false;
                button.textContent = "Send Reset Link";
                return;
            }

            // successful reset request
            showMessage("Check your inbox for the reset link.");
            form.reset();
            button.disabled = false;
            button.textContent = "Send Reset Link";
        });

        return; // stop here - don't set up password update
    }

    // recovery mode (user cliked email link to open form to set new password)
    try {
        const { data, error } = await supabase.auth.setSession({
            access_token: accessToken, 
            refresh_token: refreshToken,
        });

        if (error) {
            console.error("Failed to open recovery link session:", error);
            showMessage("Could not open the reset password link. Please request a new one.", true);
            return;
        }

        console.log("Recovery session established:", data);

        if (type === "signup") {
            showMessage("Welcome! Please set your new password to complete your account setup.");
        } else {
            showMessage("Please enter a new password to reset your account.");
        }

    } catch (error) {
        console.error("Unexpected session error:", error);
        showMessage("Could not restore recovery session.", true);
        return;
    }

    form.addEventListener("submit", handleFormSubmission);

    // auto-focus new password field
    getNewPasswordInput().focus();
}


document.addEventListener("DOMContentLoaded", () => {
    initializePasswordResetPage();
});