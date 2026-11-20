
const API_URL = "http://localhost:5000/api/v1";

const loginForm = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const togglePassword = document.getElementById("togglePassword");


// Show / hide password
togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "Hide" : "Show";

    togglePassword.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
    );
});


// Display login errors
const showMessage = (message) => {
    loginMessage.textContent = message;
    loginMessage.hidden = false;
};


// Hide login errors
const hideMessage = () => {
    loginMessage.textContent = "";
    loginMessage.hidden = true;
};


// Handle admin login
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    hideMessage();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage("Please enter your email and password.");
        return;
    }

    loginButton.disabled = true;
    loginButton.querySelector(".button-text").textContent = "Signing in...";

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.token) {
            throw new Error(
                data.message || "Login failed. Please try again."
            );
        }

        // Store the token for this browser tab session
        sessionStorage.setItem("mizumiAdminToken", data.token);
        sessionStorage.setItem("mizumiAdminEmail", data.admin.email);

        
        // Redirect to the admin dashboard
        window.location.href = "index.html";

    } catch (error) {
        showMessage(
            error.message === "Failed to fetch"
                ? "Unable to connect to the server. Make sure the MIZUMI backend is running."
                : error.message
        );

    } finally {
        loginButton.disabled = false;
        loginButton.querySelector(".button-text").textContent =
            "Sign in to dashboard";
    }
});
