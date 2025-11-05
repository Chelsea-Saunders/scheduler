import { validateForm, validateEmail, validatePhone, applyPhoneFormatterToAll } from "./form-utilities.mjs";
import { supabase } from "../lib/supabase.mjs";
import { showMessage } from "../lib/ui.mjs";

console.log("auth.mjs loaded");


// function setupLoginForm(loginForm) {
//     loginForm.addEventListener("submit", async (event) => {
//         event.preventDefault();

//         if (!validateForm(loginForm)) {
//             event.preventDefault();
//             showSubmissionMessage("Please correct the highlighted fields.");
//         }

//         const email = loginForm.querySelector('input[name="email"]').value.trim();
//         const password = loginForm.querySelector('input[name="password"]').value.trim();

//         if (!email || !password) {
//             showSubmissionMessage("Please enter both email and password.");
//             return;
//         }

//         try {
//             const { data, error } = await supabase.auth.signInWithPassword({
//                 email, 
//                 password, 
//                 options: {
//                     emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/index.html",
//                 },
//             });

//             if (error) {
//                 console.error("Login error:", error);
//                 showSubmissionMessage("Login failed: " + error.message, true);
//                 return;
//             }

//             if (data?.user) {
//                 showSubmissionMessage("Login successful! Redirecting...");
//                 window.location.href = "scheduler.html";
//             }
//         } catch (error) {
//             console.error("Unexpected login error:", error);
//             showSubmissionMessage("Something went wrong. Please try again later.", true);
//         }
//     });
// }

console.log("exported setupCreateAccountForm");
export function setupCreateAccountForm(createForm, loginForm) {
    console.log("setupCreateAccountForm() running", createForm);
    if (!createForm) {
        console.warn("⚠️ createForm is null or undefined!");
        return;
    }

    createForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        console.log("✅ Create Account form submitted!");
    });

    createForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // form data
        const fullName = createForm.querySelector('input[name="name"]').value.trim();
        const email = createForm.querySelector('input[name="email"]').value.trim();
        const phone = createForm.querySelector('input[name="phone"]').value.trim();
        const password = createForm.querySelector('input[name="password"]').value.trim();

        // VALIDATE
        if (!fullName || !email || !password || !phone) {
            showMessage("Please enter your name, email, phone, and password.", true);
            return;
        }

       // validate phone number
        const phoneCheck = validatePhone(phone);
        if (!phoneCheck.valid) {
            showMessage(`Phone number error: ${phoneCheck.message}`, true);
            return;
        }
        // validate email
        const emailCheck = validateEmail(email);
        if (!emailCheck.valid) {
            showMessage(`Email error: ${emailCheck.message}`, true);
            return;
        }
        
        try {
            // log out if logged in anywhere
            await supabase.auth.signOut();

            localStorage.setItem("fullName", fullName);

            console.log("🟡 About to call supabase.auth.signUp()");

            // create account in supabase
            const { data, error } = await supabase.auth.signUp({
                email, 
                password, 
                options: {
                    data: { name: fullName, phone },
                    emailRedirectTo: "https://chelsea-saunders.github.io/scheduler/index.html"
                },
            });
            console.log("🟢 Supabase signUp returned:", { data, error });


            if (error) {
                console.error("Signup error:", error);
                showMessage(`Signup failed: ${error.message}`, true);
                return;
            }

            console.log("Supabase signup success:", data);

            // INSERT EMPLOYEE RECORD
            const { data: insertData, error: insertError } = await supabase
                .from("employees")
                .insert([
                    { 
                        id: data.user.id, 
                        name: fullName, 
                        email,
                        phone, 
                        role: isAdmin ? "admin" : "employee"
                    }
                ]);

            if (insertError) {
                console.warn("Could not add employee to database:", insertError);
                showMessage("Could not complete signup of employee. Please try again or contact support.", true);
                return;
            } else {
                console.log("Employee added to database:", insertData);
                showMessage("Employee account created successfully. Please confirm their account via their email.");
            }

            // SEND CUSTOM PHP EMAIL
            try {
                const mailResponse = await fetch("https://rsceb.org/sendmail_scheduler.php", {
                    method: "POST", 
                    headers: { "Content-Type": "application/x-www-form-urlencoded" }, 
                    body: new URLSearchParams({
                        type: "signup", 
                        name: fullName, 
                        email, 
                        phone,
                        supabase_id: data.user?.id || "",  
                    }),
                });
                if (!mailResponse.ok) {
                    console.warn("PHP email filed to send");
                    showMessage("Account created, but confirmation email could not be sent. Please contact support.", true);
                }
            }catch (mailError) {
                console.error("Could not send signup email via PHP:", mailError);
                showMessage("Account created but confirmation email failed to send.", true);
            }

            // update user metadata
            try {
                await supabase.auth.updateUser({
                    data: { name: fullName, phone }
                }); 
    
                console.log("User metadata updated:", { name: fullName, phone });
            } catch (metaError) {
                console.error("Could not update user metadata(likely needs email confirmation):", metaError);
            }

            // SUCCESS MESSAGE AND UI HANDELING
            showMessage(`Welcome aboard, ${fullName}! Please check your inbox to confirm your account.`);
            createForm.reset();
            createForm.classList.add("hidden");
            loginForm?.classList.remove("hidden");
            
        } catch (error) {
            console.error("Unexpected network or fetch error:", error);
            showMessage("Network error: Please try again.", true);
        }
    });
}
// function setupResetForm(resetForm) {
//     resetForm.addEventListener("submit", async (event) => {
//         event.preventDefault();

