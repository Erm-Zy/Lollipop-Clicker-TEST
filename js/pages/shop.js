import { bootPage, format, setText } from "../ui/shared.js";
import { mountShop } from "../ui/shop.js";
import { getTotalUpgradesCount, getPps } from "../gameplay.js";
const runtime = await bootPage("shop");
mountShop(
  runtime,
  document.getElementById("upgradesList"),
  document.getElementById("buyControls"),
  undefined,
  document.getElementById("shopViewControls"),
);
runtime.subscribe((state, info) => {
  setText(
    "shopOwned",
    `${format(getTotalUpgradesCount(state))} engenhocas trabalhando`,
  );
  setText(
    "shopProduction",
    `${format(getPps(state, info.now))} pirulitos por segundo`,
  );
});
