import { readWebsiteSection } from "@homepage/database/websiteContent";

export const getCachedProjectIcons = () => readWebsiteSection("icons");
