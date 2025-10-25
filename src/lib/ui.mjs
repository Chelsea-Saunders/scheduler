export function showMessage(message, isError = false) {
    const messageBox = document.getElementById("status-message");
    messageBox.textContent = message;

    // reset classes
    messageBox.classList.remove("hidden", "error", "show");

    if (isError) messageBox.classList.add("error");
    messageBox.classList.add("show");

    // auto hide after 3 seconds
    setTimeout(() => {
        messageBox.classList.remove("show");
        setTimeout(() => messageBox.classList.add("hidden"), 400);
    }, 3000);
}
