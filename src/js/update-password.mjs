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
// when page loads
function getAccessTokenFromUrl() {
    const tokenMatch = window.location.hash.match(/access_token=([^&]+)/);
    return tokenMatch ? tokenMatch[1] : null;
}
function redirectToLogin() {
    window.location.href = "index.html";
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
    const hashParams = new URLSearchParams("window.location.hash.substring(1)");
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");

    // ensure this is recovery link
    if (type !== "recovery" || !accessToken || !refreshToken) {
        showMessage("Invalid or expired password reset link.", true);
        redirectToLogin();
        return;
    }

    // clear old session before reset
    await supabase.auth.signOut();

    try {
        const { data, error } = await supabase.auth.setSession({
            access_token: accessToken, 
            refresh_token: refreshToken,
        });

        if (error) {
            console.error("Failed to set recovery session:", error);
            showMessage("Invalid or expired recovery link. Please request a new one.", true);
            return;
        }

        console.log("Recovery session established:", data);
    } catch (error) {
        console.error("Unexpected session error:", error);
        showMessage("Could not restore recovery session.", true);
        return;
    }

    const form = getForm();
    form.addEventListener("submit", handleFormSubmission);

    // auto-focus new password field
    getNewPasswordInput().focus();
}


document.addEventListener("DOMContentLoaded", () => {
    initializePasswordResetPage();
});