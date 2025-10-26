import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";

// dom element helpers
function getLogoutContainer() {
    return document.getElementById("logout");
}

// ui helpers
function setLogoutContent(title, message, buttonText = "") {
    const container = getLogoutContainer();
    container.innerHTML = `
        <h1>${title}</h1>
        <p>${message}</p>
        ${buttonText ? `<button id="try-again">${buttonText}</button>` : ""}
    `;
}

function fadeOutAndRedirect(redirectUrl = "index.html", delay = 1500) {
    const container = getLogoutContainer();
    container.style.transition = "opacity 0.8s ease";
    container.style.opacity = "0";

    setTimeout(() => {
        window.location.href = redirectUrl;
    }, delay);
}

// supabase handler
async function signOutUser() {
    return await supabase.auth.signOut();
}
// error handling
function handleLogoutError(error) {
    console.error("Logout failed:", error);
    showMessage("Sign out failed. Please try again.", true);

    setLogoutContent(
        "Sign Out Failed", 
        "There was an issue signing you out. Please try again.", 
        `<button id="try-again">Try Again</button>`
    );

    addRetryLogoutListener();
}

// retry logout
function addRetryLogoutListener() {
    const retryButton = document.getElementById("try-again");
    if (!retryButton) return;

    retryButton.addEventListener("click", async () => {
        const retry = await signOutUser();

        if (!retry.errot) {
            showMessage("You have been signed out.");
            setLogoutContent(
                "You have been logged out", 
                "Redirecting to login page..."
            );
            fadeOutAndRedirect();
        } else {
            showMessage("Sign out failed again. Please try refreshing the page.", true);
        }
    });
}
// successful logout
function handleSuccessfulLogout() {
    showMessage("You have ben signed out.");
    setLogoutContent(
        "You have been successfully logged out", 
        "Redirecting to login page..."
    );
    fadeOutAndRedirect();
}
// main auth listener
function listenForAuthChanges() {
    supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
            window.location.replace("index.html");
        }
    });
}
// main logout flow
async function performLogout() {
    const { error } = await signOutUser();
    if (error) {
        handleLogoutError(error);
    } else {
        handleSuccessfulLogout();
    }
}
// page load
function initializeLogoutPage() {
    listenForAuthChanges();
    performLogout();
}
document.addEventListener("DOMContentLoaded", () => {
    initializeLogoutPage();
});