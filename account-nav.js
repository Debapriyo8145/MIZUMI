
document.addEventListener("DOMContentLoaded", async () => {
    const accountLinks = document.querySelectorAll(".account-nav-button");

    if (!accountLinks.length) return;

    try {
        const response = await fetch(
            "http://localhost:5000/api/v1/customer-auth/me",
            {
                method: "GET",
                credentials: "include",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            accountLinks.forEach(link => {
                link.classList.remove("account-logged-in");
                link.setAttribute("aria-label", "Sign in to your account");
                link.title = "Sign In";
            });
            return;
        }

        const result = await response.json();

        if (result.success && result.customer) {
            accountLinks.forEach(link => {
                link.classList.add("account-logged-in");
                link.setAttribute(
                    "aria-label",
                    `My Account - ${result.customer.name}`
                );
                link.title = `My Account - ${result.customer.name}`;
            });
        }

    } catch (error) {
        console.error("Account session check failed:", error);
    }
});
