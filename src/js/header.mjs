import { showSubmissionMessage } from "./form-utilities.mjs";
import { supabase } from "../lib/supabase.mjs";

console.log("[TRACE] script loaded:", window.location.pathname);

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
        console.warn("No login/logout links found - skipping auth header logic for this page");
        return;
    }

    try {
        console.log("⚠️ [TRACE] Redirect triggered by", window.location.pathname, "→", new URL("admin-dashboard.html", window.location));

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

        if (!freshLogoutLink) {
            console.warn("No .logout-link found - skipping logout setup");
        }

        // logged in state
        if (user) {
            // logged in => hide login, show logout
            if (loginLink) loginLink.style.display = "none";
            if (freshLogoutLink) freshLogoutLink.style.display = "inline-block";

            // logout behavior
            if (freshLogoutLink) {
                freshLogoutLink.addEventListener("click", async (event) => {
                    event.preventDefault();

                    // log out of employee session if there is one
                    localStorage.removeItem("employeeLoggedIn");

                    // supabase logout for regular users
                    const { error } = await supabase.auth.signOut();
                    if (error) {
                        console.error("Logout failed:", error);
                        showSubmissionMessage("Logout failed: Please try again.", true);
                        return;
                    }

                    showSubmissionMessage("Logout successful. Redirecting...");
                    console.log("⚠️ [TRACE] Redirect triggered by", window.location.pathname, "→", new URL("admin-dashboard.html", window.location));

                    if (
                        window.location.pathname.includes("admin.html") || 
                        window.location.pathname.includes("admin-dashboard.html")
                    ) {
                        console.log("[TRACE] Skipping logout redirect on admin page");
                        return;
                    }

                    console.log(
                          "⚠️ [TRACE] Redirect triggered by", window.location.pathname, "→ index.html");

                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1500);
                });
            }
            
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
        const path = window.location.pathname;

        // skip auto-reload if url has signup/recovery link hash
        const hash = window.location.hash;
        if (hash.includes("type=signup") || hash.includes("type=recovery")) {
            console.log(`[TRACE] Skipping auth reload for signup/recovery link: ${event}`);
            return;
        }

        if (path.includes("admin.html") || path.includes("admin-dashboard.html")) {
            console.log(`[TRACE] Skipping auth state change reload on admin page for: ${event}`);
            return;
        }
        if (authReload || document.visibilityState !== "visible") return; // prevent double reloads

        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {

            const currentPath = window.location.pathname;
            if (
                currentPath.includes("index.html") ||
                currentPath.includes("create-account") ||
                currentPath.includes("reset-password") ||
                currentPath === "/" // root page
            ) {
                console.log(`Skipping reload on auth page for event: ${event}`);
                return;
            }

            // skip reloads on admin pages
            if (
                currentPath.includes("admin.html") ||
                currentPath.includes("admin-dashboard.html")
            ) {
                console.log(`[TRACE] Skipping reload on admin page for: ${event}`);
                return;
            }

            clearTimeout(reloadTimer);
            reloadTimer = setTimeout(() => {
                authReload = true;
                console.log(`Authorization event: ${event}`);
                location.reload();
            }, 3500);
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    // mobile menu toggle (always needed)
    const menuToggle = document.getElementById("toggle-menu");
    if (menuToggle) {
        menuToggle.addEventListener("click", toggleMenuHandler);
    } else {
        console.warn("No menu toggle button found in header - skipping menu logic");
    }
    // login/logout toggle
    try {
        await toggleLoginOut();
    } catch (error) {
        console.error("Header login/logout toggle failed:", error);
    }
});