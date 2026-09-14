import manifest from "@/generated/build-manifest.json";
/** This allowlisted object is generated at build time; never return process.env. */
export function releaseManifest() { return manifest; }
