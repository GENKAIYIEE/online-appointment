import { getAdminAnalytics } from "./src/lib/analytics";

async function main() {
  try {
    const data = await getAdminAnalytics();
    console.log("Success:", data);
  } catch (error) {
  if (error instanceof Error) {
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    // @ts-ignore
    if ((error as any).code) console.error("Error code:", (error as any).code);
  } else {
    console.error("Unexpected error:", error);
  }
}
}

main().catch(console.error);
