import { bootPage } from "../ui/shared.js";
import { mountWheel } from "../ui/wheel.js";
const runtime=await bootPage("rewards");
mountWheel(runtime);
