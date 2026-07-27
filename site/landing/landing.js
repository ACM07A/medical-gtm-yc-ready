const menuButton = document.querySelector(".menu-button");
const mobileMenu = document.querySelector(".mobile-nav");

if (menuButton && mobileMenu) {
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!open));
    mobileMenu.classList.toggle("open", !open);
  });

  mobileMenu.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      menuButton.setAttribute("aria-expanded", "false");
      mobileMenu.classList.remove("open");
    }
  });
}
