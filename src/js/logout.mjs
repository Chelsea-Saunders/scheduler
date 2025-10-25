import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";


// when user session changes logout/login
supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
        // redirect to your actual login page
        window.location.replace("index.html");
    }
});

// when the page loads, automatically sign the user out
document.addEventListener("DOMContentLoaded", async () => {
    const { error } = await supabase.auth.signOut();

    const logoutDiv = document.getElementById("logout");

    if (error) {
        console.error("Logout failed:", error);
        showMessage("⚠️ Sign out failed. Please try again.", true);

        logoutDiv.innerHTML = `
            <h1>⚠️ Sign Out Failed</h1>
            <p>There was an issue signing you out. Please try again.</p>
            <button id="try-again">Try Again</button>
            `;

            document.getElementById("try-again").addEventListener("click", async () => {
                const retry = await supabase.auth.signOut();
                if (!retry.error) {
                    showMessage("✅ You have been signed out."); 

                    // fade out
                    logoutDiv.style.transition = "opacity 0.8s ease";
                    logoutDiv.style.opacity = "0";

                    // small delay for UX
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1500);
                } else {
                    showMessage("⚠️ Sign out failed again. Please try refreshing the page.", true);
                }
            });
    } else {
        showMessage("✅ You have been signed out.");
        // fade out animation
        logoutDiv.innerHTML = `
            <h1>✅ You’ve been signed out</h1>
            <p>Redirecting to login page...</p>
            `;
            
            // fade out
            logoutDiv.style.transition = "opacity 0.8s ease";
            logoutDiv.style.opacity = "0";

            // small delay for UX
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
    }
});