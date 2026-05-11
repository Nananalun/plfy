import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/assets", "/tasks", "/workflows", "/models", "/settings"];

  return routes.map((route) => ({
    url: `https://frameflow.local${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
