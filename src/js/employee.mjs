import { supabase } from './supabaseClient.mjs';
import { showMessage } from '../lib/ui.mjs';

// congig's
const redirectAfterLogin = "calendar.html";
let currentPasscode = null; // holds the one fetched from supabase

// select elements
const form = document.getElementById("employee-passcode-form");
const regenerateLink = document.getElementById("regenerate-passcode");

// fetch current passcode from supabase
async function fetchCurrentPasscode() {
    try {
        const { data, error } = await supabase
            .from("employee_passcodes")
            .select("passcode")
            .order("created_at", { ascending: false })
            .limit(1)
            .single(); // get latest only

        if (error) {
            throw error;
        }
        if (!data) {
            throw new Error("No passcode found in database.");
        }

        currentPasscode = data.passcode;
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

// HANDLE LOGIN SUCCESS
function loginSuccess() {
    showMessage("Passcode correct! Redirecting...");
    setTimeout(() => {
        window.location.assign(redirectAfterLogin);
    }, 1000);
}

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

document.addEventListener("DOMContentLoaded", () => {
    initEmployeeLogin();
});