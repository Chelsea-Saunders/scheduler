import { supabase } from "../lib/supabase.mjs";

// reusable message box
function showMessage(message, isError = false) {
    let box = document.getElementById("status-message");
    if (!box) {
        box = document.createElement("div");
        box.id = "status-message";
        box.className = "status-message";
        document.body.prepend(box);
    }

    box.textContent = message;
    box.classList.toggle("error", isError);
    box.classList.remove("hidden");

    setTimeout(() => {
        box.classList.add("hidden");
    }, 3000);
}

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
                    showMessage
                    window.location.href = "index.html";
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

            // small delay for UX
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
    }
});