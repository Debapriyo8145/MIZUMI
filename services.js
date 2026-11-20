/* =========================================================
   MIZUMI AQUATICS — SERVICES PAGE INTERACTIONS
   Connect FORM_ENDPOINT to your backend when ready.
   ========================================================= */

(() => {
  "use strict";

  const FORM_ENDPOINT = ""; // Example: "/api/service-enquiries"

  const menuButton = document.getElementById("servicesMobileToggle");
  const navLinks = document.getElementById("servicesNavLinks");
  const year = document.getElementById("servicesCurrentYear");
  const form = document.getElementById("serviceEnquiryForm");
  const serviceSelect = document.getElementById("serviceType");
  const status = document.getElementById("serviceFormStatus");

  if (year) year.textContent = new Date().getFullYear();

  if (menuButton && navLinks) {
    menuButton.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("show");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      const icon = menuButton.querySelector("i");
      if (icon) icon.className = isOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars";
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("show");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation");
        const icon = menuButton.querySelector("i");
        if (icon) icon.className = "fa-solid fa-bars";
      });
    });
  }

  document.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
      if (serviceSelect) serviceSelect.value = link.dataset.service;
    });
  });

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (status) status.textContent = "";
    form.classList.add("was-validated");

    if (!form.checkValidity()) {
      if (status) status.textContent = "Please complete the required fields.";
      form.querySelector(":invalid")?.focus();
      return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());
    payload.source = "MIZUMI Aquatics Services Page";
    payload.submittedAt = new Date().toISOString();

    if (!FORM_ENDPOINT) {
      if (status) status.textContent = "Preview mode: your details passed validation, but no enquiry was sent. Connect FORM_ENDPOINT in services.js to receive submissions.";
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalMarkup = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Submission failed: ${response.status}`);
      form.reset();
      form.classList.remove("was-validated");
      if (status) status.textContent = "Thank you. Your project enquiry has been submitted.";
    } catch (error) {
      console.error("MIZUMI service enquiry error:", error);
      if (status) status.textContent = "We couldn't submit your enquiry. Please try again or contact us directly.";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalMarkup;
    }
  });
})();
