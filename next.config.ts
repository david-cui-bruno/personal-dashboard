import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Guarantee barrel-import tree-shaking for icon/data libs so unused exports never
  // land in the client bundle (#129). lucide-react is in Next's default list; the
  // Supabase packages are not — naming them here keeps the cold-start bundle lean.
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@supabase/ssr",
      "@supabase/supabase-js",
    ],
  },
};

export default nextConfig;
