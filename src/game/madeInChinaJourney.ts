import { definePresentation, defineQuestion } from "./questionBuilder";
import type { FactSource } from "./questionContracts";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-26",
});

const common = definePresentation({
  topic: "Chinese creations",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  map: { borders: true, hoverFeedback: false, muteOthers: true },
});

// Isolated contract prototype. Photography and the remaining stops are tracked
// in docs/journey-authoring/MADE_IN_CHINA.md; this module is not registered.
export const MADE_IN_CHINA_CHRONOLOGY_DRAFT = defineQuestion({
  ...common,
  id: "made-in-china-four-frames-v1",
  label: "Architecture",
  title: "Four Frames of History",
  leadIn:
    "Across China’s long history, people have left remarkable structures behind. Some were made for emperors. Others reflected international commerce or a new vision of the future.",
  prompt: "Arrange these four Chinese landmarks from oldest to newest.",
  mode: "choice-order",
  count: 4,
  selection: { type: "none" },
  commitment: "submit",
  rule: {
    type: "choice-ids",
    ids: [
      "landmark:terracotta-army",
      "landmark:forbidden-city",
      "landmark:shanghai-customs-house",
      "landmark:birds-nest",
    ],
    ordered: true,
  },
  choices: [
    {
      id: "landmark:shanghai-customs-house",
      label: "Shanghai Customs House · the Bund",
    },
    {
      id: "landmark:birds-nest",
      label: "Bird’s Nest · Beijing National Stadium",
    },
    { id: "landmark:terracotta-army", label: "Terracotta Army · near Xi’an" },
    { id: "landmark:forbidden-city", label: "Forbidden City · Beijing" },
  ],
  orderLabels: ["Oldest", "Second", "Third", "Newest"],
  guidance: {
    hint: "Two of these places belong to imperial China. The other two reflect the twentieth and twenty-first centuries.",
    assist: {
      text: "The Terracotta Army is locked in the earliest position. Arrange the remaining three.",
      fixedSlots: [{ index: 0, id: "landmark:terracotta-army" }],
    },
  },
  correctFeedback: "Well ordered.",
  explanation:
    "An army of clay soldiers was buried for China’s first emperor in the late third century BCE. More than sixteen centuries later, the Forbidden City, completed in 1420, became the seat of imperial power in Beijing. Shanghai’s Customs House, completed in 1927, reflects the waterfront’s international commerce. The Bird’s Nest, completed in 2008, became an architectural centerpiece of the Beijing Olympics. Four creations, four radically different moments in China’s history. Farther south, another city was changing almost beyond recognition.",
  scenes: {
    play: {
      focus: { lat: 34, lng: 110, altitude: 0.9 },
      contextIds: ["wurl:CHN"],
    },
    reveal: {
      focus: { lat: 35, lng: 113, altitude: 0.8 },
      contextIds: ["wurl:CHN"],
    },
  },
  source: source(
    "UNESCO · Mausoleum of the First Qin Emperor",
    "https://whc.unesco.org/en/list/441/",
  ),
  sources: [
    source(
      "Palace Museum · completed in 1420",
      "https://www.dpm.org.cn/subject_600/buildingdetails/253789.html",
    ),
    source(
      "Shanghai government · Customs House completed in 1927",
      "https://touch.shio.gov.cn/jsp/zfxw_detail.jsp?id=20250929181837586",
    ),
    source(
      "Beijing government · National Stadium",
      "https://english.beijing.gov.cn/beijing2022/venues/beijing/202103/t20210316_2308893.html",
    ),
  ],
});
