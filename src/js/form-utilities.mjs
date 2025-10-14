
// error handling for required fields
export function validateForm(form) {
    const requiredFields = form.querySelectorAll("[required]");
    let isValid = true;

    requiredFields.forEach(field => {
        const value = field.value.trim();
        let ok = true;

        // required check
        if (!value) ok = false;

        // email validation
        if (ok && field.type === "email" && !validateEmail(value)) {
            ok = false;
        } 
        // password minlength 
        if (ok && field.type === "password" && field.minLength > 0) {
            if (value.length < field.minLength) ok = false;
        }

        field?.classList.toggle("error", !ok);
        field?.setAttribute("aria-invalid", String(!ok));

        // focus on the first invalid input field
        if (!ok && isValid) field.focus();

        if (!ok) isValid = false;
    });

    // CONFIRM PASSWORD MATCH
    const pass = form.querySelector('input[name="password"]');
    const confirm = form.querySelector('input[name="confirm-password"]');
    if (pass && confirm) {
        const match = pass.value === confirm.value && confirm.value.trim().length > 0;
        confirm?.classList.toggle("error", !match);
        confirm?.setAttribute("aria-invalid", String(!match));
        if (!match) isValid = false;
    }

    return isValid;
}
// CLEAR FORM FIELDS
export function clearFormFields(form) {
    form.querySelectorAll("input, textarea, select").forEach(field => {
        if (!form) return;
        if (field.type === "checkbox" || field.type === "radio") {
            field.checked = false;
        } else {
            field.value = "";
        }
        field?.classList.remove("error");
        field?.setAttribute("aria-invalid", "false");
    });
}
// SUBMISSION MESSAGE
export function showSubmissionMessage(message) {
    const msg = document.createElement("div");
    msg.className = "submission-message";
    msg.setAttribute("role", "status");
    msg.setAttribute("aria-live", "polite");
    msg.textContent = message;

    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 4000);
}
// VALIDATE EMAIL FORMAT
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}