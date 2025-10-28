import { showSubmissionMessage } from "./form-utilities.mjs";
import { supabase } from "../lib/supabase.mjs";

// toggles menu open/close
export function toggleMenuHandler() {
    const toggleButton = document.querySelector("#toggle-menu");
    const nav = document.querySelector("#global-nav");
    const header = document.querySelector(".global-header");

    if (!toggleButton || !nav || !header) return;

    // toggle the class to show/hide the menu
    const isOpen = toggleButton.getAttribute("data-menu-open") === "true";
    const next = !isOpen;


    toggleButton.setAttribute("data-menu-open", String(next));
    toggleButton.setAttribute("aria-expanded", String(next));
    toggleButton.setAttribute("aria-label", next ? "Close menu" : "Open menu");

    nav.classList.toggle("is-open", next);
    toggleButton.classList.toggle("open", next);
    header.classList.toggle("menu-open", next);
}

document.addEventListener("DOMContentLoaded", async () => {
    // attach menu toggle
    document.getElementById("toggle-menu")?.addEventListener("click", toggleMenuHandler);

    // handle supabase auth link visibility
    const loginLink = document.querySelector(".login-link");
    const logoutLink = document.querySelector(".logout-link");

    try {
        const { data: { user } } = await supabase.auth.getSession();

        if (user) {
            // logged in === hide login
            if (loginLink) loginLink.style.display = "none";
            if (logoutLink) logoutLink.style.display = "block";

            // show message if user clicks anyway
            if (loginLink) {
                loginLink.addEventListener("click", (event) => {
                    event.preventDefault();
                    showSubmissionMessage("You're already logged in.");
                });
            }
        } else {
            // not logged in === hide logout
            if (loginLink) loginLink.style.display = "inline-block";
            if (logoutLink) logoutLink.style.display = "none";
        }

        // handle logout 
        if (logoutLink) {
            logoutLink.addEventListener("click", async (event) => {
                event.preventDefault();
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error("Logout failed:", error);
                    showSubmissionMessage("Logout failed. Please try again.", true);
                    return;
                }
                showSubmissionMessage("Log out successful. Redirecting...");
                // redirect to home after logout
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            });
        }
    } catch (error) {
        console.error("Error checking Supabase session:", error);
    }
    // live update header with auth changes
    supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
            // reload only once when logged in or out
            location.reload();
        } 
    });
});