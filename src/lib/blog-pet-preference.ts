export const BLOG_PET_DISMISSED = "blog-pet-dismissed";

export function isBlogPetDismissed(): boolean {
  try {
    return window.localStorage.getItem(BLOG_PET_DISMISSED) === "1";
  } catch {
    // Storage is optional: privacy settings must not prevent page initialization.
    return false;
  }
}

export function dismissBlogPet(): void {
  try {
    window.localStorage.setItem(BLOG_PET_DISMISSED, "1");
  } catch {
    // A denied or full store still permits dismissal for this page.
  }
  window.dispatchEvent(new Event(BLOG_PET_DISMISSED));
}
