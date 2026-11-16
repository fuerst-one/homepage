import { readWebsiteSection } from "./websiteContent";

export const getCachedProjectIcons = () => readWebsiteSection("icons");
