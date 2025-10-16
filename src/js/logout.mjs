import { supabase } from "../lib/supabase.mjs";

// when the page loads, automatically sign the user out
document.addEventListener("DOMContentLoaded", async () => {
    const { error } = await supabase.auth.signOut();

    const logoutDiv = document.getElementById("logout");

    if (error) {
        console.error("Logout failed:", error);
        logoutDiv.innerHTML = `
            <h1>⚠️ Sign Out Failed</h1>
            <p>There was an issue signing you out. Please try again.</p>
            <button id="try-again">Try Again</button>
            `;

            document.getElementById("try-again").addEventListener("click", async () => {
                const retry = await supabase.auth.signOut();
                if (!retry.error) {
                    window.location.href = "index.html";
                }
            });
    } else {
        // fade out animation
        logoutDiv.innerHTML = `
            <h1>✅ You’ve been signed out</h1>
            <p>Redirecting to login page...</p>
            `;

            // small delay for UX
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
    }
});