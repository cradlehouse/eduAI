import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache yet: nothing in P1 is ISR. Add R2 incremental cache when a page needs it.
export default defineCloudflareConfig({});
