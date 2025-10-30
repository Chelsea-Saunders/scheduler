
let messageTimeout;

export function showMessage(message, isError = false) {
    const box = document.getElementById("status-message");
    if (!box) return;
    
    // clear ongoing hide timers
    clearTimeout(messageTimeout);

    // reset message & classes
    box.textContent = message;
    box.classList.remove("hidden", "error", "show");

    // apply error class if needed
    if (isError) box.classList.add("error");
    box.classList.add("show");

    // accessibility: allow screen readers to announce
    box.setAttribute("tabindex", "-1");
    box.focut();

    // auto hide after 3 seconds
    messageTimeout = setTimeout(() => {
        box.classList.remove("show");
        setTimeout(() => box.classList.add("hidden"), 400);
    }, 3000);
}
