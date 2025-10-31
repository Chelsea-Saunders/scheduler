import { showSubmissionMessage } from "./form-utilities.mjs";
import { supabase } from "../lib/supabase.mjs";

// toggles menu open/close (mobile)
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

// toggle login/out links
export async function toggleLoginOut() {
    const loginLink = document.querySelector(".login-link");
    const logoutLink = document.querySelector(".logout-link");

    if (!loginLink && !logoutLink) {
        return;
    }

    try {
        // skip logic for password recovery page
        if (
            window.location.href.includes("type=recovery") ||
            window.location.pathname.includes("update-password.html")
        ) {
            console.log("Recovery flow detected - skipping header auth logic");
            return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        // clone logout link to remove old event listeners
        if (logoutLink) {
            logoutLink.replaceWith(logoutLink.cloneNode(true));
        }
        const freshLogoutLink = document.querySelector(".logout-link");

        if (user) {
            // logged in => hide login, show logout
            if (loginLink) loginLink.style.display = "none";
            if (freshLogoutLink) freshLogoutLink.style.display = "inline-block";

            // logout behavior
            freshLogoutLink.addEventListener("click", async (event) => {
                event.preventDefault();
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error("Logout failed:", error);
                    showSubmissionMessage("Logout failed: Please try again.", true);
                    return;
                }

                showSubmissionMessage("Logout successful. Redirecting...");
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            });
        } else {
            // if logged out, show login, hide logout
            if (loginLink) {
                loginLink.style.display = "inline-block";
            }
            if (freshLogoutLink) {
                freshLogoutLink.style.display = "none";
            }
        }
    } catch (error) {
        console.error("Error checking Supabase session:", error);
    }
    let authReload = false;
    let reloadTimer;

    // live update header with auth changes
    supabase.auth.onAuthStateChange((event) => {
        if (authReload) return; // prevent double reloads
        if (document.visibilityState !== "visible") return; // only the active tab reacts

        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
            clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => {
                authReload = true;
                console.log(`Authorization event: ${event}`);
                location.reload();
            }, 300);
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("toggle-menu")?.addEventListener("click", toggleMenuHandler);
    await toggleLoginOut();
});