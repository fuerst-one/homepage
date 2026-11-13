// Run after changing the curated icon set. Geometry reads these local SVGs;
// React Icons and react-dom/server stay out of the browser's renderer bundle.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const sources = {
  ship: "FaShip",
  brain: "FaBrain",
  car: "FaCar",
  route: "FaRoute",
  tasks: "FaTasks",
  test: "FaVial",
  truck: "FaTruck",
  globe: "FaGlobeAfrica",
  burger: "FaHamburger",
  book: "FaBookOpen",
  document: "FaFileAlt",
  satellite: "FaSatellite",
  tools: "FaTools",
  box: "FaBoxOpen",
  survey: "FaPoll",
  music: "FaMusic",
  compass: "FaCompass",
  charging: "FaChargingStation",
  paw: "FaPaw",
  cart: "FaShoppingCart",
  containers: "FaBoxes",
  map: "FaMapMarkedAlt",
  chart: "FaChartBar",
  anchor: "FaAnchor",
  robot: "FaRobot",
  basket: "FaShoppingBasket",
  watch: "FaClock",
  code: "FaCode",
  shirt: "FaTshirt",
  wave: "FaWater",
  spreadsheet: "FaFileExcel",
  leaf: "FaLeaf",
  tooth: "FaTooth",
  palette: "FaPalette",
};
const icons = Object.fromEntries(
  Object.entries(sources).map(([id, name]) => {
    const Icon = require(`@react-icons/all-files/fa/${name}`)[name];
    return [
      id,
      renderToStaticMarkup(createElement(Icon)).replaceAll(
        "currentColor",
        "#fff",
      ),
    ];
  }),
);
writeFileSync(
  new URL("../src/data/landing-icon-svgs.json", import.meta.url),
  `${JSON.stringify(icons, null, 2)}\n`,
);