//         if (!validateForm(resetForm)) {
//             showSubmissionMessage("Please correct the highlighted fields.");
//             return;
//         }

//         const email = resetForm.querySelector('input[name="email"]').value.trim();
//         const resetButton = resetForm.querySelector("button[type='submit']");

//         if (!email) {
//             showSubmissionMessage("Please enter a valid email address.");
//             return;
//         }

//         resetButton.disabled = true;
//         resetButton.textContent = "Sending...";
        
//         try {
//             const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
//                 redirectTo: "https://chelsea-saunders.github.io/scheduler/update-password.html"
//             });

//             if (error) {
//                 console.error("Password reset error:", error);

//                 // handle rate limit
//                 if (error.message?.toLowerCase().includes("rate limit")) {
//                     showSubmissionMessage("Too many requests. Please wait before trying again.", true);
//                 } else {
//                     showSubmissionMessage("Password reset failed: " + error.message, true);
//                 }

//                 resetButton.textContent = "Send Reset Link";
//                 resetButton.disabled = false;
//                 return;
//             }

//             showSubmissionMessage("Password reset link sent to your email. Check your inbox.");
//             resetButton.textContent = "Check your inbox";
//             setTimeout(() => {
//                 resetButton.textContent = "Send Reset Link";
//                 resetButton.disabled = false;
//             }, 2000);
//         } catch (error) {
//             console.error("Network or fetch error", error);
//             showSubmissionMessage("Network error:  please try again later.", true);
//             // re-enable button and restore text
//             resetButton.textContent = "Send Reset Link";
//             resetButton.disabled = false;
//         } 
//     });
// }

// document.addEventListener("DOMContentLoaded", () => {
//     const loginForm = document.getElementById("login-form");
//     const createForm = document.getElementById("create-acct-form");
//     const resetForm = document.getElementById("reset-form");
//     // create acct
//     const showCreateLink = document.getElementById("show-create-account");
//     const showLoginLink = document.getElementById("show-login");
//     const forgotPasswordLink = document.getElementById("forgot-password");
//     const backToLoginLink = document.getElementById("back-to-login");

//     // setup forms
//     if (loginForm) setupLoginForm(loginForm);
//     if (createForm) setupCreateAccountForm(createForm);
//     if (resetForm) setupResetForm(resetForm);

//     // show "create acct"
//     showCreateLink?.addEventListener("click", (event) => {
//         event.preventDefault();
//         loginForm?.classList.add("hidden");
//         createForm?.classList.remove("hidden");
//         resetForm?.classList.add("hidden");
//     });

//     // show "login"
//     showLoginLink?.addEventListener("click", (event) => {
//         event.preventDefault();
//         createForm?.classList.add("hidden");
//         loginForm?.classList.remove("hidden");
//         resetForm?.classList.add("hidden");
//     });

//     // show "reset password"
//     forgotPasswordLink?.addEventListener("click", (event) => {
//         event.preventDefault();
//         loginForm?.classList.add("hidden");
//         resetForm?.classList.remove("hidden");
//         createForm?.classList.add("hidden");
//     });

//     // back to login from reset
//     backToLoginLink?.addEventListener("click", (event) => {
//         event.preventDefault();
//         resetForm?.classList.add("hidden");
//         loginForm?.classList.remove("hidden");
//     });
// });