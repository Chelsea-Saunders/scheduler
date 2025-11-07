import { supabase } from '../lib/supabase.mjs';
import { showMessage } from '../lib/ui.mjs';

console.log("[TRACE] script loaded:", window.location.pathname);

// congig's
const redirectAfterLogin = "./calendar.html";
let currentPasscode = null; // holds the one fetched from supabase

// select elements
const form = document.getElementById("employee-passcode-form");
const regenerateLink = document.getElementById("regenerate-passcode");

// fetch current passcode from supabase
async function fetchCurrentPasscode() {
    try {
        const { data, error } = await supabase
            .from("employees")
            .select("passcode")
            .order("created_at", { ascending: false })
            .limit(1);

        if (error) {
            throw error;
        }

        console.log("what is supabase fetching:", error);

        if (!data || data.length === 0) {
            throw new Error("No passcode found in database.");
        }

        currentPasscode = data[0].passcode;
        console.log("Fetched passcode:", currentPasscode); // for testing 
    } catch (error) {
        console.error("Error fetching passcode:", error.message);
        showMessage("Couldn't fetch employees passcode. Please try again later.", true);
    }
}
function validatePasscode(passcode) {
    if (!passcode) {
        showMessage("Please enter the passcode.", true);
        return false;
    }
    return true;
}

// CHECK PASSCODE
function isPasscodeCorrect(passcode) {
    return passcode === currentPasscode;
}

// // HANDLE LOGIN SUCCESS
// function loginSuccess() {
//     showMessage("Passcode correct! Redirecting...");
//     setTimeout(() => {
//         window.location.assign(redirectAfterLogin);
//     }, 1000);
// }

// HANDLE LOGIN FAILURE
function loginFailure(input) {
    showMessage("Incorrect passcode. Please try again.", true);
    input.value = "";
    input.focus();
}

// FORM HANDLER
async function handleEmployeeLogin(event) {
    event.preventDefault();

    const input = form.querySelector('input[name="passcode"]');
    const enteredCode = input.value.trim();

    if (!validatePasscode(enteredCode)) {
        return;
    }

    // ensure passcode is fetched before comparison
    if (!currentPasscode) {
        showMessage("Loading current passcode, please wait...", true);
        await fetchCurrentPasscode();
    }

    if (isPasscodeCorrect(enteredCode)) {
        loginSuccess();
    } else {
        loginFailure(input);
    }
}

// ADD EVENT LISTENERS
async function initEmployeeLogin() {
    if (!form) {
        console.error("Employee login form not found.");
        return;
    }
    await fetchCurrentPasscode();
    form.addEventListener("submit", handleEmployeeLogin);
}

// // EMPLOYEE LOGIN 
// function loginSuccess() {
//     const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours from now/login time
//     localStorage.setItem("employeeLoggedIn", JSON.stringify({ loggedIn: true, expiresAt }));
//     showMessage("Passcode correct! Redirecting...");
//     setTimeout(() => {
//         window.location.href = "./calendar.html";
//     }, 1500);
// }
function loginSuccess() {
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
    localStorage.setItem("employeeLoggedIn", JSON.stringify({ loggedIn: true, expiresAt }));
    localStorage.setItem("sessionType", "employee");
    showMessage("Passcode correct! Redirecting...");
    setTimeout(() => {
        localStorage.setItem("sessionType", "employee");
        window.location.assign(redirectAfterLogin);
    }, 1500);    
}

document.addEventListener("DOMContentLoaded", () => {
    initEmployeeLogin();

    // TEMP TEST: check what Supabase returns
    (async () => {
    const { data, error } = await supabase.from("employees").select("*");
    console.log("Test query:", data, error);
    })();

});