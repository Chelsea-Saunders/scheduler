
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
        if (ok && field.type === "email" && !validateEmail(value).valid) {
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
    if (!email) return { valid: false, message: "Email is required." };
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = emailRegex.test(email.trim());
    if (!isValid) {
        return { valid: false, message: "Please enter a valid email address." };
    }
    return { valid: true };
}
// VALIDATE PHONE NUMBER 
export function validatePhone(phone) {
    if (!phone) return { valid: false, message: "Phone number is required." };

    // remove all non-digits
    const digits = phone.replace(/\D/g, '');

    if (digits.length !== 10) {
        return { valid: false, message: "Phone number must be 10 digits." };
    }

    const pattern = /^(\+?1\s?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}$/;
    const isValid = pattern.test(phone.trim());

    if (!isValid) {
        return { valid: false, message: "Please enter a valid phone number." };
    }

    return { valid: true };
}
// PHONE NUMBER INPUT FORMATTING
export function attachPhoneFormatter(input) {
    if (!input) return;
    input.addEventListener("input", (event) => {
        // remove all non-digits
        let value = event.target.value.replace(/\D/g, ''); 

        // limit to 10 digits
        if (value.length > 10) value = value.slice(0, 10);

        // apply formatting
        if (value.length > 3 && value.length <= 6) {
            value = value.replace(/(\d{3})(\d{1,3})/, '($1) $2');
        }
        else if (value.length > 6) {
            value = value.replace(/(\d{3})(\d{3})(\d{1,4})/, '($1) $2-$3');
        }
        event.target.value = value;
    });
}

// VALIDATE PASSWORD STRENGTH
export function validatePassword(password) {
    if (!password) {
        return { valid: false, message: "Password is required." };
    }

    // must be 8 characters, 1 number, 1 letter
    const pattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    const isValid = pattern.test(password);

    if (!isValid) {
        return {
            valid: false, 
            message: "Password must be at least 8 characters long and include at lease one letter and one number."
        };
    }

    return {
        valid: true
    };
}
// make attachPhoneFormatter universal to all forms
export function applyPhoneFormatterToAll() {
    document.querySelectorAll('input[name="phone"]').forEach(attachPhoneFormatter);
}