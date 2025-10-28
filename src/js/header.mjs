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

// toggle login/logout links
function updateLoginLogoutLinks(user) {
    const loginLink = document.querySelector(".login-link");
    const logoutLink = document.querySelector(".logout-link");

    if (!loginLink || !logoutLink) {
        return;
    }
    
    // hide/show login/logout links in header
    if (user) {
        loginLink.style.display = "none";
        logoutLink.style.display = "inline-block";
    } else {
        loginLink.style.display = "inline-block";
        logoutLink.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // attach menu toggle
    document.getElementById("toggle-menu")?.addEventListener("click", toggleMenuHandler);

    // handle supabase auth link visibility
    const loginLink = document.querySelector(".login-link");
    const logoutLink = document.querySelector(".logout-link");

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user || null;

        updateLoginLogoutLinks(user);

        // message if user is already logged in and clicks login
        if (user && loginLink) {
            loginLink.addEventListener("click", (event) => {
                event.preventDefault();
                showSubmissionMessage("You're already logged in.");
            });
        }

        // handle logout 
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
            }, 2000);
        });

    } catch (error) {
        console.error("Error checking Supabase session:", error);
    }
    // live update header without changes
    supabase.auth.onAuthStateChange((_event, session) => {
        updateLoginLogoutLinks(session?.user || null);
    });
});