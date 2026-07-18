import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const hasCustomDomain = existsSync(join(process.cwd(), "public", "CNAME"));
const isProjectPage =
  process.env.GITHUB_ACTIONS === "true" &&
  repositoryName.length > 0 &&
  !repositoryName.endsWith(".github.io") &&
  !hasCustomDomain;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(isProjectPage ? { basePath: `/${repositoryName}` } : {}),
};

export default nextConfig;
