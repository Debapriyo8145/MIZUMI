/* =========================================================
   MIZUMI AQUATICS — CONTACT PAGE
   Backend-integrated version
   ========================================================= */

const MIZUMI_CONTACT_CONFIG = {
    apiBaseUrl: "http://localhost:5000/api/v1"
};

(() => {
    "use strict";

    const year = document.getElementById("contactCurrentYear");
    if (year) year.textContent = new Date().getFullYear();

    // -----------------------------------------------------
    // MOBILE NAVIGATION
    // -----------------------------------------------------

    const mobileToggle = document.getElementById("contactMobileToggle");
    const navLinks = document.getElementById("contactNavLinks");

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener("click", () => {
            const isOpen = navLinks.classList.toggle("show");
            mobileToggle.setAttribute("aria-expanded", String(isOpen));
            mobileToggle.innerHTML = isOpen
                ? '<i class="fa-solid fa-xmark"></i>'
                : '<i class="fa-solid fa-bars"></i>';
        });

        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("show");
                mobileToggle.setAttribute("aria-expanded", "false");
                mobileToggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
            });
        });
    }

    // -----------------------------------------------------
    // FAQ ACCORDION
    // -----------------------------------------------------

    document.querySelectorAll(".contact-faq-question").forEach(button => {
        button.addEventListener("click", () => {
            const item = button.closest(".contact-faq-item");
            const willOpen = !item.classList.contains("is-open");

            document.querySelectorAll(".contact-faq-item").forEach(other => {
                other.classList.remove("is-open");
                const otherButton = other.querySelector(".contact-faq-question");
                if (otherButton) otherButton.setAttribute("aria-expanded", "false");
            });

            if (willOpen) {
                item.classList.add("is-open");
                button.setAttribute("aria-expanded", "true");
            }
        });
    });

    // -----------------------------------------------------
    // CONTACT FORM — SUBMIT TO BACKEND
    // -----------------------------------------------------

    const form = document.getElementById("mizumiContactForm");
    const feedback = document.getElementById("contactFormFeedback");
    const submitButton = form?.querySelector(".contact-submit");

    function showFeedback(message, type) {
        if (!feedback) return;
        feedback.textContent = message;
        feedback.className = `contact-form-feedback is-visible is-${type}`;
    }

    function clearFeedback() {
        if (!feedback) return;
        feedback.textContent = "";
        feedback.className = "contact-form-feedback";
    }

    if (form && feedback && submitButton) {
        const originalButtonHTML = submitButton.innerHTML;

        form.addEventListener("submit", async event => {
            event.preventDefault();
            clearFeedback();

            if (!form.checkValidity()) {
                form.reportValidity();
                showFeedback(
                    "Please complete the required fields and accept the consent.",
                    "error"
                );
                return;
            }

            const formData = new FormData(form);

            const payload = {
                name: String(formData.get("name") || "").trim(),
                email: String(formData.get("email") || "").trim(),
                phone: String(formData.get("phone") || "").trim(),
                topic: String(formData.get("topic") || "").trim(),
                message: String(formData.get("message") || "").trim(),
                // Honeypot — stays empty for real users.
                website: String(formData.get("website") || "").trim()
            };

            submitButton.disabled = true;
            submitButton.innerHTML =
                'SENDING <i class="fa-solid fa-circle-notch fa-spin"></i>';

            try {
                const response = await fetch(
                    `${MIZUMI_CONTACT_CONFIG.apiBaseUrl}/contact`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    }
                );

                const data = await response.json().catch(() => ({}));

                if (!response.ok || !data.success) {
                    throw new Error(
                        data.message ||
                            `Unable to send your message (${response.status}).`
                    );
                }

                showFeedback(
                    data.message ||
                        "Thank you — your message has reached MIZUMI. We'll respond soon.",
                    "success"
                );

                form.reset();

            } catch (error) {
                console.error("Contact form error:", error);

                showFeedback(
                    error.message ||
                        "Unable to send your message right now. Please try again.",
                    "error"
                );

            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHTML;
            }
        });
    }

    // -----------------------------------------------------
    // NEWSLETTER (unchanged demo behaviour)
    // -----------------------------------------------------

    const newsletter = document.getElementById("contactNewsletterForm");
    const newsletterMessage = document.getElementById(
        "contactNewsletterMessage"
    );

    if (newsletter && newsletterMessage) {
        newsletter.addEventListener("submit", event => {
            event.preventDefault();

            if (!newsletter.checkValidity()) {
                newsletter.reportValidity();
                return;
            }

            newsletterMessage.textContent =
                "Thanks for your interest. Newsletter sign-up will be enabled when the mailing service is connected.";
            newsletterMessage.style.color = "#c4d6b5";
            newsletter.reset();
        });
    }
})();